"""
Catat.in -- Database Setup Script
Jalankan sekali untuk apply migration ke Supabase cloud.

Cara pakai:
  cd backend
  venv/Scripts/python setup_db.py

Jika database password tersedia:
  $env:DB_PASSWORD="<password>"  (PowerShell)
  export DB_PASSWORD="<password>"  (bash)
"""

import os
import sys
import httpx
from pathlib import Path

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://xqvtsgfakuehjwdmenuw.supabase.co")
SERVICE_ROLE_KEY = os.environ.get(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxdnRzZ2Zha3VlaGp3ZG1lbnV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA5MDA1NywiZXhwIjoyMDkxNjY2MDU3fQ.FloOMsnFJi59URDeNnGGsJ_ti1Cn6rQcDZ09-tacTzo"
)
PROJECT_REF = "xqvtsgfakuehjwdmenuw"
SUPABASE_ACCESS_TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")

MIGRATION_FILE = Path(__file__).parent / "supabase" / "migrations" / "002_missing_tables.sql"


def check_tables():
    """Cek tabel mana yang sudah ada dan mana yang belum."""
    from supabase import create_client
    client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

    tables = ["profiles", "wallets", "transactions", "budgets",
              "bill_reminders", "groups", "group_members", "import_logs"]
    missing = []

    print("\nStatus tabel Supabase:")
    for table in tables:
        try:
            client.table(table).select("id").limit(1).execute()
            print(f"  [OK] {table}")
        except Exception:
            print(f"  [!!] {table}  <- BELUM ADA")
            missing.append(table)

    return missing


def apply_via_management_api(sql: str) -> bool:
    """Coba apply SQL via Supabase Management API (butuh SUPABASE_ACCESS_TOKEN)."""
    if not SUPABASE_ACCESS_TOKEN:
        return False

    print("\nMencoba apply via Management API...")
    resp = httpx.post(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        headers={
            "Authorization": f"Bearer {SUPABASE_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        },
        json={"query": sql},
        timeout=30,
    )

    if resp.status_code == 200:
        print("  [OK] Berhasil!")
        return True
    else:
        print(f"  [!!] Gagal ({resp.status_code}): {resp.text[:100]}")
        return False


def apply_via_direct_connection(sql: str) -> bool:
    """Coba apply SQL via koneksi langsung ke PostgreSQL (butuh DB_PASSWORD)."""
    if not DB_PASSWORD:
        return False

    try:
        import psycopg2
    except ImportError:
        print("  psycopg2 belum terinstall. Jalankan: pip install psycopg2-binary")
        return False

    host = f"db.{PROJECT_REF}.supabase.co"
    print(f"\nMencoba koneksi langsung ke {host}...")

    try:
        conn = psycopg2.connect(
            host=host,
            port=5432,
            database="postgres",
            user="postgres",
            password=DB_PASSWORD,
            connect_timeout=10,
        )
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(sql)
        conn.close()
        print("  [OK] Berhasil!")
        return True
    except Exception as e:
        print(f"  [!!] Gagal: {e}")
        return False


def print_manual_instructions(sql_path: str):
    """Tampilkan instruksi cara apply SQL secara manual."""
    print("\n" + "=" * 60)
    print("CARA APPLY MIGRATION MANUAL:")
    print("=" * 60)
    print(f"""
1. Buka Supabase Studio:
   https://supabase.com/dashboard/project/xqvtsgfakuehjwdmenuw/editor

2. Klik tab 'SQL Editor'

3. Buat query baru dan buka file SQL berikut, lalu paste isinya:
   {sql_path}

4. Klik 'Run' (atau tekan Ctrl+Enter)

Setelah itu jalankan script ini lagi untuk verifikasi.
""")


def main():
    print("=" * 60)
    print("Catat.in -- Database Setup")
    print("=" * 60)

    # Cek status tabel
    missing = check_tables()

    if not missing:
        print("\n[OK] Semua tabel sudah ada! Database siap digunakan.")
        return 0

    print(f"\n{len(missing)} tabel belum ada: {', '.join(missing)}")

    # Baca migration SQL
    if not MIGRATION_FILE.exists():
        print(f"File migration tidak ditemukan: {MIGRATION_FILE}")
        return 1

    sql = MIGRATION_FILE.read_text(encoding="utf-8")

    # Coba cara otomatis
    applied = False

    if SUPABASE_ACCESS_TOKEN:
        applied = apply_via_management_api(sql)

    if not applied and DB_PASSWORD:
        applied = apply_via_direct_connection(sql)

    if not applied:
        # Tampilkan instruksi manual
        print_manual_instructions(str(MIGRATION_FILE))
        print("\nSetelah apply SQL, jalankan script ini lagi untuk verifikasi.")
        return 1

    # Verifikasi ulang
    print("\nVerifikasi setelah migration...")
    missing_after = check_tables()
    if not missing_after:
        print("\n[OK] Semua tabel berhasil dibuat! Database siap digunakan.")
        return 0
    else:
        print(f"\n[!!] Masih ada tabel yang belum ada: {', '.join(missing_after)}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
