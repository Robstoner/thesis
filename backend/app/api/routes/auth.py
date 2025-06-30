from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserCreate, User as UserSchema, UserLogin, UserRegisterResponse, PasswordResetRequest, PasswordResetConfirm, EmailVerificationRequest, PasswordResetCodeRequest, PasswordResetCodeConfirm
from app.services.auth_service import AuthService
from app.services.email_service import EmailService
from app.api.dependencies import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["authentication"])

email_service = EmailService()

@router.post("/register", response_model=UserRegisterResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        # Create user (inactive by default)
        db_user = AuthService.create_user(db, user)
        
        # Create email verification token
        verification_token = AuthService.create_email_verification_token(
            data={"sub": db_user.id, "email": db_user.email}, 
            db=db
        )
        
        # Send verification email
        email_sent = await email_service.send_verification_email(
            email=str(db_user.email),
            username=str(db_user.username),
            verification_token=verification_token
        )
        
        if not email_sent:
            # Log warning but don't fail registration
            pass
        
        return UserRegisterResponse(
            message="Cont creat cu succes! Te rugăm să îți verifici email-ul pentru a activa contul. Verifică și folderul spam. Aplicația folosește AI pentru a interpreta ingredientele alimentelor și pentru a oferi îndrumări nutriționale. Informațiile furnizate sunt doar în scop educativ și nu trebuie considerate ca sfaturi medicale, nutriționale sau dietetice. Consultă întotdeauna profesioniștii din domeniul sănătății înainte de a face modificări semnificative în dietă.", 
            user=db_user
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating user"
        )

@router.post("/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    """Verify user email with token from email link"""
    
    # Verify the token
    token_data = AuthService.verify_token(token, "email_verification", db)
    if token_data is None or token_data.user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token invalid sau expirat"
        )
    
    # Get user
    user = AuthService.get_user_by_id(db, user_id=token_data.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilizator nu a fost găsit"
        )
    
    # Check if already verified
    if bool(user.is_verified):
        return {
            "message": "Email-ul este deja verificat",
            "already_verified": True
        }
    
    # Verify user email
    success = AuthService.verify_user_email(db, user.id) # type: ignore
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Eroare la verificarea email-ului"
        )

    if token_data.jti is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token invalid sau expirat"
        )
    
    # Revoke the verification token after use
    AuthService.revoke_token(db, token_data.jti, "email_verified")
    
    return {
        "message": "Email verificat cu succes! Contul tău este acum activ.",
        "verified": True
    }

@router.post("/resend-verification")
async def resend_verification_email(
    request: EmailVerificationRequest, 
    db: Session = Depends(get_db)
):
    """Resend verification email"""
    
    # Check if user exists and is unverified
    user = AuthService.resend_verification_email(db, request.email)
    if not user:
        # Don't reveal if email exists or not for security
        return {
            "message": "Dacă email-ul este înregistrat și neverificat, un email de verificare a fost trimis."
        }
    
    # Create new verification token
    verification_token = AuthService.create_email_verification_token(
        data={"sub": user.id, "email": user.email}, 
        db=db
    )
    
    # Send verification email
    email_sent = await email_service.send_verification_email(
        email=str(user.email),
        username=str(user.username),
        verification_token=str(verification_token)
    )
    
    return {
        "message": "Dacă email-ul este înregistrat și neverificat, un email de verificare a fost trimis."
    }

@router.post("/request-password-reset")
async def request_password_reset(
    request: PasswordResetRequest, 
    db: Session = Depends(get_db)
):
    """Request password reset"""
    
    # Check if user exists
    user = AuthService.get_user_by_email(db, request.email)
    if not user:
        # Don't reveal if email exists or not for security
        return {
            "message": "Dacă email-ul este înregistrat, un email de resetare parolă a fost trimis."
        }
    
    # Create password reset token
    reset_token = AuthService.create_password_reset_token(
        data={"sub": user.id, "email": user.email}, 
        db=db
    )
    
    # Send password reset email
    email_sent = await email_service.send_password_reset_email(
        email=str(user.email),
        username=str(user.username),
        reset_token=str(reset_token)
    )
    
    return {
        "message": "Dacă email-ul este înregistrat, un email de resetare parolă a fost trimis."
    }

@router.post("/reset-password")
async def reset_password(
    request: PasswordResetConfirm, 
    db: Session = Depends(get_db)
):
    """Reset password with token"""
    
    # Verify the token
    token_data = AuthService.verify_token(request.token, "password_reset", db)
    if token_data is None or token_data.user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token invalid sau expirat"
        )
    
    # Get user
    user = AuthService.get_user_by_id(db, user_id=token_data.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilizator nu a fost găsit"
        )
    
    # Update password
    success = AuthService.update_user_password(db, user.id, request.new_password) # type: ignore
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Eroare la resetarea parolei"
        )
    
    # Revoke all user tokens for security
    AuthService.revoke_all_user_tokens(db, user.id, "password_reset") # type: ignore
    
    return {
        "message": "Parola a fost resetată cu succes. Te rugăm să te autentifici cu noua parolă."
    }

@router.post("/request-password-reset-code")
async def request_password_reset_code(
    request: PasswordResetCodeRequest, 
    db: Session = Depends(get_db)
):
    """Request password reset with 6-digit code"""
    
    # Check if user exists
    user = AuthService.get_user_by_email(db, request.email)
    if not user:
        # Don't reveal if email exists or not for security
        return {
            "message": "Dacă email-ul este înregistrat, un cod de resetare a fost trimis."
        }
    
    # Create 6-digit reset code
    reset_code = AuthService.create_password_reset_code(db, user.id)
    
    # Send password reset email with code
    email_sent = await email_service.send_password_reset_code_email(
        email=str(user.email),
        username=str(user.username),
        reset_code=reset_code
    )
    
    return {
        "message": "Dacă email-ul este înregistrat, un cod de resetare a fost trimis."
    }

@router.post("/reset-password-with-code")
async def reset_password_with_code(
    request: PasswordResetCodeConfirm, 
    db: Session = Depends(get_db)
):
    """Reset password using 6-digit code"""
    
    # Verify the code
    user = AuthService.verify_password_reset_code(db, request.email, request.code)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cod invalid sau expirat"
        )
    
    # Update password
    success = AuthService.update_user_password(db, user.id, request.new_password) # type: ignore
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Eroare la resetarea parolei"
        )
    
    # Mark code as used
    AuthService.use_password_reset_code(db, request.email, request.code)
    
    # Revoke all user tokens for security
    AuthService.revoke_all_user_tokens(db, user.id, "password_reset") # type: ignore
    
    return {
        "message": "Parola a fost resetată cu succes. Te rugăm să te autentifici cu noua parolă."
    }

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
            detail="Email sau parolă incorectă",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not bool(user.is_active):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Contul nu este activ. Te rugăm să îți verifici email-ul pentru activare."
        )
    
    if not bool(user.is_verified):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email-ul nu este verificat. Te rugăm să îți verifici email-ul."
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
        "message": "Autentificare reușită",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "is_verified": user.is_verified
        }
    }

@router.post("/logout")
async def logout(
    request: Request, 
    response: Response, 
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
        "message": "Deconectare reușită",
        "revoked_tokens": revoked_tokens
    }

@router.post("/logout-all")
async def logout_all_devices(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Logout from all devices by revoking ALL user tokens"""
    
    revoked_count = AuthService.revoke_all_user_tokens(db, current_user.id, "logout_all")
    
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")
    
    return {
        "message": "Deconectat de pe toate dispozitivele cu succes",
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
    if token_data is None or token_data.user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user = AuthService.get_user_by_id(db, user_id=token_data.user_id)
    if not user or not bool(user.is_active) or not bool(user.is_verified):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found, inactive, or email not verified"
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
    
    return {
        "message": "Token refreshed successfully",
        "access_token": new_access_token
    }

@router.get("/me", response_model=UserSchema)
async def get_current_user_info(current_user = Depends(get_current_user)):
    return current_user

@router.get("/verify")
async def verify_token(current_user = Depends(get_current_user)):
    return {
        "valid": True,
        "user_id": current_user.id,
        "email": current_user.email,
        "is_verified": current_user.is_verified
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