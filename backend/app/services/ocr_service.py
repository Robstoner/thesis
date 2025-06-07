import pytesseract
from PIL import Image
import io
from fastapi import UploadFile
from typing import Union

class OCRService:
    def __init__(self):
        # Configurare Tesseract pentru română și engleză
        self.config = r'--oem 3 --psm 6 -l ron+eng'
    
    async def extract_text_from_upload(self, image_file: UploadFile) -> str:
        """Extrage text din imagine din UploadFile"""
        try:
            # Citește imaginea
            image_data = await image_file.read()
            image = Image.open(io.BytesIO(image_data))
            
            # Aplică OCR
            text = pytesseract.image_to_string(image, config=self.config)
            
            return text.strip()
        except Exception as e:
            raise Exception(f"Eroare la extragerea textului din upload: {str(e)}")
    
    def extract_text_from_bytes(self, image_data: bytes) -> str:
        """Extrage text din imagine din bytes"""
        try:
            # Citește imaginea din bytes
            image = Image.open(io.BytesIO(image_data))
            
            # Aplică OCR
            text = pytesseract.image_to_string(image, config=self.config)
            
            return text.strip()
        except Exception as e:
            raise Exception(f"Eroare la extragerea textului din bytes: {str(e)}")
    
    async def extract_text(self, image_source: Union[UploadFile, bytes]) -> str:
        """Extrage text din imagine - metoda universală"""
        if isinstance(image_source, UploadFile):
            return await self.extract_text_from_upload(image_source)
        elif isinstance(image_source, bytes):
            return self.extract_text_from_bytes(image_source)
        else:
            raise ValueError("image_source must be either UploadFile or bytes")