"""Dynamic metadata backfiller.
Finds games missing summaries or images, searches Steam for match, and updates database.
"""
import asyncio
import json
import logging
import os
import httpx
import asyncpg
from typing import Optional
from dotenv import load_dotenv
from pathlib import Path

# Load env variables explicitly
backend_dir = Path(__file__).resolve().parent
load_dotenv(dotenv_path=backend_dir / ".env")
DATABASE_URL = os.getenv("DATABASE_URL")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

async def search_steam_by_title(client: httpx.AsyncClient, title: str) -> Optional[str]:
    """Search Steam store API by title and return the best matching App ID."""
    try:
        # Clean title slightly to remove tags / delimiters for better search matching
        clean_title = title.split(" - ")[0].split(": ")[0].split(" (")[0].strip()
        
        resp = await client.get(
            "https://store.steampowered.com/api/storesearch/",
            params={"term": clean_title, "l": "english", "cc": "US"},
            timeout=10.0
        )
        if resp.status_code != 200:
            return None
            
        data = resp.json()
        if data.get("success") and data.get("items"):
            # Rank matches
            for item in data["items"]:
                item_name = item["name"].lower()
                # Exact or highly close match
                if item_name == title.lower() or clean_title.lower() in item_name or item_name in clean_title.lower():
                    return str(item["id"])
    except Exception as e:
        logger.warning(f"Error searching Steam for '{title}': {e}")
    return None

async def backfill():
    import sys
    from pathlib import Path
    backend_dir = Path(__file__).resolve().parent
    sys.path.append(str(backend_dir))
    import steam_api

    logger.info(f"Connecting to database...")
    conn = await asyncpg.connect(DATABASE_URL)
    
    # Select games missing summary
    rows = await conn.fetch(
        "SELECT id, title, cheapshark_id, steam_app_id, metadata FROM games WHERE metadata->>'summary' IS NULL OR metadata->>'summary' = ''"
    )
    logger.info(f"Found {len(rows)} games with incomplete metadata.")
    
    async with httpx.AsyncClient(headers={"User-Agent": "Antigravity/1.0"}, timeout=15.0) as client:
        updated_count = 0
        for i, row in enumerate(rows):
            game_id = row["id"]
            title = row["title"]
            steam_app_id = row["steam_app_id"]
            metadata = json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"]
            
            logger.info(f"[{i+1}/{len(rows)}] Auditing: '{title}' (ID: {game_id})")
            
            # 1. If steam_app_id is missing, search Steam
            if not steam_app_id:
                logger.info(f"  - Missing Steam App ID. Searching Steam...")
                found_id = await search_steam_by_title(client, title)
                if found_id:
                    steam_app_id = found_id
                    await conn.execute("UPDATE games SET steam_app_id = $1 WHERE id = $2", steam_app_id, game_id)
                    logger.info(f"    ✓ Found Steam App ID: {steam_app_id}")
                else:
                    logger.info(f"    ✗ No matching Steam App ID found.")
            
            # 2. If steam_app_id is now available, fetch details
            if steam_app_id:
                logger.info(f"  - Fetching metadata from Steam for App ID: {steam_app_id}...")
                steam_data = await steam_api.get_app_details(steam_app_id)
                if steam_data:
                    # Merge steam_data into existing metadata
                    for k, v in steam_data.items():
                        # Preserve historical low if it was already cached
                        if k == "historical_low" and "historical_low" in metadata:
                            continue
                        metadata[k] = v
                        
                    await conn.execute(
                        "UPDATE games SET metadata = $1 WHERE id = $2",
                        json.dumps(metadata), game_id
                    )
                    logger.info(f"    ✓ Successfully backfilled description and cover images.")
                    updated_count += 1
                else:
                    logger.warning(f"    ✗ Failed to load Steam app details (rate limit or product not active).")
                
                # Respect rate limit of Steam store API
                await asyncio.sleep(0.6)
            else:
                # No steam app ID exists, let's enrich with CheapShark thumbnail if missing
                if not metadata.get("image_url") and row.get("cheapshark_id"):
                    metadata["image_url"] = f"https://www.cheapshark.com/img/games/thumbs/{row['cheapshark_id']}.jpg"
                    await conn.execute(
                        "UPDATE games SET metadata = $1 WHERE id = $2",
                        json.dumps(metadata), game_id
                    )
                    logger.info(f"    ✓ Backfilled CheapShark default thumbnail.")
                    updated_count += 1
                    
    logger.info(f"Backfill complete! Updated {updated_count} games.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(backfill())
