from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

# Global client instances
_supabase: Optional[Client] = None
_supabase_anon: Optional[Client] = None

async def init_db() -> Client:
    """
    Inisialisasi koneksi ke Supabase saat aplikasi berjalan.
    """
    global _supabase, _supabase_anon
    try:
        # Service role client (admin access)
        _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        
        # Anon client (public access)
        _supabase_anon = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        
        print("Berhasil menghubungkan aplikasi ke database Supabase!")
        return _supabase
    except Exception as e:
        print(f"Gagal terhubung ke database: {e}")
        raise e

def get_supabase() -> Client:
    """Helper untuk mendapatkan client dengan service role key."""
    if _supabase is None:
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _supabase

def get_supabase_anon() -> Client:
    """Helper untuk mendapatkan client dengan anon key."""
    if _supabase_anon is None:
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _supabase_anon