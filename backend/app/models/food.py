from sqlalchemy import Column, Integer, String, Float, Text, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base

class Food(Base):
    __tablename__ = "foods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    brand = Column(String, nullable=True)
    
    # Informații nutriționale
    calories_per_100g = Column(Float, nullable=True)
    protein_per_100g = Column(Float, nullable=True)
    carbs_per_100g = Column(Float, nullable=True)
    fat_per_100g = Column(Float, nullable=True)
    fiber_per_100g = Column(Float, nullable=True)
    sugar_per_100g = Column(Float, nullable=True)
    sodium_per_100g = Column(Float, nullable=True)
    
    # Ingrediente
    ingredients_raw = Column(Text)  # Text extras din OCR
    ingredients_processed = Column(Text)  # Text procesat de AI
    
    # Metadata
    nutrition_image_path = Column(String, nullable=True)
    ingredients_image_path = Column(String, nullable=True)
    processing_score = Column(Integer, nullable=True)  # 1-5 scală procesare
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())