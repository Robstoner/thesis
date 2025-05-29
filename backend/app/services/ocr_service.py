import pytesseract
from PIL import Image
import io
from fastapi import UploadFile

class OCRService:
    def __init__(self):
        # Configurare Tesseract pentru română și engleză
        self.config = r'--oem 3 --psm 6 -l ron+eng'
    
    async def extract_text(self, image_file: UploadFile) -> str:
        """Extrage text din imagine folosind OCR"""
        try:
            # Citește imaginea
            image_data = await image_file.read()
            image = Image.open(io.BytesIO(image_data))
            
            # Aplică OCR
            text = pytesseract.image_to_string(image, config=self.config)
            
            return text.strip()
        except Exception as e:
            raise Exception(f"Eroare la extragerea textului: {str(e)}")