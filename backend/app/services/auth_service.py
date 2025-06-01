from datetime import datetime, timedelta
from typing import Optional
import uuid
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.config import settings
from app.models.user import User
from app.models.token import Token
from app.schemas.user import UserCreate, TokenData

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        return pwd_context.hash(password)
    
    @staticmethod
    def create_access_token(data: dict, db: Session, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
        
        jti = str(uuid.uuid4())
        
        if "sub" in to_encode and isinstance(to_encode["sub"], int):
            to_encode["sub"] = str(to_encode["sub"])
        
        to_encode.update({
            "exp": expire, 
            "type": "access",
            "iat": datetime.utcnow(),
            "jti": jti
        })
        
        user_id = int(data["sub"]) if isinstance(data["sub"], str) else data["sub"]
        db_token = Token(
            jti=jti,
            token_type="access",
            user_id=user_id,
            expires_at=expire,
            is_valid=True
        )
        db.add(db_token)
        db.commit()
        
        return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    
    @staticmethod
    def create_refresh_token(data: dict, db: Session) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=7)
        
        jti = str(uuid.uuid4())
        
        if "sub" in to_encode and isinstance(to_encode["sub"], int):
            to_encode["sub"] = str(to_encode["sub"])
        
        to_encode.update({
            "exp": expire, 
            "type": "refresh",
            "iat": datetime.utcnow(),
            "jti": jti
        })
        
        user_id = int(data["sub"]) if isinstance(data["sub"], str) else data["sub"]
        db_token = Token(
            jti=jti,
            token_type="refresh",
            user_id=user_id,
            expires_at=expire,
            is_valid=True
        )
        db.add(db_token)
        db.commit()
        
        return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    
    @staticmethod
    def verify_token(token: str, token_type: str = "access", db: Session = None) -> Optional[TokenData]:
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            
            if payload.get("type") != token_type:
                return None
            
            user_id_str: str | None = payload.get("sub")
            email: str | None = payload.get("email")
            jti: str | None = payload.get("jti")

            if not user_id_str or not jti:
                return None
            
            user_id: int = int(user_id_str)
            
            if user_id is None or jti is None:
                return None
            
            if db:
                db_token = db.query(Token).filter(
                    Token.jti == jti,
                    Token.is_valid == True
                ).first()
                
                if not db_token:
                    return None
            
            return TokenData(user_id=user_id, email=email, jti=jti)
            
        except JWTError:
            return None
        except Exception:
            return None
    
    @staticmethod
    def revoke_token(db: Session, jti: str, reason: str = "logout") -> bool:
        """Revoke a specific token by setting is_valid to False"""
        try:
            result = db.query(Token).filter(Token.jti == jti).update({
                "is_valid": False,
                "revoked_at": datetime.utcnow(),
                "revoke_reason": reason
            })
            db.commit()
            return result > 0
        except Exception:
            return False
    
    @staticmethod
    def revoke_all_user_tokens(db: Session, user_id: int, reason: str = "logout_all") -> int:
        """Revoke ALL tokens for a specific user"""
        try:
            result = db.query(Token).filter(
                Token.user_id == user_id,
                Token.is_valid == True
            ).update({
                "is_valid": False,
                "revoked_at": datetime.utcnow(),
                "revoke_reason": reason
            })
            db.commit()
            return result
        except Exception:
            return 0
    
    @staticmethod
    def cleanup_expired_tokens(db: Session):
        """Remove expired tokens from database (cleanup job)"""
        try:
            result = db.query(Token).filter(
                Token.expires_at < datetime.utcnow()
            ).delete()
            db.commit()
            return result
        except Exception:
            return 0
    
    @staticmethod
    def get_user_active_tokens(db: Session, user_id: int):
        """Get all active tokens for a user (useful for admin/user dashboard)"""
        return db.query(Token).filter(
            Token.user_id == user_id,
            Token.is_valid == True,
            Token.expires_at > datetime.utcnow()
        ).all()
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        if not AuthService.verify_password(password, user.hashed_password):
            return None
        return user
    
    @staticmethod
    def create_user(db: Session, user: UserCreate) -> User:
        if db.query(User).filter(User.email == user.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        if db.query(User).filter(User.username == user.username).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        hashed_password = AuthService.get_password_hash(user.password)
        db_user = User(
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            hashed_password=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()