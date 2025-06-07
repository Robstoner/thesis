import logging
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)

def initialize_storage():
    """Initialize storage service and ensure bucket exists"""
    try:
        storage_service = StorageService()
        logger.info("Storage service initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize storage service: {e}")
        return False