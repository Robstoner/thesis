from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.conf = ConnectionConfig(
            MAIL_USERNAME=settings.mail_username,
            MAIL_PASSWORD=settings.mail_password,
            MAIL_FROM=settings.mail_from,
            MAIL_PORT=settings.mail_port,
            MAIL_SERVER=settings.mail_server,
            MAIL_STARTTLS=settings.mail_starttls,
            MAIL_SSL_TLS=settings.mail_ssl_tls,
            USE_CREDENTIALS=settings.use_credentials,
            VALIDATE_CERTS=settings.validate_certs
        )
        self.fastmail = FastMail(self.conf)

    async def send_verification_email(self, email: str, username: str, verification_token: str):
        """Send email verification email - Backend only version"""
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Verificare Email - LabelLogic</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background-color: #4CAF50;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }}
                .content {{
                    background-color: #f9f9f9;
                    padding: 20px;
                    border-radius: 0 0 5px 5px;
                }}
                .token-box {{
                    background-color: #e9e9e9;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                    word-break: break-all;
                    font-family: monospace;
                    border-left: 4px solid #4CAF50;
                }}
                .api-box {{
                    background-color: #f0f8ff;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                    border-left: 4px solid #2196F3;
                }}
                .footer {{
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    color: #666;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🥗 LabelLogic</h1>
                <h2>Verificare Email</h2>
            </div>
            <div class="content">
                <p>Salut <strong>{username}</strong>!</p>
                
                <p>Îți mulțumim că te-ai înregistrat în aplicația noastră de analiză nutrițională! 🎉</p>
                
                <p>Pentru a-ți activa contul, te rugăm să folosești următorul token de verificare:</p>
                
                <div class="token-box">
                    <strong>Token de verificare:</strong><br>
                    {verification_token}
                </div>
                
                <div class="api-box">
                    <strong>📡 Pentru dezvoltatori - Verificare prin API:</strong><br>
                    <code>POST /auth/verify-email?token={verification_token}</code><br><br>
                    Sau poți folosi Bruno/Postman pentru a face request-ul:
                </div>
                
                <p><strong>⏰ Important:</strong> Acest token va expira în 24 de ore din motive de securitate.</p>
                
                <p><strong>🔧 Instrucțiuni pentru verificare:</strong></p>
                <ol>
                    <li>Copiază token-ul de mai sus</li>
                    <li>Folosește-l în aplicația ta sau prin API call</li>
                    <li>După verificare, vei putea să te autentifici normal</li>
                </ol>
                
                <p>Dacă nu te-ai înregistrat pentru acest cont, te rugăm să ignori acest email.</p>
                
                <div class="footer">
                    <p><strong>⚠️ Despre aplicația noastră:</strong></p>
                    <p>Aplicația noastră folosește inteligența artificială pentru a interpreta ingredientele alimentelor și pentru a oferi îndrumări nutriționale. Informațiile furnizate sunt doar în scop educativ și nu trebuie considerate ca sfaturi medicale, nutriționale sau dietetice. Consultă întotdeauna profesioniștii din domeniul sănătății înainte de a face modificări semnificative în dietă.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        🥗 LabelLogic - Verificare Email
        
        Salut {username}!

        Îți mulțumim că te-ai înregistrat în aplicația noastră de analiză nutrițională!

        Pentru a-ți activa contul, te rugăm să folosești următorul token de verificare:

        TOKEN DE VERIFICARE:
        {verification_token}

        VERIFICARE PRIN API:
        POST /auth/verify-email?token={verification_token}

        IMPORTANT: 
        - Acest token va expira în 24 de ore din motive de securitate.
        - După verificare, vei putea să te autentifici normal.

        Dacă nu te-ai înregistrat pentru acest cont, te rugăm să ignori acest email.

        ---
        ⚠️ Aplicația noastră folosește inteligența artificială pentru a interpreta ingredientele alimentelor. 
        Informațiile furnizate sunt doar în scop educativ și nu trebuie considerate ca sfaturi medicale.
        """

        message = MessageSchema(
            subject="🥗 Verifică-ți email-ul pentru LabelLogic",
            recipients=[email],
            alternative_body=text_body,
            template_body=html_body,
            subtype=MessageType.html
        )

        try:
            await self.fastmail.send_message(message)
            logger.info(f"Verification email sent successfully to {email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send verification email to {email}: {str(e)}")
            return False

    async def send_password_reset_email(self, email: str, username: str, reset_token: str):
        """Send password reset email - Backend only version"""
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Resetare Parolă - LabelLogic</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background-color: #ff6b6b;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }}
                .content {{
                    background-color: #f9f9f9;
                    padding: 20px;
                    border-radius: 0 0 5px 5px;
                }}
                .token-box {{
                    background-color: #ffe9e9;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                    word-break: break-all;
                    font-family: monospace;
                    border-left: 4px solid #ff6b6b;
                }}
                .api-box {{
                    background-color: #f0f8ff;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                    border-left: 4px solid #2196F3;
                }}
                .footer {{
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    color: #666;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🥗 LabelLogic</h1>
                <h2>Resetare Parolă</h2>
            </div>
            <div class="content">
                <p>Salut <strong>{username}</strong>!</p>
                
                <p>Am primit o cerere de resetare a parolei pentru contul tău.</p>
                
                <p>Pentru a-ți reseta parola, ai două opțiuni:</p>
                
                <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                    <strong>🔗 Opțiunea 1: Link Direct în Aplicație (Recomandat)</strong><br>
                    <p>Apasă pe linkul de mai jos pentru a deschide aplicația direct:</p>
                    <p><a href="labellogic://reset-password/{reset_token}" style="color: #4CAF50; font-weight: bold;">Resetează Parola în Aplicație</a></p>
                </div>
                
                <div class="token-box">
                    <strong>🔑 Opțiunea 2: Token Manual</strong><br>
                    Copiază acest token și folosește-l în aplicația LabelLogic:<br>
                    {reset_token}
                </div>
                
                <div class="api-box">
                    <strong>📡 Pentru dezvoltatori - Resetare prin API:</strong><br>
                    <code>POST /auth/reset-password</code><br>
                    Body: {{"token": "{reset_token}", "new_password": "noua_parola"}}<br><br>
                    Sau poți folosi Bruno/Postman pentru a face request-ul.
                </div>
                
                <p><strong>⏰ Important:</strong> Acest token va expira în 24 de ore din motive de securitate.</p>
                
                <p><strong>🔧 Instrucțiuni pentru resetare:</strong></p>
                <ol>
                    <li>Copiază token-ul de mai sus</li>
                    <li>Folosește-l în aplicația ta sau prin API call cu noua parolă</li>
                    <li>Toate sesiunile active vor fi invalidate din motive de securitate</li>
                    <li>Va trebui să te autentifici din nou cu noua parolă</li>
                </ol>
                
                <p>Dacă nu ai solicitat resetarea parolei, te rugăm să ignori acest email. Parola ta rămâne neschimbată.</p>
            </div>
        </body>
        </html>
        """

        text_body = f"""
        🥗 LabelLogic - Resetare Parolă
        
        Salut {username}!

        Am primit o cerere de resetare a parolei pentru contul tău.

        Pentru a-ți reseta parola, ai două opțiuni:

        🔗 OPȚIUNEA 1: LINK DIRECT ÎN APLICAȚIE (RECOMANDAT)
        Deschide acest link: labellogic://reset-password/{reset_token}

        🔑 OPȚIUNEA 2: TOKEN MANUAL
        Copiază acest token și folosește-l în aplicația LabelLogic:
        {reset_token}

        📡 RESETARE PRIN API (pentru dezvoltatori):
        POST /auth/reset-password
        Body: {{"token": "{reset_token}", "new_password": "noua_parola"}}

        IMPORTANT: 
        - Acest token va expira în 24 de ore din motive de securitate.
        - Toate sesiunile active vor fi invalidate.
        - Va trebui să te autentifici din nou cu noua parolă.

        Dacă nu ai solicitat resetarea parolei, te rugăm să ignori acest email.
        """

        message = MessageSchema(
            subject="🔒 Resetare Parolă - LabelLogic",
            recipients=[email],
            alternative_body=text_body,
            template_body=html_body,
            subtype=MessageType.html
        )

        try:
            await self.fastmail.send_message(message)
            logger.info(f"Password reset email sent successfully to {email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send password reset email to {email}: {str(e)}")
            return False

    async def send_password_reset_code_email(self, email: str, username: str, reset_code: str):
        """Send password reset email with 6-digit code"""
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Resetare Parolă - LabelLogic</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background-color: #ff6b6b;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }}
                .content {{
                    background-color: #f9f9f9;
                    padding: 20px;
                    border-radius: 0 0 5px 5px;
                }}
                .code-box {{
                    background-color: #e8f5e8;
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                    text-align: center;
                    border-left: 4px solid #4CAF50;
                }}
                .code {{
                    font-size: 32px;
                    font-weight: bold;
                    color: #2c3e50;
                    letter-spacing: 8px;
                    font-family: monospace;
                    margin: 10px 0;
                }}
                .expiry {{
                    background-color: #fff3cd;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                    border-left: 4px solid #ffc107;
                }}
                .footer {{
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid #ddd;
                    color: #666;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🥗 LabelLogic</h1>
                <h2>Resetare Parolă</h2>
            </div>
            <div class="content">
                <p>Salut <strong>{username}</strong>!</p>
                
                <p>Am primit o cerere de resetare a parolei pentru contul tău.</p>
                
                <p>Pentru a-ți reseta parola, folosește următorul cod de 6 cifre:</p>
                
                <div class="code-box">
                    <p><strong>🔑 Codul tău de resetare:</strong></p>
                    <div class="code">{reset_code}</div>
                    <p style="margin: 0; font-size: 14px; color: #666;">Introdu acest cod în aplicația LabelLogic</p>
                </div>
                
                <div class="expiry">
                    <strong>⏰ Important:</strong> Acest cod va expira în <strong>15 minute</strong> din motive de securitate.
                </div>
                
                <p><strong>🔧 Instrucțiuni pentru resetare:</strong></p>
                <ol>
                    <li>Deschide aplicația LabelLogic</li>
                    <li>Navighează la secțiunea "Parolă uitată"</li>
                    <li>Introdu email-ul tău și codul de mai sus</li>
                    <li>Setează noua parolă</li>
                    <li>Toate sesiunile active vor fi invalidate din motive de securitate</li>
                </ol>
                
                <p>Dacă nu ai solicitat resetarea parolei, te rugăm să ignori acest email. Parola ta rămâne neschimbată.</p>
            </div>
        </body>
        </html>
        """

        text_body = f"""
        🥗 LabelLogic - Resetare Parolă
        
        Salut {username}!

        Am primit o cerere de resetare a parolei pentru contul tău.

        Pentru a-ți reseta parola, folosește următorul cod de 6 cifre:

        🔑 COD DE RESETARE: {reset_code}

        ⏰ IMPORTANT: 
        - Acest cod va expira în 15 minute din motive de securitate.
        - Toate sesiunile active vor fi invalidate.
        - Va trebui să te autentifici din nou cu noua parolă.

        INSTRUCȚIUNI:
        1. Deschide aplicația LabelLogic
        2. Navighează la "Parolă uitată"  
        3. Introdu email-ul și codul de mai sus
        4. Setează noua parolă

        Dacă nu ai solicitat resetarea parolei, te rugăm să ignori acest email.
        """

        message = MessageSchema(
            subject="🔒 Cod Resetare Parolă - LabelLogic",
            recipients=[email],
            alternative_body=text_body,
            template_body=html_body,
            subtype=MessageType.html
        )

        try:
            await self.fastmail.send_message(message)
            logger.info(f"Password reset code email sent successfully to {email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send password reset code email to {email}: {str(e)}")
            return False