"""Quick DB check script."""
import os
import asyncio
import asyncpg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def check():
    conn = await asyncpg.connect(DATABASE_URL)
    rows = await conn.fetch('SELECT id, title FROM games ORDER BY id')
    for r in rows:
        print(f"  {r['id']}: {r['title']}")
    print(f"Total: {len(rows)}")
    await conn.close()

asyncio.run(check())
