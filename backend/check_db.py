"""Quick DB check script."""
import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect('postgresql://postgres:postgres123@localhost:5432/antigravity')
    rows = await conn.fetch('SELECT id, title FROM games ORDER BY id')
    for r in rows:
        print(f"  {r['id']}: {r['title']}")
    print(f"Total: {len(rows)}")
    await conn.close()

asyncio.run(check())
