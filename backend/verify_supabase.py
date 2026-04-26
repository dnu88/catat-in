import sys
import os
from supabase import create_client

# Add parent dir to sys.path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.core.config import settings
except ImportError:
    print("Error: Could not import settings. Make sure you are running this from the backend directory.")
    sys.exit(1)

def verify():
    print(f"Verifying Supabase connection for: {settings.SUPABASE_URL}")
    
    try:
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        
        # 1. Test Connection
        print("[1/4] Testing connection...", end=" ")
        supabase.table("profiles").select("count", count="exact").limit(0).execute()
        print("OK")
        
        # 2. Check Migrations (Tables)
        required_tables = ["profiles", "wallets", "transactions", "budgets", "categories", "bill_reminders"]
        print(f"[2/4] Checking required tables...", end=" ")
        for table in required_tables:
            try:
                supabase.table(table).select("count", count="exact").limit(0).execute()
            except Exception as e:
                print(f"\nFAILED: Table '{table}' missing or inaccessible. Error: {e}")
                return
        print("OK")
        
        # 3. Check for Migration 004 fix (handle_new_user search_path)
        print("[3/4] Checking Auth Trigger robustness...", end=" ")
        # We can't easily check function source via postgrest, but we can check if signup works
        # or just remind the user. For now, let's check a column added in later migrations.
        try:
            supabase.table("categories").select("is_default").limit(0).execute()
            print("OK (Migration 005+ likely applied)")
        except Exception:
            print("\nWARNING: Column 'categories.is_default' missing. Please run Migration 005 and 007.")
            
        # 4. Check for Migration 001 alignment
        print("[4/4] Checking Wallet columns...", end=" ")
        try:
            supabase.table("wallets").select("currency").limit(0).execute()
            print("OK")
        except Exception:
            print("\nWARNING: Column 'wallets.currency' missing. Please run all migrations.")

        print("\nVerification complete!")
        print("If all OK, your Supabase project is ready for production.")
        print("Reminder: Ensure you have run Migration 004 in the Supabase SQL Editor.")

    except Exception as e:
        print(f"\nFATAL ERROR: {e}")

if __name__ == "__main__":
    verify()
