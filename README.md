# LabelLogic

**Aplicație mobilă pentru recunoașterea și interpretarea informațiilor nutriționale folosind OCR și analiză a ingredientelor**

**Author**: Schmidt Robert-Eduard  
**Supervisor**: Conf. Dr. Mureșan Claudia  
**University**: University of Bucharest, Faculty of Mathematics and Computer Science  
**Year**: 2025

## Abstract (Română)

În contextul actual, înțelegerea informațiilor nutriționale de pe etichetele alimentelor reprezintă o provocare constantă pentru consumatori, din cauza terminologiei complexe și a listelor lungi de ingrediente cu denumiri științifice. Această lucrare prezintă dezvoltarea unei aplicații pentru recunoașterea și interpretarea automată a informațiilor nutriționale folosind tehnologii avansate de recunoaștere optică a caracterelor și procesarea limbajului natural.

Aplicația transformă listele de ingrediente cu denumiri științifice într-un format ușor de înțeles, oferind explicații despre rolul fiecărui component și calculând un scor de procesare pentru evaluarea gradului de procesare a alimentului. Soluția oferă funcționalități de filtrare și comparare a alimentelor după diverse criterii nutriționale, facilitând utilizatorilor luarea unor decizii informate despre alimentație.

Rezultatele demonstrează fezabilitatea utilizării tehnologiilor contemporane pentru automatizarea analizei nutriționale, oferind o soluție practică pentru promovarea unei alimentații mai sănătoase.

## Abstract (English)

In the current context, understanding nutritional information on food labels is a constant challenge for consumers due to complex terminology and long lists of ingredients with scientific names. This paper presents the development of an application for automatic recognition and interpretation of nutritional information using advanced optical character recognition and natural language processing technologies.

The application transforms ingredient lists with scientific names into an easy-to-understand format, providing explanations of the role of each component and calculating a processing score for evaluating the degree of food processing. The solution provides functionality to filter and compare foods according to various nutritional criteria, making it easier for users to make informed dietary decisions.

The results demonstrate the feasibility of using contemporary technologies to automate nutritional analysis, providing a practical solution for promoting healthier diets.

## Key Features

- **OCR-powered Data Extraction**: Automatically extract nutritional information and ingredient lists from photos
- **AI-powered Ingredient Analysis**: Transform complex ingredient lists into easy-to-understand explanations
- **Processing Score Calculation**: Evaluate food processing levels (1-5 scale) 
- **Advanced Filtering**: Filter foods by protein content, calories, sodium, processing score, etc.
- **Food Ranking**: Rank foods based on various nutritional criteria
- **User Authentication**: Secure personal food database with JWT-based authentication
- **Collaborative Database**: Users can build and share their food knowledge

## Technology Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **PostgreSQL**: Robust relational database
- **Tesseract OCR**: Multi-language optical character recognition
- **Google Gemini AI**: Advanced natural language processing for ingredient interpretation
- **SQLAlchemy**: Python SQL toolkit and ORM
- **Docker**: Containerization for easy deployment

### Key Libraries
- `pytesseract`: OCR processing with Romanian and English support
- `Pillow (PIL)`: Image processing and optimization
- `google-generativeai`: AI-powered ingredient analysis
- `passlib`: Secure password hashing
- `python-jose`: JWT token handling

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Gemini API key from Google AI Studio

### Environment Setup
1. Clone the repository
2. Create `.env` file in the backend directory:
```env
DATABASE_URL=postgresql://nutrition_user:nutrition_password@db:5432/nutrition_app
GEMINI_API_KEY=your_gemini_api_key_here
SECRET_KEY=your_secret_key_here
```

### Development
```bash
# Start development environment
docker-compose -f docker-compose.dev.yaml up --build

# The API will be available at http://localhost:8000
# API documentation at http://localhost:8000/docs
```

### Production
```bash
# Start production environment
docker-compose -f docker-compose.prod.yaml up --build
```

## API Overview

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login with cookie-based sessions
- `POST /auth/logout` - Secure logout
- `GET /auth/me` - Get current user info

### Food Management
- `POST /foods/` - Upload food with images (nutrition + ingredients)
- `GET /foods/` - List user's foods with search and pagination
- `PUT /foods/{id}` - Update food information
- `DELETE /foods/{id}` - Remove food from database

### Advanced Features
- `GET /foods/filter/advanced` - Filter by nutritional criteria
- `GET /foods/ranking/by-criteria` - Rank foods by selected metrics
- `GET /foods/stats/summary` - Get nutritional statistics overview

## Core Functionality

### OCR Processing
The application uses Tesseract OCR with optimized configuration for Romanian and English text recognition, specifically tuned for small fonts and complex layouts typical of food labels.

### AI-Powered Analysis
Using Google Gemini AI to:
- Parse nutritional information from OCR text
- Transform scientific ingredient names into understandable explanations
- Calculate food processing scores (1-5 scale)
- Identify beneficial and harmful components

### Data Security
- JWT-based authentication with token rotation
- HTTP-only cookies for secure token storage
- User-specific data isolation
- Secure password hashing with bcrypt

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/routes/     # API endpoints
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic (OCR, AI, Auth)
│   │   └── core/          # Configuration
│   ├── Dockerfile          # Production container
│   └── requirements.txt    # Python dependencies
├── docker-compose.*.yaml   # Container orchestration
├── bruno/                  # API testing collection
└── latex/                  # Thesis documentation
```

## Important Notes

⚠️ **AI-Generated Content Disclaimer**: This application uses AI to interpret food ingredients and provide nutritional guidance. The information provided is for educational purposes only and should not be considered as medical, nutritional, or dietary advice. Always consult with qualified healthcare professionals before making significant dietary changes.

## Contributing

This project was developed as a bachelor's thesis at the University of Bucharest, Faculty of Mathematics and Computer Science. The application demonstrates the feasibility of using contemporary technologies for automated nutritional analysis.

## License

This project is licensed under Creative Commons Attribution 4.0 International License.
