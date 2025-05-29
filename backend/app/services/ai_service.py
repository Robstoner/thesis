import openai
from app.core.config import settings
import json
import re

class AIService:
    def __init__(self):
        openai.api_key = settings.openai_api_key
    
    async def parse_nutrition_info(self, ocr_text: str) -> dict:
        """Parsează informațiile nutriționale din textul OCR"""
        
        prompt = f"""
        Extrage informațiile nutriționale din următorul text OCR și returnează-le în format JSON.
        Caută valorile pentru 100g de produs.
        
        Text OCR: {ocr_text}
        
        Returnează JSON cu următoarele chei (folosește null dacă nu găsești valoarea):
        - calories_per_100g (float)
        - protein_per_100g (float)
        - carbs_per_100g (float) 
        - fat_per_100g (float)
        - fiber_per_100g (float)
        - sugar_per_100g (float)
        - sodium_per_100g (float)
        """
        
        try:
            response = openai.completions.create(
                model="gpt-3.5-turbo",
                prompt=prompt,
                temperature=0.1
            )
            
            result = response.choices[0].message.content
            return json.loads(result)
        except Exception as e:
            print(f"Eroare la parsarea informațiilor nutriționale: {e}")
            return {}
    
    async def process_ingredients(self, ingredients_text: str) -> str:
        """Procesează lista de ingrediente pentru a fi mai ușor de înțeles"""
        
        prompt = f"""
        Analizează următoarea listă de ingrediente și rescrie-o într-un format ușor de înțeles.
        Explică ce sunt ingredientele necunoscute și menționează ce ar trebui evitat (E-uri, zahăruri adăugate, etc.)
        
        Ingrediente: {ingredients_text}
        
        Oferă o explicație clară și structurată în română.
        """
        
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )
            
            return response.choices[0].message.content
        except Exception as e:
            print(f"Eroare la procesarea ingredientelor: {e}")
            return ingredients_text