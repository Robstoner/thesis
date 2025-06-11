# backend/app/schemas/food.py
from pydantic import BaseModel
from typing import Optional, Sequence, Literal
from datetime import datetime

class FoodBase(BaseModel):
    name: str
    brand: Optional[str] = None
    calories_per_100g: Optional[float] = None
    protein_per_100g: Optional[float] = None
    carbs_per_100g: Optional[float] = None
    fat_per_100g: Optional[float] = None
    saturated_fat_per_100g: Optional[float] = None
    fiber_per_100g: Optional[float] = None
    sugar_per_100g: Optional[float] = None
    sodium_per_100g: Optional[float] = None

class FoodCreate(FoodBase):
    pass

class Food(FoodBase):
    id: int
    
    # OCR extracted text (raw)
    nutrition_ocr_text: Optional[str] = None  # Raw OCR from nutrition label
    ingredients_raw: Optional[str] = None  # Raw OCR from ingredients list
    
    # AI processed content
    ingredients_processed: Optional[str] = None  # AI analysis of ingredients
    
    processing_score: Optional[int] = None
    nutrition_image_path: Optional[str] = None
    ingredients_image_path: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class FoodWithProcessingStatus(Food):
    processing_status: Literal["processing", "analyzing_nutrition", "analyzing_ingredients", "completed", "error"] = "completed"
    progress_message: Optional[str] = None

# Detailed food response with all OCR and processing info
class FoodDetailed(FoodWithProcessingStatus):
    """Detailed food response including all OCR text and processing information"""
    pass

# Pagination schemas
class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int
    has_next: bool
    has_previous: bool

class FoodListResponse(BaseModel):
    items: Sequence[Food]
    pagination: PaginationMeta

class FoodListResponseWithStatus(BaseModel):
    items: Sequence[FoodWithProcessingStatus]
    pagination: PaginationMeta