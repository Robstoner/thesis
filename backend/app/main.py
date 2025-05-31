from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import food as models
from app.api.routes import food
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

# Include routers
app.include_router(food.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Nutrition App API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)