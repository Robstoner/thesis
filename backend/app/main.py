from typing import Optional
from fastapi import FastAPI, File, Form, UploadFile, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, get_db
from app.models import food as models
from app.schemas import food as schemas
from app.services.ocr_service import OCRService
from app.services.ai_service import AIService
import uvicorn

# Creează tabelele
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Nutrition App API",
    description="API pentru aplicația de analiză nutrițională",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # În producție specifică domeniile
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servicii
ocr_service = OCRService()
ai_service = AIService()

@app.get("/")
async def root():
    return {"message": "Nutrition App API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/foods/", response_model=schemas.Food)
async def create_food(
    name: str = Form(...),
    brand: Optional[str] = Form(None),
    nutrition_image: UploadFile = File(None),
    ingredients_image: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    """Creează un nou aliment cu procesarea imaginilor OCR"""
    
    # Procesează imaginea cu informații nutriționale
    nutrition_data = {}
    if nutrition_image:
        nutrition_text = await ocr_service.extract_text(nutrition_image)
        nutrition_data = await ai_service.parse_nutrition_info(nutrition_text)
    
    # Procesează imaginea cu ingrediente
    ingredients_processed = None
    ingredients_raw = None
    processing_score = None
    if ingredients_image:
        ingredients_raw = await ocr_service.extract_text(ingredients_image)
        ingredients_processed = await ai_service.process_ingredients(ingredients_raw)
        processing_score = await ai_service.extract_processing_score(ingredients_processed)
    
    # Creează obiectul în baza de date
    db_food = models.Food(
        name=name,
        brand=brand,
        ingredients_raw=ingredients_raw,
        ingredients_processed=ingredients_processed,
        processing_score=processing_score,
        **nutrition_data
    )
    
    db.add(db_food)
    db.commit()
    db.refresh(db_food)
    
    return db_food

@app.get("/foods/", response_model=list[schemas.Food])
async def get_foods(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Obține lista de alimente"""
    foods = db.query(models.Food).offset(skip).limit(limit).all()
    return foods

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)