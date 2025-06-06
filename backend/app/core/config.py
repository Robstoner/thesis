from pydantic import SecretStr
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = ""
    gemini_api_key: str = ""
    secret_key: str = "thesis-rxb-super-secret-key-for-jwt"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Email settings
    mail_username: str = ""
    mail_password: SecretStr = SecretStr("")
    mail_from: str = ""
    mail_port: int = 587
    mail_server: str = "smtp.gmail.com"
    mail_starttls: bool = True
    mail_ssl_tls: bool = False
    use_credentials: bool = True
    validate_certs: bool = True
    
    # Application settings
    email_verification_expire_minutes: int = 1440  # 24 hours

    class Config:
        env_file = ".env"

settings = Settings()