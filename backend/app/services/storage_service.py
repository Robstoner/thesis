from datetime import timedelta
import io
import logging
from typing import Optional, Union
from minio import Minio
from minio.error import S3Error
from fastapi import UploadFile, HTTPException
from starlette.datastructures import UploadFile as StarletteUploadFile
from app.core.config import settings

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        access_key = settings.minio_access_key or settings.minio_root_user
        secret_key = settings.minio_secret_key or settings.minio_root_password.get_secret_value()
        if not access_key or not secret_key:
            raise ValueError("MinIO access key and secret key must be set in the environment variables or config file.")
        
        self.client = Minio(
            settings.minio_endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=settings.minio_secure,
            region="us-west-1"
        )
        self.bucket_name = settings.minio_bucket_name
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Ensure the bucket exists, create if it doesn't"""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info(f"Created bucket: {self.bucket_name}")
        except S3Error as e:
            logger.error(f"Error ensuring bucket exists: {e}")
            raise HTTPException(status_code=500, detail="Storage initialization failed")
    
    async def upload_food_image(self, food_id: int, image_source: Union[UploadFile, bytes], image_type: str, content_type: str | None = None) -> str:
        """
        Upload an image for a food item
        
        Args:
            food_id: The ID of the food item
            image_source: Either UploadFile or bytes
            image_type: Either 'nutrition' or 'ingredients'
            content_type: MIME type (required if image_source is bytes)
        
        Returns:
            The object path in storage
        """
        if image_type not in ['nutrition', 'ingredients']:
            raise ValueError("image_type must be 'nutrition' or 'ingredients'")
        
        # Handle different input types
        if isinstance(image_source, StarletteUploadFile):
            file_content = await image_source.read()
            detected_content_type = image_source.content_type or 'image/png'
        elif isinstance(image_source, bytes):
            file_content = image_source
            detected_content_type = content_type or 'image/png'
        else:
            raise ValueError("image_source must be either UploadFile or bytes")
        
        # Determine file extension from content type
        if 'jpeg' in detected_content_type or 'jpg' in detected_content_type:
            extension = 'jpg'
        elif 'png' in detected_content_type:
            extension = 'png'
        elif 'webp' in detected_content_type:
            extension = 'webp'
        else:
            extension = 'png'  # Default to PNG
        
        object_name = f"{food_id}/{image_type}.{extension}"
        
        try:
            # Upload to MinIO
            file_data = io.BytesIO(file_content)
            
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                data=file_data,
                length=len(file_content),
                content_type=detected_content_type
            )
            
            logger.info(f"Uploaded {image_type} image for food {food_id}: {object_name}")
            return object_name
            
        except S3Error as e:
            logger.error(f"Error uploading image: {e}")
            raise HTTPException(status_code=500, detail="Failed to upload image")
        except Exception as e:
            logger.error(f"Unexpected error uploading image: {e}")
            raise HTTPException(status_code=500, detail="Failed to upload image")
    
    def get_image_url(self, object_name: str, expires_in_seconds: int = 3600) -> str:
        """
        Get a presigned URL for an image
        
        Args:
            object_name: The object path in storage
            expires_in_seconds: URL expiration time
        
        Returns:
            Presigned URL for the image
        """
        try:
            external_client = Minio(
                settings.minio_external_endpoint,
                access_key=settings.minio_access_key or settings.minio_root_user,
                secret_key=settings.minio_secret_key or settings.minio_root_password.get_secret_value(),
                secure=settings.minio_secure,
                region='us-west-1'
            )
            
            expires_in_seconds_delta = timedelta(seconds=expires_in_seconds)
            url = external_client.presigned_get_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                expires=expires_in_seconds_delta
            )
            
            # in development, replace http://minio:9000 with the local ip
            # in production, this will be the MinIO server URL
            if settings.minio_secure:
                url = url.replace("http://", "https://")
            else:
                url = url.replace("https://", "http://")
            if (settings.minio_endpoint.startswith("minio")):
                url = url.replace("http://minio:9000", "http://192.168.1.134:9000")
            return url
        except S3Error as e:
            logger.error(f"Error generating presigned URL: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate image URL")
    
    def delete_food_images(self, food_id: int) -> bool:
        """
        Delete all images for a food item
        
        Args:
            food_id: The ID of the food item
        
        Returns:
            True if successful
        """
        try:
            # List all objects with the food_id prefix
            objects = self.client.list_objects(
                bucket_name=self.bucket_name,
                prefix=f"{food_id}/",
                recursive=True
            )
            
            # Delete each object
            for obj in objects:
                if obj.object_name is None:
                    continue
                self.client.remove_object(self.bucket_name, obj.object_name)
                logger.info(f"Deleted object: {obj.object_name}")
            
            return True
            
        except S3Error as e:
            logger.error(f"Error deleting images for food {food_id}: {e}")
            return False
    
    def delete_image(self, object_name: str) -> bool:
        """
        Delete a specific image
        
        Args:
            object_name: The object path in storage
        
        Returns:
            True if successful
        """
        try:
            self.client.remove_object(self.bucket_name, object_name)
            logger.info(f"Deleted object: {object_name}")
            return True
        except S3Error as e:
            logger.error(f"Error deleting object {object_name}: {e}")
            return False
    
    async def get_image_data(self, object_name: str) -> Optional[bytes]:
        """
        Get raw image data for processing
        
        Args:
            object_name: The object path in storage
        
        Returns:
            Image bytes or None if not found
        """
        try:
            response = self.client.get_object(self.bucket_name, object_name)
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except S3Error as e:
            logger.error(f"Error getting image data for {object_name}: {e}")
            return None
    
    def image_exists(self, object_name: str) -> bool:
        """
        Check if an image exists in storage
        
        Args:
            object_name: The object path in storage
        
        Returns:
            True if image exists
        """
        try:
            self.client.stat_object(self.bucket_name, object_name)
            return True
        except S3Error:
            return False