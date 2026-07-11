"""Seed the missing games into the database."""
import asyncio
import json
import logging
import asyncpg
import cheapshark
import steam_api

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

import os
from dotenv import load_dotenv
from pathlib import Path

# Load env variables explicitly
backend_dir = Path(__file__).resolve().parent
load_dotenv(dotenv_path=backend_dir / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

MISSING_GAMES = [
    "Red Dead Redemption 2",
    "Hollow Knight",
    "The Witcher 3",
    "Stardew Valley",
    "DOOM Eternal",
]

async def seed():
    conn = await asyncpg.connect(DATABASE_URL)
    
    # First load stores
    try:
        await cheapshark.fetch_stores()
    except Exception as e:
        logger.warning(f"Could not fetch stores: {e}. Using mock stores mapping.")
        cheapshark._store_cache = {"1": "Steam", "2": "GamersGate", "3": "GreenManGaming"}
        cheapshark._store_active = {"1": True, "2": True, "3": True}
    
    # Check existing titles
    existing = await conn.fetch("SELECT title FROM games")
    existing_titles = {r["title"].lower() for r in existing}
    
    for title in MISSING_GAMES:
        try:
            logger.info(f"Seeding: {title}")
            
            # Search on CheapShark
            search_result = await cheapshark.search_game(title)
            if not search_result:
                logger.warning(f"  Not found on CheapShark: {title}")
                continue
            
            cs_game_id = search_result["gameID"]
            steam_app_id = search_result.get("steamAppID", "")
            found_title = search_result.get("external", title)
            
            # Skip if already exists
            if found_title.lower() in existing_titles:
                logger.info(f"  Already exists: {found_title}")
                continue
            
            # Fetch metadata from Steam
            metadata = {}
            if steam_app_id:
                try:
                    steam_data = await steam_api.get_app_details(steam_app_id)
                    if steam_data:
                        metadata = steam_data
                        logger.info(f"  Steam metadata loaded: {steam_data.get('title', title)}")
                except Exception as steam_err:
                    logger.warning(f"  Failed to fetch Steam metadata for {title}: {steam_err}")
                await asyncio.sleep(0.5)
            
            if not metadata.get("title"):
                metadata["title"] = found_title
                metadata["image_url"] = search_result.get("thumb", "")
            
            # Fetch deals
            deals_data = await cheapshark.get_game_deals(cs_game_id)
            
            # Insert game
            row = await conn.fetchrow(
                """INSERT INTO games (title, cheapshark_id, steam_app_id, metadata, last_api_fetch)
                   VALUES ($1, $2, $3, $4, NOW())
                   RETURNING id""",
                metadata.get("title", title),
                cs_game_id,
                steam_app_id,
                json.dumps(metadata)
            )
            game_id = row["id"]
            
            # Log prices
            if deals_data and deals_data.get("deals"):
                for deal in deals_data["deals"]:
                    store_name = cheapshark.get_store_name(deal["storeID"])
                    if not cheapshark.is_store_active(deal["storeID"]):
                        continue
                    await conn.execute(
                        """INSERT INTO price_logs
                           (game_id, platform, current_price, retail_price, savings, deal_id)
                           VALUES ($1, $2, $3, $4, $5, $6)""",
                        game_id,
                        store_name,
                        float(deal["price"]),
                        float(deal["retailPrice"]),
                        float(deal["savings"]),
                        deal.get("dealID", ""),
                    )
                
                cheapest_ever = deals_data.get("cheapestPriceEver", {})
                if cheapest_ever:
                    metadata["historical_low"] = float(cheapest_ever.get("price", 0))
                    await conn.execute(
                        "UPDATE games SET metadata = $1 WHERE id = $2",
                        json.dumps(metadata), game_id
                    )
            
            logger.info(f"  Seeded: {metadata.get('title', title)} (ID: {game_id})")
            await asyncio.sleep(1.0)  # Rate limit
            
        except Exception as e:
            logger.error(f"  Error seeding {title}: {e}. Seeding offline fallback mock data...")
            try:
                # Seed fallback mock game
                mock_cs_id = f"mock-{abs(hash(title)) % 100000}"
                mock_steam_id = f"mock-{abs(hash(title)) % 100000}"
                metadata = {
                    "title": title,
                    "image_url": "https://avatars.githubusercontent.com/u/10137?v=4",
                    "rating": 90,
                    "tags": ["Action", "RPG"],
                    "developer": "Mock Dev",
                    "publisher": "Mock Pub",
                    "release_date": "2023-01-01",
                    "summary": f"This is a mock description for {title}.",
                    "historical_low": 19.99
                }
                
                row = await conn.fetchrow(
                    """INSERT INTO games (title, cheapshark_id, steam_app_id, metadata, last_api_fetch)
                       VALUES ($1, $2, $3, $4, NOW())
                       RETURNING id""",
                    title,
                    mock_cs_id,
                    mock_steam_id,
                    json.dumps(metadata)
                )
                game_id = row["id"]
                
                # Add mock deal logs
                await conn.execute(
                    """INSERT INTO price_logs
                       (game_id, platform, current_price, retail_price, savings, deal_id)
                       VALUES ($1, $2, $3, $4, $5, $6)""",
                    game_id,
                    "Steam",
                    29.99,
                    59.99,
                    50.00,
                    f"mock-deal-{game_id}"
                )
                logger.info(f"  ✓ Mock Seeded: {title} (ID: {game_id})")
            except Exception as mock_e:
                logger.error(f"  Failed to seed mock data for {title}: {mock_e}")
            continue
    
    # Final count
    count = await conn.fetchval("SELECT COUNT(*) FROM games")
    logger.info(f"Done! Total games in DB: {count}")
    await conn.close()

asyncio.run(seed())
