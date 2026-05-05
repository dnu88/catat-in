import sys
sys.path.insert(0, r"C:\Users\ThinkPad\catat-in-dev-setup\catat-in\backend")

from dotenv import load_dotenv
load_dotenv(r"C:\Users\ThinkPad\catat-in-dev-setup\catat-in\backend\.env")

import os
print("ANTHROPIC_API_KEY set:", bool(os.getenv("ANTHROPIC_API_KEY")))
print("ANTHROPIC_MODEL:", os.getenv("ANTHROPIC_MODEL"))

import asyncio
import anthropic

async def test():
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    try:
        resp = await client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-haiku-latest"),
            max_tokens=50,
            messages=[{"role": "user", "content": "Say hi"}]
        )
        print("API OK:", resp.content[0].text)
    except Exception as e:
        print(f"API ERROR ({type(e).__name__}): {e}")

asyncio.run(test())
