from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import food as models
from app.schemas import food as schemas
from app.services.ocr_service import OCRService
from app.services.ai_service import AIService
import math

router = APIRouter(prefix="/foods", tags=["foods"])

# Servicii - vor fi injectate sau importate
ocr_service = OCRService()
ai_service = AIService()

@router.post("/", response_model=schemas.Food)
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

@router.get("/", response_model=schemas.FoodListResponse)
async def get_foods(
    page: int = Query(1, ge=1, description="Numărul paginii (începe de la 1)"),
    page_size: int = Query(20, ge=1, le=100, description="Numărul de elemente per pagină (max 100)"),
    search: Optional[str] = Query(None, description="Caută după nume sau brand"),
    sort_by: Optional[str] = Query("created_at", description="Sortează după: name, brand, created_at, calories_per_100g, processing_score"),
    sort_order: Optional[str] = Query("desc", regex="^(asc|desc)$", description="Ordinea sortării: asc sau desc"),
    db: Session = Depends(get_db)
):
    """Obține lista de alimente cu paginare avansată"""
    
    # Construiește query-ul de bază
    query = db.query(models.Food)
    
    # Aplicare filtrare după search
    if search:
        search_filter = f"%{search.lower()}%"
        query = query.filter(
            func.lower(models.Food.name).like(search_filter) |
            func.lower(models.Food.brand).like(search_filter)
        )
    
    # Aplicare sortare
    if (not sort_by) or (sort_by not in ["name", "brand", "created_at", "calories_per_100g", "processing_score"]):
        sort_by = "created_at"
        
    sort_column = getattr(models.Food, sort_by, models.Food.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Calculează totalul de înregistrări
    total_items = query.count()
    total_pages = math.ceil(total_items / page_size)
    
    # Aplicare paginare
    offset = (page - 1) * page_size
    foods = query.offset(offset).limit(page_size).all()
    
    # Creează metadata pentru paginare
    pagination_meta = schemas.PaginationMeta(
        page=page,
        page_size=page_size,
        total_items=total_items,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1
    )
    
    return schemas.FoodListResponse(
        items=foods,
        pagination=pagination_meta
    )
    
@router.get("/{food_id}", response_model=schemas.Food)
async def get_food(food_id: int, db: Session = Depends(get_db)):
    """Obține un aliment după ID"""
    food = db.query(models.Food).filter(models.Food.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Alimentul nu a fost găsit")
    return food

@router.put("/{food_id}", response_model=schemas.Food)
async def update_food(
    food_id: int,
    name: Optional[str] = Form(None),
    brand: Optional[str] = Form(None),
    nutrition_image: UploadFile = File(None),
    ingredients_image: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    """Actualizează un aliment existent"""
    
    # Găsește alimentul
    db_food = db.query(models.Food).filter(models.Food.id == food_id).first()
    if not db_food:
        raise HTTPException(status_code=404, detail="Alimentul nu a fost găsit")
    
    # Dicționar pentru actualizări
    update_data = {}
    
    # Actualizează câmpurile de bază
    if name is not None:
        update_data["name"] = name
    if brand is not None:
        update_data["brand"] = brand
    
    # Procesează imaginea cu informații nutriționale
    if nutrition_image:
        nutrition_text = await ocr_service.extract_text(nutrition_image)
        nutrition_data = await ai_service.parse_nutrition_info(nutrition_text)
        
        # Adaugă datele nutriționale la dicționarul de actualizare
        for key, value in nutrition_data.items():
            if value is not None:
                update_data[key] = value
    
    # Procesează imaginea cu ingrediente
    if ingredients_image:
        ingredients_raw = await ocr_service.extract_text(ingredients_image)
        ingredients_processed = await ai_service.process_ingredients(ingredients_raw)
        processing_score = await ai_service.extract_processing_score(ingredients_processed)
        
        update_data["ingredients_raw"] = ingredients_raw
        update_data["ingredients_processed"] = ingredients_processed
        update_data["processing_score"] = processing_score
    
    # Aplică actualizările folosind query.update()
    if update_data:
        db.query(models.Food).filter(models.Food.id == food_id).update(update_data)
        db.commit()
        
        # Reîncarcă obiectul actualizat
        db.refresh(db_food)
    
    return db_food

@router.delete("/{food_id}")
async def delete_food(food_id: int, db: Session = Depends(get_db)):
    """Șterge un aliment"""
    food = db.query(models.Food).filter(models.Food.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Alimentul nu a fost găsit")
    
    db.delete(food)
    db.commit()
    
    return {"message": "Alimentul a fost șters cu succes"}

@router.get("/filter/advanced", response_model=schemas.FoodListResponse)
async def get_foods_filtered(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    min_protein: Optional[float] = Query(None, description="Proteina minimă per 100g"),
    max_calories: Optional[float] = Query(None, description="Calorii maxime per 100g"),
    max_sodium: Optional[float] = Query(None, description="Sodiu maxim per 100g"),
    max_processing_score: Optional[int] = Query(None, ge=1, le=5, description="Scor maxim de procesare (1-5)"),
    has_ingredients: Optional[bool] = Query(None, description="Filtrează doar alimentele cu ingrediente"),
    db: Session = Depends(get_db)
):
    """Obține alimente cu filtrare avansată după criterii nutriționale"""
    
    query = db.query(models.Food)
    
    # Aplicare filtre nutriționale
    if min_protein is not None:
        query = query.filter(models.Food.protein_per_100g >= min_protein)
    
    if max_calories is not None:
        query = query.filter(models.Food.calories_per_100g <= max_calories)
    
    if max_sodium is not None:
        query = query.filter(models.Food.sodium_per_100g <= max_sodium)
    
    if max_processing_score is not None:
        query = query.filter(models.Food.processing_score <= max_processing_score)
    
    if has_ingredients is not None:
        if has_ingredients:
            query = query.filter(models.Food.ingredients_processed.isnot(None))
        else:
            query = query.filter(models.Food.ingredients_processed.is_(None))
    
    # Sortare implicită după scor de procesare (crescător = mai sănătos)
    query = query.order_by(models.Food.processing_score.asc().nulls_last(), 
                          models.Food.created_at.desc())
    
    # Calculează totalul și paginarea
    total_items = query.count()
    total_pages = math.ceil(total_items / page_size)
    
    offset = (page - 1) * page_size
    foods = query.offset(offset).limit(page_size).all()
    
    pagination_meta = schemas.PaginationMeta(
        page=page,
        page_size=page_size,
        total_items=total_items,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1
    )
    
    return schemas.FoodListResponse(
        items=foods,
        pagination=pagination_meta
    )

@router.get("/ranking/by-criteria", response_model=schemas.FoodListResponse)
async def get_foods_ranking(
    criteria: str = Query("processing_score", description="Criteriu ranking: processing_score, protein_per_100g, calories_per_100g, sodium_per_100g"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ascending: bool = Query(True, description="Sortare crescătoare (True) sau descrescătoare (False)"),
    db: Session = Depends(get_db)
):
    """Obține ranking de alimente bazat pe diferite criterii"""
    
    # Validare criteriu
    valid_criteria = ["processing_score", "protein_per_100g", "calories_per_100g", 
                     "sodium_per_100g", "fat_per_100g", "fiber_per_100g", "sugar_per_100g"]
    
    if criteria not in valid_criteria:
        raise HTTPException(status_code=400, detail=f"Criteriu invalid. Folosește unul din: {', '.join(valid_criteria)}")
    
    query = db.query(models.Food)
    
    # Exclude înregistrările care nu au valoare pentru criteriul selectat
    sort_column = getattr(models.Food, criteria)
    query = query.filter(sort_column.isnot(None))
    
    # Aplicare sortare
    if ascending:
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())
    
    # Calculează totalul și paginarea
    total_items = query.count()
    total_pages = math.ceil(total_items / page_size)
    
    offset = (page - 1) * page_size
    foods = query.offset(offset).limit(page_size).all()
    
    pagination_meta = schemas.PaginationMeta(
        page=page,
        page_size=page_size,
        total_items=total_items,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1
    )
    
    return schemas.FoodListResponse(
        items=foods,
        pagination=pagination_meta
    )

@router.get("/stats/summary")
async def get_food_stats(db: Session = Depends(get_db)):
    """Obține statistici generale despre alimentele din baza de date"""
    
    total_foods = db.query(models.Food).count()
    
    # Statistici nutriționale
    avg_calories = db.query(func.avg(models.Food.calories_per_100g)).filter(
        models.Food.calories_per_100g.isnot(None)
    ).scalar()
    
    avg_protein = db.query(func.avg(models.Food.protein_per_100g)).filter(
        models.Food.protein_per_100g.isnot(None)
    ).scalar()
    
    # Distribuția scorului de procesare
    processing_distribution = db.query(
        models.Food.processing_score,
        func.count(models.Food.processing_score)
    ).filter(
        models.Food.processing_score.isnot(None)
    ).group_by(models.Food.processing_score).all()
    
    # Alimentele cu cel mai mic scor de procesare (cele mai sănătoase)
    healthiest_foods = db.query(models.Food).filter(
        models.Food.processing_score.isnot(None)
    ).order_by(models.Food.processing_score.asc()).limit(5).all()
    
    return {
        "total_foods": total_foods,
        "avg_calories_per_100g": round(avg_calories, 2) if avg_calories else None,
        "avg_protein_per_100g": round(avg_protein, 2) if avg_protein else None,
        "processing_score_distribution": {
            score: count for score, count in processing_distribution
        },
        "top_healthiest_foods": [
            {"id": food.id, "name": food.name, "processing_score": food.processing_score}
            for food in healthiest_foods
        ]
    }