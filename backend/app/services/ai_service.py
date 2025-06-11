import google.generativeai as genai
from app.core.config import settings
import json
import asyncio
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    async def _process_with_retry(self, func, *args, max_retries=3, **kwargs):
        """Generic retry wrapper for AI processing"""
        for attempt in range(max_retries):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} failed: {str(e)}")
                if attempt == max_retries - 1:
                    logger.error(f"All {max_retries} attempts failed for AI processing")
                    raise e
                # Exponential backoff: 2, 4, 8 seconds
                await asyncio.sleep(2 ** attempt)
    
    async def _optimize_image_for_ai(self, image_data: bytes, max_size: tuple = (1024, 1024)) -> bytes:
        """Optimize image for faster AI processing while maintaining quality"""
        try:
            image = Image.open(io.BytesIO(image_data))
            
            # Resize if too large
            if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Save with optimized quality
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=85, optimize=True)
            return output.getvalue()
        except Exception as e:
            logger.warning(f"Image optimization failed, using original: {e}")
            return image_data
    
    async def parse_nutrition_info_from_image_and_ocr(self, image_data: bytes, ocr_text: str) -> dict:
        """Parse nutrition information using both image and OCR text with retry logic"""
        return await self._process_with_retry(self._parse_nutrition_info_from_image_and_ocr_impl, image_data, ocr_text) # type: ignore
    
    async def _parse_nutrition_info_from_image_and_ocr_impl(self, image_data: bytes, ocr_text: str) -> dict:
        """Internal implementation for parsing nutrition info using both image and OCR"""
        
        prompt = f"""
        Analyze this nutrition label using BOTH the image and the OCR text below.
        Extract nutritional information and return values per 100g of product.
        
        OCR Text from the image:
        {ocr_text}
        
        Instructions:
        1. Use the image to understand layout, tables, and visual context
        2. Use the OCR text to get precise numbers that might be hard to read in the image
        3. Cross-validate: if OCR text conflicts with what you see, trust the image
        4. Convert all values to per 100g if they're shown per serving
        5. Look for: Energy/Calories, Protein, Fat, Saturated Fat, Carbohydrates, Fiber, Sugar, Sodium
        
        Return ONLY a JSON object with this structure (use null if value not found):
        {{
            "calories_per_100g": float or null,
            "protein_per_100g": float or null,
            "fat_per_100g": float or null,
            "saturated_fat_per_100g": float or null,
            "carbs_per_100g": float or null,
            "fiber_per_100g": float or null,
            "sugar_per_100g": float or null,
            "sodium_per_100g": float or null
        }}
        
        Return ONLY the JSON, no additional text.
        """
        
        # Optimize image before sending
        optimized_image_data = await self._optimize_image_for_ai(image_data)
        image = Image.open(io.BytesIO(optimized_image_data))
        
        # Run in thread pool since Gemini SDK doesn't have native async
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, 
            lambda: self.model.generate_content([prompt, image])
        )
        
        result = response.text
        if not result or result.strip() == "":
            logger.warning("Empty response from Gemini for nutrition parsing")
            return {}
            
        # Clean JSON if wrapped in markdown
        if '```json' in result:
            result = result.split('```json')[1].split('```')[0].strip()
        elif '```' in result:
            result = result.split('```')[1].split('```')[0].strip()
        
        return json.loads(result)
    
    async def process_ingredients_from_image_and_ocr(self, image_data: bytes, ocr_text: str) -> str:
        """Process ingredients list using both image and OCR text with retry logic"""
        return await self._process_with_retry(self._process_ingredients_from_image_and_ocr_impl, image_data, ocr_text) # type: ignore
    
    async def _process_ingredients_from_image_and_ocr_impl(self, image_data: bytes, ocr_text: str) -> str:
        """Internal implementation for processing ingredients using both image and OCR"""
        
        prompt = f"""
        Analyze this ingredients list using BOTH the image and the OCR text below.
        Provide a Romanian language analysis.
        
        OCR Text from the image:
        {ocr_text}
        
        Instructions:
        1. Use the image to see the full context and layout
        2. Use the OCR text to get ingredient names that might be hard to read
        3. Cross-validate: if OCR text seems wrong, trust what you see in the image
        4. Some OCR text might have errors - use your knowledge to correct obvious mistakes
        
        Please provide:
        1. A clear list of all ingredients found
        2. Explanations of scientific/complex ingredient names
        3. What should be avoided and why
        4. Beneficial ingredients if any
        5. Processing score from 1-5 (1=minimally processed, 5=ultra-processed)
        
        Format your response as:
        **Ingrediente găsite:**
        [lista clară cu ingredientele corectate]
        
        **Explicații ingrediente complexe:**
        [explicații pentru denumirile științifice]
        
        **De evitat:**
        [lista cu ce trebuie evitat și de ce]
        
        **Benefic:**
        [ingredientele benefice dacă există]
        
        **Grad de procesare:** [1-5] - [explicație scurtă]
        
        Write in Romanian and be informative but accessible.
        """
        
        # Optimize image before sending
        optimized_image_data = await self._optimize_image_for_ai(image_data)
        image = Image.open(io.BytesIO(optimized_image_data))
        
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, 
            lambda: self.model.generate_content([prompt, image])
        )
        
        result = response.text
        if not result or result.strip() == "":
            logger.warning("Empty response from Gemini for ingredients processing")
            return "Eroare la procesarea imaginii cu ingrediente."
        
        return result.strip()
    
    async def extract_processing_score(self, processed_ingredients: str) -> int:
        """Extract processing score from processed ingredients text"""
        try:
            import re
            match = re.search(r'\*\*Grad de procesare:\*\*\s*(\d+)', processed_ingredients)
            if not match:
                match = re.search(r'Grad de procesare:\s*(\d+)', processed_ingredients)
            if not match:
                match = re.search(r'procesare[:\s]*(\d+)', processed_ingredients, re.IGNORECASE)
            
            if match:
                score = int(match.group(1))
                return max(1, min(5, score))
            return 3
        except:
            return 3

    # Keep the old methods for backward compatibility (image-only processing)
    async def parse_nutrition_info_from_image(self, image_data: bytes) -> dict:
        """Legacy method - parse from image only"""
        return await self._process_with_retry(self._parse_nutrition_info_from_image_impl, image_data) # type: ignore
    
    async def _parse_nutrition_info_from_image_impl(self, image_data: bytes) -> dict:
        """Internal implementation for image-only nutrition parsing"""
        
        prompt = """
        Analyze this nutrition label image and extract the nutritional information.
        Look for values per 100g of product.
        
        Return ONLY a JSON object with the following structure (use null if value not found):
        {
            "calories_per_100g": float or null,
            "protein_per_100g": float or null,
            "fat_per_100g": float or null,
            "saturated_fat_per_100g": float or null,
            "carbs_per_100g": float or null,
            "fiber_per_100g": float or null,
            "sugar_per_100g": float or null,
            "sodium_per_100g": float or null
        }
        
        Important:
        - Convert all values to per 100g if they're shown per serving
        - Convert sodium from mg to mg (keep as mg)
        - Return ONLY the JSON, no additional text
        """
        
        # Optimize image before sending
        optimized_image_data = await self._optimize_image_for_ai(image_data)
        image = Image.open(io.BytesIO(optimized_image_data))
        
        # Run in thread pool since Gemini SDK doesn't have native async
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, 
            lambda: self.model.generate_content([prompt, image])
        )
        
        result = response.text
        if not result or result.strip() == "":
            logger.warning("Empty response from Gemini for nutrition parsing")
            return {}
            
        # Clean JSON if wrapped in markdown
        if '```json' in result:
            result = result.split('```json')[1].split('```')[0].strip()
        elif '```' in result:
            result = result.split('```')[1].split('```')[0].strip()
        
        return json.loads(result)

    async def process_ingredients_from_image(self, image_data: bytes) -> str:
        """Legacy method - process from image only"""
        return await self._process_with_retry(self._process_ingredients_from_image_impl, image_data) # type: ignore
    
    async def _process_ingredients_from_image_impl(self, image_data: bytes) -> str:
        """Internal implementation for image-only ingredients processing"""
        
        prompt = """
        Analyze this ingredients list image and provide a Romanian language analysis.
        
        Please provide:
        1. A clear list of all ingredients found
        2. Explanations of scientific/complex ingredient names
        3. What should be avoided and why
        4. Beneficial ingredients if any
        5. Processing score from 1-5 (1=minimally processed, 5=ultra-processed)
        
        Format your response as:
        **Ingrediente găsite:**
        [lista clară cu ingredientele]
        
        **Explicații ingrediente complexe:**
        [explicații pentru denumirile științifice]
        
        **De evitat:**
        [lista cu ce trebuie evitat și de ce]
        
        **Benefic:**
        [ingredientele benefice dacă există]
        
        **Grad de procesare:** [1-5] - [explicație scurtă]
        
        Write in Romanian and be informative but accessible.
        """
        
        # Optimize image before sending
        optimized_image_data = await self._optimize_image_for_ai(image_data)
        image = Image.open(io.BytesIO(optimized_image_data))
        
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, 
            lambda: self.model.generate_content([prompt, image])
        )
        
        result = response.text
        if not result or result.strip() == "":
            logger.warning("Empty response from Gemini for ingredients processing")
            return "Eroare la procesarea imaginii cu ingrediente."
        
        return result.strip()

    # Keep old OCR-only methods for backward compatibility
    async def parse_nutrition_info(self, ocr_text: str) -> dict:
        """Legacy method - parse from OCR text only"""
        prompt = f"""
        Extrage informațiile nutriționale din următorul text OCR și returnează-le în format JSON.
        Caută valorile pentru 100g de produs.
        
        Text OCR: {ocr_text}
        
        Returnează JSON cu următoarele chei (folosește null dacă nu găsești valoarea):
        {{
            "calories_per_100g": float sau null,
            "protein_per_100g": float sau null,
            "fat_per_100g": float sau null,
            "saturated_fat_per_100g": float sau null,
            "carbs_per_100g": float sau null,
            "fiber_per_100g": float sau null,
            "sugar_per_100g": float sau null,
            "sodium_per_100g": float sau null
        }}
        
        Returnează DOAR JSON-ul, fără text adițional.
        """
        
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, 
                lambda: self.model.generate_content(prompt)
            )
            
            result = response.text
            if not result or result.strip() == "":
                return {}
                
            if '```json' in result:
                result = result.split('```json')[1].split('```')[0].strip()
            elif '```' in result:
                result = result.split('```')[1].split('```')[0].strip()
            
            return json.loads(result)
        except:
            return {}
    
    async def process_ingredients(self, ingredients_text: str) -> str:
        """Legacy method - process from text only"""
        prompt = f"""
        Analizează următoarea listă de ingrediente și rescrie-o într-un format ușor de înțeles pentru un consumator român.
        
        Instrucțiuni:
        1. Explică ingredientele necunoscute sau complexe
        2. Menționează ce ar trebui evitat (E-uri dăunătoare, zahăruri adăugate, conservanți, etc.)
        3. Evidențiază ingredientele benefice dacă există
        4. Estimează gradul de procesare (1-5, unde 5 = foarte procesat)
        
        Ingrediente originale: {ingredients_text}
        
        Formatul răspunsului:
        **Ingrediente explicate:**
        [explicația detaliată]
        
        **De evitat:**
        [lista cu ce trebuie evitat și de ce]
        
        **Grad de procesare:** [1-5] - [explicație scurtă]
        """
        
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, 
                lambda: self.model.generate_content(prompt)
            )
            
            result = response.text
            if not result or result.strip() == "":
                return "Eroare la procesarea ingredientelor. Text original: " + ingredients_text
            
            return result.strip()
        except Exception as e:
            return f"Eroare la procesarea ingredientelor. Text original: {ingredients_text}"