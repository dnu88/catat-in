from supabase import create_client, Client
from app.core.config import settings

async def init_db():
    """
    Fungsi untuk menginisialisasi koneksi ke Supabase saat aplikasi berjalan.
    """
    try:
        # Membuat koneksi menggunakan URL dan Key dari file .env
        supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        print("Berhasil menghubungkan aplikasi ke database Supabase!")
        return supabase
    except Exception as e:
        print(f"Gagal terhubung ke database: {e}")