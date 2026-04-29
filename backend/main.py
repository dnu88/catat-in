"""
Catat.in - FastAPI Backend
Entry point utama aplikasi.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1 import ai, groups, imports, webhooks
from app.core.config import settings
from app.core.database import init_db
from app.core.firebase import has_firebase_admin_config


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Catat.in API starting up...")
    await init_db()
    yield
    print("Catat.in API shutting down...")


app = FastAPI(
    title="Catat.in API",
    description="Backend API untuk aplikasi pencatatan keuangan Catat.in",
    version="0.1.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin).strip().rstrip("/") for origin in settings.ALLOWED_ORIGINS],
    allow_origin_regex=r"https://.*\.vercel\.app", 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


API_PREFIX = "/api/v1"

app.include_router(ai.router, prefix=f"{API_PREFIX}/ai", tags=["AI"])
app.include_router(groups.router, prefix=f"{API_PREFIX}/groups", tags=["Groups"])
app.include_router(imports.router, prefix=f"{API_PREFIX}/imports", tags=["Import"])
app.include_router(webhooks.router, prefix=f"{API_PREFIX}/webhooks", tags=["Webhooks"])


@app.get("/health", tags=["System"])
async def health_check():
    firebase_status = "ok" if has_firebase_admin_config() else "missing-config"

    return {
        "status": "ok" if firebase_status == "ok" else "degraded",
        "firebase": firebase_status,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", tags=["System"])
async def root():
    return {"message": "Catat.in API - see /health for status"}
