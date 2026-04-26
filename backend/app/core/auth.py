from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client
from app.core.config import settings

_bearer = HTTPBearer()


def _service_client():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
):
    token = credentials.credentials
    try:
        client = _service_client()
        response = client.auth.get_user(token)
        user = response.user
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token tidak valid")
        return {"user_id": user.id, "email": user.email}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token tidak valid atau sudah kadaluarsa")


def require_premium(current_user: dict = Depends(get_current_user)):
    client = _service_client()
    result = client.table("profiles").select("plan_type").eq("id", current_user["user_id"]).single().execute()
    if not result.data or result.data.get("plan_type") != "premium":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Fitur ini membutuhkan akun Premium")
    return current_user
