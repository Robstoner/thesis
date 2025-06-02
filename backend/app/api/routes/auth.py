from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserCreate, User as UserSchema, UserLogin, UserRegisterResponse
from app.services.auth_service import AuthService
from app.api.dependencies import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=UserRegisterResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        db_user = AuthService.create_user(db, user)
        return UserRegisterResponse(
            message="This application uses AI to interpret food ingredients and provide nutritional guidance. The information provided is for educational purposes only and should not be considered as medical, nutritional, or dietary advice. Always consult with qualified healthcare professionals before making significant dietary changes. The AI-generated content may contain errors or inaccuracies.", 
            user=db_user
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating user"
        )

@router.post("/login")
async def login(
    response: Response,
    user_credentials: UserLogin,
    db: Session = Depends(get_db)
):
    user = AuthService.authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    token_data = {"sub": user.id, "email": user.email}
    
    access_token = AuthService.create_access_token(
        data=token_data, 
        db=db,
        expires_delta=access_token_expires
    )
    
    refresh_token = AuthService.create_refresh_token(data=token_data, db=db)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=False,
        samesite="lax"
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=False,
        samesite="lax"
    )
    
    return {
        "message": "Login successful",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name
        }
    }

@router.post("/logout")
async def logout(
    request: Request, 
    response: Response, 
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Simple logout that revokes current tokens"""
    
    access_token = request.cookies.get("access_token")
    refresh_token = request.cookies.get("refresh_token")
    
    revoked_tokens = []
    
    if access_token:
        access_token_data = AuthService.verify_token(access_token, "access", db)
        if access_token_data and access_token_data.jti:
            if AuthService.revoke_token(db, access_token_data.jti, "logout"):
                revoked_tokens.append("access_token")
    
    if refresh_token:
        refresh_token_data = AuthService.verify_token(refresh_token, "refresh", db)
        if refresh_token_data and refresh_token_data.jti:
            if AuthService.revoke_token(db, refresh_token_data.jti, "logout"):
                revoked_tokens.append("refresh_token")
    
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")
    
    return {
        "message": "Logout successful",
        "revoked_tokens": revoked_tokens
    }

@router.post("/logout-all")
async def logout_all_devices(
    request: Request,
    response: Response,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Logout from all devices by revoking ALL user tokens"""
    
    revoked_count = AuthService.revoke_all_user_tokens(db, current_user.id, "logout_all")
    
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")
    
    return {
        "message": "Logged out from all devices successfully",
        "revoked_tokens_count": revoked_count
    }

@router.post("/refresh")
async def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing"
        )
    
    token_data = AuthService.verify_token(refresh_token, "refresh", db)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user = AuthService.get_user_by_id(db, user_id=token_data.user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    new_access_token = AuthService.create_access_token(
        data={"sub": user.id, "email": user.email},
        db=db,
        expires_delta=access_token_expires
    )
    
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=False,
        samesite="lax"
    )
    
    return {"message": "Token refreshed successfully"}

@router.get("/me", response_model=UserSchema)
async def get_current_user_info(current_user = Depends(get_current_user)):
    return current_user

@router.get("/verify")
async def verify_token(current_user = Depends(get_current_user)):
    return {
        "valid": True,
        "user_id": current_user.id,
        "email": current_user.email
    }

@router.get("/active-sessions")
async def get_active_sessions(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all active tokens/sessions for current user"""
    active_tokens = AuthService.get_user_active_tokens(db, current_user.id)
    
    return {
        "active_sessions": [
            {
                "id": token.id,
                "token_type": token.token_type,
                "created_at": token.created_at,
                "expires_at": token.expires_at
            }
            for token in active_tokens
        ],
        "total_count": len(active_tokens)
    }