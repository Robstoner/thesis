# backend/app/models/food.py
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Food(Base):
    __tablename__ = "foods"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    brand = Column(String, nullable=True)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    calories_per_100g = Column(Float, nullable=True)
    protein_per_100g = Column(Float, nullable=True)
    carbs_per_100g = Column(Float, nullable=True)
    fat_per_100g = Column(Float, nullable=True)
    saturated_fat_per_100g = Column(Float, nullable=True)
    fiber_per_100g = Column(Float, nullable=True)
    sugar_per_100g = Column(Float, nullable=True)
    sodium_per_100g = Column(Float, nullable=True)
    
    # OCR extracted text (raw)
    nutrition_ocr_text = Column(Text, nullable=True)  # Raw OCR from nutrition label
    ingredients_raw = Column(Text)  # Raw OCR from ingredients list (keeping existing name)
    
    # AI processed content
    ingredients_processed = Column(Text)  # AI analysis of ingredients
    
    nutrition_image_path = Column(String, nullable=True)
    ingredients_image_path = Column(String, nullable=True)
    processing_score = Column(Integer, nullable=True)
    
    # Processing status fields
    processing_status = Column(String, nullable=True, default="completed")
    progress_message = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    owner = relationship("User", back_populates="foods")