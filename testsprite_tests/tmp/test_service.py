import sys, asyncio
sys.path.insert(0, r"C:\Users\ThinkPad\catat-in-dev-setup\catat-in\backend")

from dotenv import load_dotenv
load_dotenv(r"C:\Users\ThinkPad\catat-in-dev-setup\catat-in\backend\.env")

from app.services.ai_service import extract_transaction_from_text

async def main():
    try:
        result = await extract_transaction_from_text("Gaji masuk 5000000 dari kantor via BCA pada 2026-05-01")
        print("SUCCESS:", result)
    except RuntimeError as e:
        print("CAUGHT RuntimeError:", e)
    except Exception as e:
        print(f"UNCAUGHT {type(e).__name__}: {e}")

asyncio.run(main())
