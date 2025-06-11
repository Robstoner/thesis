import logging
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, File, Form, UploadFile, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import food as models
from app.schemas import food as schemas
from app.services.ocr_service import OCRService
from app.services.ai_service import AIService
from app.services.storage_service import StorageService
from app.api.dependencies import get_current_user
from app.models.user import User
import math

router = APIRouter(prefix="/foods", tags=["foods"])

ocr_service = OCRService()
ai_service = AIService()
storage_service = StorageService()
logger = logging.getLogger(__name__)

async def process_food_images_background(
    food_id: int,
    nutrition_image_data: Optional[bytes],
    ingredients_image_data: Optional[bytes],
    db_session_maker
):
    """Background task to process food images with OCR + AI and granular progress tracking"""
    
    # Create a new database session for the background task
    db = db_session_maker()
    
    try:
        logger.info(f"Starting background processing for food {food_id}")
        
        # Set initial processing status
        db.query(models.Food).filter(models.Food.id == food_id).update({
            "processing_status": "processing",
            "progress_message": "Starting analysis..."
        })
        db.commit()
        
        nutrition_data = {}
        ingredients_processed = None
        processing_score = None
        nutrition_ocr_text = ""
        ingredients_ocr_text = ""
        
        # Process nutrition image if present
        if nutrition_image_data:
            try:
                logger.info(f"Processing nutrition image for food {food_id}")
                
                # Update status to OCR extraction
                db.query(models.Food).filter(models.Food.id == food_id).update({
                    "processing_status": "processing",
                    "progress_message": "Extracting text from nutrition label..."
                })
                db.commit()
                
                # Step 1: Extract OCR text
                try:
                    nutrition_ocr_text = ocr_service.extract_text_from_bytes(nutrition_image_data)
                    logger.info(f"OCR extracted from nutrition image for food {food_id}: {nutrition_ocr_text[:100]}...")
                except Exception as ocr_e:
                    logger.warning(f"OCR failed for nutrition image {food_id}: {ocr_e}")
                    nutrition_ocr_text = ""
                
                # Update status to AI analysis
                db.query(models.Food).filter(models.Food.id == food_id).update({
                    "processing_status": "analyzing_nutrition",
                    "progress_message": "Analyzing nutrition information with AI..."
                })
                db.commit()
                
                # Step 2: Use both image and OCR text with AI
                if nutrition_ocr_text.strip():
                    # Use both image and OCR text
                    nutrition_data = await ai_service.parse_nutrition_info_from_image_and_ocr(
                        nutrition_image_data, nutrition_ocr_text
                    )
                else:
                    # Fallback to image-only processing
                    logger.info(f"No OCR text available, using image-only processing for nutrition {food_id}")
                    nutrition_data = await ai_service.parse_nutrition_info_from_image(nutrition_image_data)
                
                logger.info(f"Nutrition data extracted for food {food_id}: {nutrition_data}")
                
                # Update with nutrition data immediately
                nutrition_update = {}
                for key, value in nutrition_data.items():
                    if value is not None:
                        nutrition_update[key] = value
                
                # Also store the OCR text for reference
                if nutrition_ocr_text.strip():
                    nutrition_update["nutrition_ocr_text"] = nutrition_ocr_text
                
                if nutrition_update:
                    db.query(models.Food).filter(models.Food.id == food_id).update(nutrition_update)
                    db.commit()
                
            except Exception as e:
                logger.error(f"Error processing nutrition image for food {food_id}: {e}")
                # Update with error message but continue processing
                db.query(models.Food).filter(models.Food.id == food_id).update({
                    "progress_message": f"Nutrition analysis failed: {str(e)[:100]}"
                })
                db.commit()
        
        # Process ingredients image if present
        if ingredients_image_data:
            try:
                logger.info(f"Processing ingredients image for food {food_id}")
                
                # Update status to OCR extraction
                db.query(models.Food).filter(models.Food.id == food_id).update({
                    "processing_status": "processing",
                    "progress_message": "Extracting text from ingredients list..."
                })
                db.commit()
                
                # Step 1: Extract OCR text
                try:
                    ingredients_ocr_text = ocr_service.extract_text_from_bytes(ingredients_image_data)
                    logger.info(f"OCR extracted from ingredients image for food {food_id}: {ingredients_ocr_text[:100]}...")
                except Exception as ocr_e:
                    logger.warning(f"OCR failed for ingredients image {food_id}: {ocr_e}")
                    ingredients_ocr_text = ""
                
                # Update status to AI analysis
                db.query(models.Food).filter(models.Food.id == food_id).update({
                    "processing_status": "analyzing_ingredients",
                    "progress_message": "Analyzing ingredients with AI..."
                })
                db.commit()
                
                # Step 2: Use both image and OCR text with AI
                if ingredients_ocr_text.strip():
                    # Use both image and OCR text
                    ingredients_processed = await ai_service.process_ingredients_from_image_and_ocr(
                        ingredients_image_data, ingredients_ocr_text
                    )
                else:
                    # Fallback to image-only processing
                    logger.info(f"No OCR text available, using image-only processing for ingredients {food_id}")
                    ingredients_processed = await ai_service.process_ingredients_from_image(ingredients_image_data)
                
                processing_score = await ai_service.extract_processing_score(ingredients_processed)
                
                # Add disclaimer
                ingredients_processed = ingredients_processed + "\n\n**AI Analysis Disclaimer**: This interpretation is generated automatically and may not be completely accurate. Verify important information independently."
                
                logger.info(f"Ingredients processed for food {food_id}, score: {processing_score}")
                
                # Update with ingredients data immediately
                ingredients_update = {
                    "ingredients_processed": ingredients_processed,
                    "processing_score": processing_score
                }
                
                # Store both raw OCR text and processed ingredients
                if ingredients_ocr_text.strip():
                    ingredients_update["ingredients_raw"] = ingredients_ocr_text
                
                db.query(models.Food).filter(models.Food.id == food_id).update(ingredients_update)
                db.commit()
                
            except Exception as e:
                logger.error(f"Error processing ingredients image for food {food_id}: {e}")
                # Update with error message but continue
                db.query(models.Food).filter(models.Food.id == food_id).update({
                    "progress_message": f"Ingredients analysis failed: {str(e)[:100]}"
                })
                db.commit()
        
        # Mark as completed
        db.query(models.Food).filter(models.Food.id == food_id).update({
            "processing_status": "completed",
            "progress_message": "Analysis complete! Both OCR and AI processing finished successfully."
        })
        db.commit()
        
        logger.info(f"Completed background processing for food {food_id}")
        
    except Exception as e:
        logger.error(f"Critical error in background processing for food {food_id}: {e}")
        
        # Mark as error
        try:
            db.query(models.Food).filter(models.Food.id == food_id).update({
                "processing_status": "error",
                "progress_message": f"Analysis failed: {str(e)[:100]}. Please try uploading the images again."
            })
            db.commit()
        except:
            pass  # Don't fail if we can't update error status
        
        db.rollback()
    finally:
        db.close()

