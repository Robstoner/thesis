from openai import AsyncOpenAI
from app.core.config import settings
import json
import asyncio

class AIService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    async def parse_nutrition_info(self, ocr_text: str) -> dict:
        """Parsează informațiile nutriționale din textul OCR"""
        
        prompt = f"""
        Extrage informațiile nutriționale din următorul text OCR și returnează-le în format JSON.
        Caută valorile pentru 100g de produs.
        
        Text OCR: {ocr_text}
        
        Returnează JSON cu următoarele chei (folosește null dacă nu găsești valoarea):
        {{
            "calories_per_100g": float sau null,
            "protein_per_100g": float sau null,
            "carbs_per_100g": float sau null,
            "fat_per_100g": float sau null,
            "fiber_per_100g": float sau null,
            "sugar_per_100g": float sau null,
            "sodium_per_100g": float sau null
        }}
        
        Returnează DOAR JSON-ul, fără text adițional.
        """
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=500
            )
            
            result = response.choices[0].message.content
            if (result is None or result.strip() == ""):
                print("Răspunsul este gol sau null.")
                return {}
                
            # Încearcă să extragi JSON-ul dacă este înconjurat de text
            if '```json' in result:
                result = result.split('```json')[1].split('```')[0].strip()
            elif '```' in result:
                result = result.split('```')[1].split('```')[0].strip()
            
            return json.loads(result)
        except json.JSONDecodeError as e:
            print(f"Eroare la parsarea JSON: {e}")
            return {}
        except Exception as e:
            print(f"Eroare la parsarea informațiilor nutriționale: {e}")
            return {}
    
    async def process_ingredients(self, ingredients_text: str) -> str:
        """Procesează lista de ingrediente pentru a fi mai ușor de înțeles"""
        
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
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1000
            )
            
            result = response.choices[0].message.content
            if (result is None or result.strip() == ""):
                print("Răspunsul este gol sau null.")
                return "Eroare la procesarea ingredientelor. Text original: " + ingredients_text
            
            return result.strip()
        except Exception as e:
            print(f"Eroare la procesarea ingredientelor: {e}")
            return f"Eroare la procesarea ingredientelor. Text original: {ingredients_text}"
    
    async def extract_processing_score(self, processed_ingredients: str) -> int:
        """Extrage scorul de procesare din textul procesat"""
        try:
            # Caută pattern-ul "Grad de procesare: X"
            import re
            match = re.search(r'Grad de procesare:\s*(\d+)', processed_ingredients)
            if match:
                return int(match.group(1))
            return 3  # Default dacă nu găsește
        except:
            return 3