import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./budget.db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-secret-key-change-me-in-production-0123456789")
ACCESS_TOKEN_HOURS = int(os.getenv("ACCESS_TOKEN_HOURS", "8"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")
# Password given to users loaded from the CSV demo data
DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "demo12345")