@router.post("/", response_model=schemas.FoodWithProcessingStatus)
async def create_food(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    brand: Optional[str] = Form(None),
    nutrition_image: UploadFile = File(None),
    ingredients_image: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create food with immediate response and background AI processing"""
    
    # Determine initial processing status
    will_process_images = nutrition_image is not None or ingredients_image is not None
    initial_status = "processing" if will_process_images else "completed"
    initial_message = "Starting analysis..." if will_process_images else "No images to process"
    
    db_food = models.Food(
        name=name,
        brand=brand,
        user_id=current_user.id,
        processing_status=initial_status,
        progress_message=initial_message
    )
    
    db.add(db_food)
    db.commit()
    db.refresh(db_food)
    
    food_id = db_food.id
    nutrition_image_data = None
    ingredients_image_data = None
    
    try:
        if nutrition_image:
            nutrition_image_data = await nutrition_image.read()
            nutrition_path = await storage_service.upload_food_image(
                food_id, nutrition_image_data, "nutrition", nutrition_image.content_type # type: ignore
            )
            db_food.nutrition_image_path = nutrition_path # type: ignore
        
        if ingredients_image:
            ingredients_image_data = await ingredients_image.read()
            ingredients_path = await storage_service.upload_food_image(
                food_id, ingredients_image_data, "ingredients", ingredients_image.content_type # type: ignore
            )
            db_food.ingredients_image_path = ingredients_path # type: ignore

        # Commit image paths
        db.commit()
        db.refresh(db_food)
        
        # Start background processing
        if nutrition_image_data or ingredients_image_data:
            from app.database import SessionLocal
            background_tasks.add_task(
                process_food_images_background,
                food_id, # type: ignore
                nutrition_image_data,
                ingredients_image_data,
                SessionLocal
            )
        
        return db_food
        
    except Exception as e:
        storage_service.delete_food_images(food_id) # type: ignore
        db.delete(db_food)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Error creating food: {str(e)}")
    
@router.get("/{food_id}/processing-status")
async def get_processing_status(
    food_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check detailed processing status of food with OCR and AI progress"""
    
    food = db.query(models.Food).filter(
        models.Food.id == food_id,
        models.Food.user_id == current_user.id
    ).first()
    
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    # Get current processing status from database
    current_status = getattr(food, 'processing_status', 'completed')
    progress_message = getattr(food, 'progress_message', None)
    
    # Determine status based on available data if not explicitly set
    if current_status == 'completed' or current_status is None:
        has_nutrition_image = food.nutrition_image_path is not None
        has_ingredients_image = food.ingredients_image_path is not None
        has_nutrition_data = any([
            food.calories_per_100g, food.protein_per_100g, food.carbs_per_100g, food.fat_per_100g
        ])
        has_ingredients_processed = food.ingredients_processed is not None
        has_nutrition_ocr = food.nutrition_ocr_text is not None
        has_ingredients_ocr = food.ingredients_raw is not None
        
        # More detailed status determination
        if has_nutrition_image and not has_nutrition_ocr and not has_nutrition_data:
            current_status = "processing"
            progress_message = "Extracting text from nutrition label..."
        elif has_ingredients_image and not has_ingredients_ocr and not has_ingredients_processed:
            current_status = "processing"
            progress_message = "Extracting text from ingredients list..."
        elif has_nutrition_ocr and not has_nutrition_data:
            current_status = "analyzing_nutrition"
            progress_message = "Analyzing nutrition information with AI..."
        elif has_ingredients_ocr and not has_ingredients_processed:
            current_status = "analyzing_ingredients"
            progress_message = "Analyzing ingredients with AI..."
        else:
            current_status = "completed"
            if not progress_message:
                progress_message = "Analysis complete! OCR and AI processing finished successfully."
    
    return {
        "food_id": food_id,
        "status": current_status,
        "progress_message": progress_message,
        "has_nutrition_data": any([
            food.calories_per_100g, food.protein_per_100g, food.carbs_per_100g, food.fat_per_100g
        ]),
        "has_ingredients_processed": food.ingredients_processed is not None,
        "has_nutrition_ocr": food.nutrition_ocr_text is not None,
        "has_ingredients_ocr": food.ingredients_raw is not None,
        "last_updated": food.updated_at or food.created_at
    }

@router.get("/all", response_model=schemas.FoodListResponse)
async def get_all_foods(
    page: int = Query(1, ge=1, description="Page number starting from 1"),
    page_size: int = Query(20, ge=1, le=100, description="Number of items per page (max 100)"),
    search: Optional[str] = Query(None, description="Search by name or brand"),
    sort_by: Optional[str] = Query("created_at", description="Sort by: name, brand, created_at, calories_per_100g, processing_score"),
    sort_order: Optional[str] = Query("desc", regex="^(asc|desc)$", description="Sort order: asc or desc"),
    db: Session = Depends(get_db)
):
    query = db.query(models.Food)
    
    if search:
        search_filter = f"%{search.lower()}%"
        query = query.filter(
            func.lower(models.Food.name).like(search_filter) |
            func.lower(models.Food.brand).like(search_filter)
        )
    
    if (not sort_by) or (sort_by not in ["name", "brand", "created_at", "calories_per_100g", "processing_score"]):
        sort_by = "created_at"
        
    sort_column = getattr(models.Food, sort_by, models.Food.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
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

@router.get("/", response_model=schemas.FoodListResponse)
async def get_foods(
    page: int = Query(1, ge=1, description="Page number starting from 1"),
    page_size: int = Query(20, ge=1, le=100, description="Number of items per page (max 100)"),
    search: Optional[str] = Query(None, description="Search by name or brand"),
    sort_by: Optional[str] = Query("created_at", description="Sort by: name, brand, created_at, calories_per_100g, processing_score"),
    sort_order: Optional[str] = Query("desc", regex="^(asc|desc)$", description="Sort order: asc or desc"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Food).filter(models.Food.user_id == current_user.id)
    
    if search:
        search_filter = f"%{search.lower()}%"
        query = query.filter(
            func.lower(models.Food.name).like(search_filter) |
            func.lower(models.Food.brand).like(search_filter)
        )
    
    if (not sort_by) or (sort_by not in ["name", "brand", "created_at", "calories_per_100g", "processing_score"]):
        sort_by = "created_at"
        
    sort_column = getattr(models.Food, sort_by, models.Food.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
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
    
@router.get("/{food_id}", response_model=schemas.FoodWithProcessingStatus)
async def get_food(
    food_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    food = db.query(models.Food).filter(
        models.Food.id == food_id,
        models.Food.user_id == current_user.id
    ).first()
    
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    # Determine processing status
    has_nutrition_image = food.nutrition_image_path is not None
    has_ingredients_image = food.ingredients_image_path is not None
    has_nutrition_data = any([
        food.calories_per_100g, food.protein_per_100g, food.carbs_per_100g, food.fat_per_100g
    ])
    has_ingredients_processed = food.ingredients_processed is not None
    
    if has_nutrition_image and not has_nutrition_data:
        status = "processing"
    elif has_ingredients_image and not has_ingredients_processed:
        status = "processing"
    else:
        status = "completed"
        
    food.processing_status = status # type: ignore
    
    return schemas.FoodWithProcessingStatus(
        **food.__dict__,
    )

@router.get("/{food_id}/nutrition-image")
async def get_nutrition_image_url(
    food_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get presigned URL for nutrition image"""
    food = db.query(models.Food).filter(
        models.Food.id == food_id,
        models.Food.user_id == current_user.id
    ).first()
    
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    if not food.nutrition_image_path: # type: ignore
        raise HTTPException(status_code=404, detail="Nutrition image not found")
    
    url = storage_service.get_image_url(str(food.nutrition_image_path))
    return {"url": url}

@router.get("/{food_id}/ingredients-image")
async def get_ingredients_image_url(
    food_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get presigned URL for ingredients image"""
    food = db.query(models.Food).filter(
        models.Food.id == food_id,
        models.Food.user_id == current_user.id
    ).first()
    
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    if not food.ingredients_image_path: # type: ignore
        raise HTTPException(status_code=404, detail="Ingredients image not found")
    
    url = storage_service.get_image_url(str(food.ingredients_image_path))
    return {"url": url}

@router.put("/{food_id}", response_model=schemas.Food)
async def update_food(
    food_id: int,
    name: Optional[str] = Form(None),
    brand: Optional[str] = Form(None),
    ingredients_text: Optional[str] = Form(None),
    nutrition_image: UploadFile = File(None),
    ingredients_image: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_food = db.query(models.Food).filter(
        models.Food.id == food_id,
        models.Food.user_id == current_user.id
    ).first()
    
    if not db_food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    update_data = {}
    
    if name is not None:
        update_data["name"] = name
    if brand is not None:
        update_data["brand"] = brand
    
    # Handle nutrition image update
    if nutrition_image:
        # Delete old nutrition image if exists
        if db_food.nutrition_image_path: # type: ignore
            storage_service.delete_image(str(db_food.nutrition_image_path))
        
        # Read image file once
        nutrition_image_data = await nutrition_image.read()
        
        # Upload new nutrition image using bytes
        nutrition_path = await storage_service.upload_food_image(
            food_id, nutrition_image_data, "nutrition", nutrition_image.content_type
        )
        
        # Extract and process nutrition info from bytes
        nutrition_text = ocr_service.extract_text_from_bytes(nutrition_image_data)
        nutrition_data = await ai_service.parse_nutrition_info(nutrition_text)
        
        update_data["nutrition_image_path"] = nutrition_path
        for key, value in nutrition_data.items():
            if value is not None:
                update_data[key] = value
    
    # Handle ingredients image update
    if ingredients_image:
        # Delete old ingredients image if exists
        if db_food.ingredients_image_path: # type: ignore
            storage_service.delete_image(str(db_food.ingredients_image_path))
        
        # Read image file once
        ingredients_image_data = await ingredients_image.read()
        
        # Upload new ingredients image using bytes
        ingredients_path = await storage_service.upload_food_image(
            food_id, ingredients_image_data, "ingredients", ingredients_image.content_type
        )
        
        # Extract and process ingredients from bytes
        ingredients_raw = ocr_service.extract_text_from_bytes(ingredients_image_data)
        ingredients_processed = await ai_service.process_ingredients(ingredients_raw)
        processing_score = await ai_service.extract_processing_score(ingredients_processed)
        
        update_data["ingredients_image_path"] = ingredients_path
        update_data["ingredients_raw"] = ingredients_raw
        update_data["ingredients_processed"] = ingredients_processed + "\n\n**AI Analysis Disclaimer**: This interpretation is generated automatically and may not be completely accurate. Verify important information independently."
        update_data["processing_score"] = processing_score
    
    # Handle manual ingredients text update
    if ingredients_text:
        ingredients_processed = await ai_service.process_ingredients(ingredients_text)
        processing_score = await ai_service.extract_processing_score(ingredients_processed)
        
        update_data["ingredients_raw"] = ingredients_text
        update_data["ingredients_processed"] = ingredients_processed + "\n\n**AI Analysis Disclaimer**: This interpretation is generated automatically and may not be completely accurate. Verify important information independently."
        update_data["processing_score"] = processing_score
    
    if update_data:
        db.query(models.Food).filter(
            models.Food.id == food_id,
            models.Food.user_id == current_user.id
        ).update(update_data)
        db.commit()
        
        db.refresh(db_food)
    
    return db_food

@router.delete("/{food_id}")
async def delete_food(
    food_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    food = db.query(models.Food).filter(
        models.Food.id == food_id,
        models.Food.user_id == current_user.id
    ).first()
    
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    
    # Delete images from storage
    storage_service.delete_food_images(food_id)
    
    # Delete food record
    db.delete(food)
    db.commit()
    
    return {"message": "Food deleted successfully"}

@router.get("/filter/advanced", response_model=schemas.FoodListResponse)
async def get_foods_filtered(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    min_protein: Optional[float] = Query(None, description="Minimum protein per 100g"),
    max_calories: Optional[float] = Query(None, description="Maximum calories per 100g"),
    max_sodium: Optional[float] = Query(None, description="Maximum sodium per 100g"),
    max_processing_score: Optional[int] = Query(None, ge=1, le=5, description="Maximum processing score (1-5)"),
    has_ingredients: Optional[bool] = Query(None, description="Filter foods with ingredients only"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Food).filter(models.Food.user_id == current_user.id)
    
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
    
    query = query.order_by(models.Food.processing_score.asc().nulls_last(), 
                          models.Food.created_at.desc())
    
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
    criteria: str = Query("processing_score", description="Ranking criteria: processing_score, protein_per_100g, calories_per_100g, sodium_per_100g"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ascending: bool = Query(True, description="Sort ascending (True) or descending (False)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    valid_criteria = ["processing_score", "protein_per_100g", "calories_per_100g", 
                     "sodium_per_100g", "fat_per_100g", "fiber_per_100g", "sugar_per_100g"]
    
    if criteria not in valid_criteria:
        raise HTTPException(status_code=400, detail=f"Invalid criteria. Use one of: {', '.join(valid_criteria)}")
    
    query = db.query(models.Food).filter(models.Food.user_id == current_user.id)
    
    sort_column = getattr(models.Food, criteria)
    query = query.filter(sort_column.isnot(None))
    
    if ascending:
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())
    
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
async def get_food_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_foods_query = db.query(models.Food).filter(models.Food.user_id == current_user.id)
    total_foods = user_foods_query.count()
    
    avg_calories = user_foods_query.filter(
        models.Food.calories_per_100g.isnot(None)
    ).with_entities(func.avg(models.Food.calories_per_100g)).scalar()
    
    avg_protein = user_foods_query.filter(
        models.Food.protein_per_100g.isnot(None)
    ).with_entities(func.avg(models.Food.protein_per_100g)).scalar()
    
    processing_distribution = user_foods_query.filter(
        models.Food.processing_score.isnot(None)
    ).with_entities(
        models.Food.processing_score,
        func.count(models.Food.processing_score)
    ).group_by(models.Food.processing_score).all()
    
    healthiest_foods = user_foods_query.filter(
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