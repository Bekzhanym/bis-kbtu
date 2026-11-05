from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.exc import IntegrityError

from .core.config import CORS_ORIGINS
from .database import Base, SessionLocal, engine
from .routers import auth, budgets, categories, transactions, users
from .seed import seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(title="Family Budget Tracker API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(IntegrityError)
async def integrity_error(_: Request, exc: IntegrityError):
    # Last line of defence: DB constraints (PK/FK/UNIQUE/CHECK) rejected the write
    return JSONResponse(status_code=409, content={"detail": "Database constraint violated"})


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/docs")


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}


for r in (auth, users, categories, transactions, budgets):
    app.include_router(r.router)
