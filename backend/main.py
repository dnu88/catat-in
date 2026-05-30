"""
Catat.in - FastAPI Backend
Entry point utama aplikasi.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1 import ai, imports, webhooks
from app.core.config import settings


app = FastAPI(
    title="Catat.in API",
    description="Backend API untuk aplikasi pencatatan keuangan Catat.in",
    version="0.1.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        str(origin).strip().rstrip("/") for origin in settings.ALLOWED_ORIGINS
    ],
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "authorization", "Content-Type", "content-type", "X-Client-Info", "x-client-info", "Apikey", "apikey"],
)


API_PREFIX = "/api/v1"

app.include_router(ai.router, prefix=f"{API_PREFIX}/ai", tags=["AI"])
app.include_router(imports.router, prefix=f"{API_PREFIX}/imports", tags=["Import"])
app.include_router(webhooks.router, prefix=f"{API_PREFIX}/webhooks", tags=["Webhooks"])


@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "ok",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/", tags=["System"])
async def root():
    return {"message": "Catat.in API - see /health for status"}
