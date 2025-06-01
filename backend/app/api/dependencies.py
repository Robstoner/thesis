from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import AuthService
from app.models.user import User

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    access_token = request.cookies.get("access_token")
    
    if not access_token:
        raise credentials_exception
    
    token_data = AuthService.verify_token(access_token, "access", db)
    if token_data is None:
        raise credentials_exception
    
    user = AuthService.get_user_by_id(db, user_id=token_data.user_id)
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user

def get_optional_current_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    try:
        access_token = request.cookies.get("access_token")
        if not access_token:
            return None
        
        token_data = AuthService.verify_token(access_token, "access", db)
        if token_data is None:
            return None
        
        user = AuthService.get_user_by_id(db, user_id=token_data.user_id)
        if user and user.is_active:
            return user
        return None
    except:
        return None