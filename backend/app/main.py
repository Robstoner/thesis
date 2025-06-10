from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import food as food_models
from app.models import user as user_models
from app.api.routes import food, auth
from app.startup import initialize_storage
import uvicorn
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
food_models.Base.metadata.create_all(bind=engine)
user_models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LabelLogic API",
    description="API for nutrition analysis application with authentication and image storage",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "exp://172.21.*.*:*",
        "http://172.*.*.*:*",
        "http://192.168.*.*:*",
        "exp://192.168.*.*:*",
        "http://10.*.*.*:*",
        "https://*.ngrok.io",
        "*"  # For development only - remove in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize storage on startup
@app.on_event("startup")
async def startup_event():
    logger.info("Starting up the application...")
    if initialize_storage():
        logger.info("Storage initialization completed")
    else:
        logger.warning("Storage initialization failed - some features may not work")

app.include_router(auth.router, prefix="/api/v1")
app.include_router(food.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Nutrition App API with Authentication and Image Storage"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)