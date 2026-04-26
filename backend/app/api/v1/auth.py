"""
Catat.in — Auth Router
Register, login, logout, dan refresh token via Supabase Auth.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from app.core.database import get_supabase, get_supabase_anon

router = APIRouter()


def _client():
    return get_supabase()


def _anon_client():
    return get_supabase_anon()


# ── SCHEMAS ──────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class GoogleAuthRequest(BaseModel):
    access_token: str


# ── ENDPOINTS ────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    """
    Daftarkan pengguna baru dengan email dan password.
    Profile dibuat otomatis via Supabase trigger.
    """
    try:
        client = _anon_client()
        result = client.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": {
                "data": {
                    "full_name": body.full_name,
                }
            }
        })

        if not result.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pendaftaran gagal. Coba lagi."
            )

        return {
            "message": "Pendaftaran berhasil. Silakan verifikasi email kamu.",
            "user_id": result.user.id,
            "email": result.user.email,
        }

    except HTTPException:
        raise
    except Exception as e:
        msg = str(e).lower()
        if "already registered" in msg or "already been registered" in msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email sudah terdaftar. Silakan login."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Pendaftaran gagal: {str(e)}"
        )


@router.post("/login")
async def login(body: LoginRequest):
    """
    Login dengan email dan password.
    Kembalikan access_token dan refresh_token dari Supabase.
    """
    try:
        client = _anon_client()
        result = client.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })

        if not result.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email atau password salah."
            )

        return {
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token,
            "token_type": "bearer",
            "expires_in": result.session.expires_in,
            "user": {
                "id": result.user.id,
                "email": result.user.email,
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        msg = str(e).lower()
        if "invalid login credentials" in msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email atau password salah."
            )
        if "email not confirmed" in msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email belum dikonfirmasi. Cek inbox kamu."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Login gagal: {str(e)}"
        )


@router.post("/refresh")
async def refresh_token(body: RefreshRequest):
    """Perbarui access token menggunakan refresh token."""
    try:
        client = _anon_client()
        result = client.auth.refresh_session(body.refresh_token)

        if not result.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token tidak valid atau sudah kadaluarsa."
            )

        return {
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token,
            "token_type": "bearer",
            "expires_in": result.session.expires_in,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesi tidak valid. Silakan login kembali."
        )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(body: RefreshRequest):
    """Logout dan invalidate refresh token."""
    try:
        client = _anon_client()
        client.auth.sign_out()
    except Exception:
        pass


@router.post("/google")
async def google_auth(body: GoogleAuthRequest):
    """
    Exchange Google OAuth access token ke Supabase session.
    Digunakan oleh mobile app; web app redirect langsung via OAuth flow.
    """
    try:
        client = _anon_client()
        result = client.auth.sign_in_with_id_token({
            "provider": "google",
            "token": body.access_token,
        })

        if not result.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token Google tidak valid."
            )

        return {
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token,
            "token_type": "bearer",
            "expires_in": result.session.expires_in,
            "user": {
                "id": result.user.id,
                "email": result.user.email,
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Autentikasi Google gagal: {str(e)}"
        )
