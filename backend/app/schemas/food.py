from pydantic import BaseModel
from typing import Optional, List, Sequence
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
    ingredients_raw: Optional[str] = None
    ingredients_processed: Optional[str] = None
    processing_score: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

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