import os
import json
import asyncio
import logging
import hmac
import hashlib
import asyncpg
import time
import uuid
from collections import defaultdict
from typing import List, Dict, Optional
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from fastapi import FastAPI, BackgroundTasks, Query, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import httpx

from analytics import calculate_price_stability, detect_price_surge, calculate_value_score
import cheapshark
import steam_api

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("CRITICAL CONFIGURATION ERROR: DATABASE_URL environment variable is not set.")

DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
DISCORD_REDIRECT_URI = os.getenv("DISCORD_REDIRECT_URI")

ENV = os.getenv("ENV", "production").lower()
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    if ENV == "production":
        raise ValueError("CRITICAL CONFIGURATION ERROR: JWT_SECRET environment variable is not set in production.")
    else:
        import secrets
        JWT_SECRET = secrets.token_hex(32)
        logger.warning("JWT_SECRET environment variable is not set. A secure random key has been generated for this development session.")

# Cache TTL: how often a game *may* be re-fetched from CheapShark (lower = fresher, but more API pressure).
CACHE_TTL_MINUTES = int(os.getenv("CACHE_TTL_MINUTES", "20"))
MIN_GAMES = int(os.getenv("MIN_GAMES", "60"))

# Max live CheapShark refreshes per /get-market-status call (spreads load; avoids 429). 0 = no limit.
REFRESH_BUDGET_PER_REQUEST = int(os.getenv("REFRESH_BUDGET_PER_REQUEST", "20"))

# The games to track — title used for CheapShark search
TRACKED_GAMES = [
    "Cyberpunk 2077",
    "Elden Ring",
    "Red Dead Redemption 2",
    "Hades",
    "Baldur's Gate 3",
    "God of War",
    "Hollow Knight",
    "The Witcher 3: Wild Hunt",
    "Stardew Valley",
    "DOOM Eternal",
]

app = FastAPI(title="Project GameSurge API")

cors_env = os.getenv("CORS_ALLOWED_ORIGINS")
if cors_env:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_env.split(",")]
else:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://game-surge.vercel.app"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Security Headers Middleware ──────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    return response


# ─── Global Error Handler with Correlation IDs ────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    correlation_id = str(uuid.uuid4())
    logger.error(f"Unhandled exception [Correlation ID: {correlation_id}]: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred.",
            "correlation_id": correlation_id
        }
    )


# ─── Rate Limiter for Authentication ──────────────────────────────────────────
login_attempts = defaultdict(list)

def rate_limit_login(request: Request):
    ip = request.client.host
    now = time.time()
    login_attempts[ip] = [t for t in login_attempts[ip] if now - t < 60]
    if len(login_attempts[ip]) >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please try again in a minute."
        )
    login_attempts[ip].append(now)

# ─── Connection Pool ─────────────────────────────────────────────────────────
pool: asyncpg.Pool = None


@app.on_event("startup")
async def startup():
    global pool
    # Enforce SSL/TLS for remote databases (e.g. Neon) while keeping it optional for local connections
    is_local_host = any(h in DATABASE_URL for h in ["localhost", "127.0.0.1", "@db:"])
    db_ssl = None if is_local_host else "require"
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10, ssl=db_ssl)
    async with pool.acquire() as conn:
        # Create tables (with new columns)
        schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
        with open(schema_path, "r") as f:
            schema = f.read()
        # Execute each statement separately to handle IF NOT EXISTS gracefully
        for statement in schema.split(";"):
            statement = statement.strip()
            if statement:
                try:
                    await conn.execute(statement)
                except Exception as e:
                    logger.warning(f"Schema statement skipped: {e}")

        # Migrate: add new columns if they don't exist (for existing DBs)
        for col, coltype in [
            ("cheapshark_id", "VARCHAR(20)"),
            ("steam_app_id", "VARCHAR(20)"),
            ("last_api_fetch", "TIMESTAMP WITH TIME ZONE"),
        ]:
            try:
                await conn.execute(f"ALTER TABLE games ADD COLUMN IF NOT EXISTS {col} {coltype}")
            except Exception:
                pass
        for col, coltype in [
            ("retail_price", "DECIMAL(10, 2)"),
            ("savings", "DECIMAL(5, 2)"),
            ("deal_id", "TEXT"),
        ]:
            try:
                await conn.execute(f"ALTER TABLE price_logs ADD COLUMN IF NOT EXISTS {col} {coltype}")
            except Exception:
                pass

    # Load CheapShark store mapping (non-fatal — will retry lazily on first request)
    try:
        await cheapshark.fetch_stores()
    except Exception as e:
        logger.warning(f"Could not load stores on startup (will retry lazily): {e}")

    # Seed and expand database in the background to avoid blocking server start
    async def bg_seed_and_expand():
        try:
            async with pool.acquire() as bg_conn:
                db_count = await bg_conn.fetchval("SELECT COUNT(*) FROM games")
                if db_count == 0:
                    logger.info("Empty database — seeding in background...")
                    await seed_games_from_api(bg_conn)
                else:
                    logger.info(f"Database connected — {db_count} games found")
                    if db_count < MIN_GAMES:
                        logger.info(f"Expanding game catalog to at least {MIN_GAMES} titles in background...")
                        await ensure_minimum_games(bg_conn, MIN_GAMES)
        except Exception as bg_e:
            logger.error(f"Background database initialization failed: {bg_e}")

    asyncio.create_task(bg_seed_and_expand())


@app.on_event("shutdown")
async def shutdown():
    global pool
    # Close Redis connection pool
    await cheapshark.close_redis()
    if pool:
        await pool.close()


# ─── Seed from Real APIs ─────────────────────────────────────────────────────

async def seed_games_from_api(conn):
    """
    Search for each tracked game on CheapShark, fetch metadata from Steam,
    and populate the database with real data.
    """
    for title in TRACKED_GAMES:
        await seed_one_game(conn, title)

    await ensure_minimum_games(conn, MIN_GAMES)

    logger.info("✅ Database seeding complete with real API data")


async def seed_one_game(conn, title: str) -> bool:
    """Seed one game by title. Returns True if inserted, else False."""
    try:
        logger.info(f"Seeding: {title}")

        existing = await conn.fetchrow(
            "SELECT id FROM games WHERE LOWER(title) = LOWER($1)",
            title,
        )
        if existing:
            return False

        search_result = await cheapshark.search_game(title)
        if not search_result:
            logger.warning(f"  ⚠ Not found on CheapShark: {title}")
            return False

        cs_game_id = search_result["gameID"]
        steam_app_id = search_result.get("steamAppID", "")

        dup_cs = await conn.fetchrow(
            "SELECT id FROM games WHERE cheapshark_id = $1",
            cs_game_id,
        )
        if dup_cs:
            return False

        metadata = {}
        if steam_app_id:
            steam_data = await steam_api.get_app_details(steam_app_id)
            if steam_data:
                metadata = steam_data
                logger.info(f"  ✓ Steam metadata loaded: {steam_data.get('title', title)}")
            await asyncio.sleep(0.2)

        if not metadata.get("title"):
            metadata["title"] = search_result.get("external", title)
            metadata["image_url"] = search_result.get("thumb", "")

        deals_data = await cheapshark.get_game_deals(cs_game_id)

        row = await conn.fetchrow(
            """INSERT INTO games (title, cheapshark_id, steam_app_id, metadata, last_api_fetch)
               VALUES ($1, $2, $3, $4, NOW())
               RETURNING id""",
            metadata.get("title", title),
            cs_game_id,
            steam_app_id,
            json.dumps(metadata),
        )
        game_id = row["id"]

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
                    json.dumps(metadata),
                    game_id,
                )

        logger.info(f"  ✓ Seeded: {metadata.get('title', title)} (ID: {game_id}, CS: {cs_game_id})")
        await asyncio.sleep(0.25)
        return True
    except Exception as e:
        logger.error(f"  ✗ Error seeding {title}: {e}")
        return False


async def ensure_minimum_games(conn, target_count: int):
    """Expand DB catalog until at least target_count games exist."""
    if target_count <= 0:
        return

    current = await conn.fetchval("SELECT COUNT(*) FROM games")
    if current >= target_count:
        return

    needed = target_count - current
    logger.info(f"Need {needed} more games to reach target of {target_count}")

    candidate_titles = await cheapshark.discover_game_titles(limit=max(needed * 3, 80))
    inserted = 0
    for title in candidate_titles:
        if inserted >= needed:
            break
        created = await seed_one_game(conn, title)
        if created:
            inserted += 1

    final_count = await conn.fetchval("SELECT COUNT(*) FROM games")
    logger.info(f"Catalog expansion complete: {final_count} games in database")


# ─── Price Refresh Logic ─────────────────────────────────────────────────────

def _is_price_cache_expired(last_fetch) -> bool:
    now = datetime.now(timezone.utc)
    if last_fetch is None:
        return True
    lf = last_fetch.replace(tzinfo=timezone.utc if last_fetch.tzinfo is None else last_fetch.tzinfo)
    return (now - lf) > timedelta(minutes=CACHE_TTL_MINUTES)


async def refresh_game_prices(conn, game_row, allow_cheapshark: bool = True) -> List[Dict]:
    """
    Fetch fresh prices from CheapShark for a single game.
    Only calls the API if cached data is older than CACHE_TTL_MINUTES and allow_cheapshark is True.
    Returns the list of current deals/platforms.
    """
    game_id = game_row["id"]
    cs_id = game_row.get("cheapshark_id")
    last_fetch = game_row.get("last_api_fetch")

    cache_expired = _is_price_cache_expired(last_fetch)

    if cache_expired and cs_id and allow_cheapshark:
        try:
            logger.info(f"Refreshing prices for game {game_id} (CS ID: {cs_id})")
            deals_data = await cheapshark.get_game_deals(cs_id)

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

                # Update historical low if available
                cheapest_ever = deals_data.get("cheapestPriceEver", {})
                if cheapest_ever:
                    meta = json.loads(game_row["metadata"]) if isinstance(game_row["metadata"], str) else game_row["metadata"]
                    meta["historical_low"] = float(cheapest_ever.get("price", 0))
                    await conn.execute(
                        "UPDATE games SET metadata = $1 WHERE id = $2",
                        json.dumps(meta), game_id
                    )

            # ALWAYS update the fetch timestamp, regardless of whether deals were found
            await conn.execute(
                "UPDATE games SET last_api_fetch = NOW() WHERE id = $1",
                game_id
            )

        except Exception as e:
            logger.error(f"Error refreshing prices for game {game_id}: {e}")
            try:
                await conn.execute(
                    "UPDATE games SET last_api_fetch = NOW() WHERE id = $1",
                    game_id,
                )
                logger.warning(
                    "Applied cooldown for game %s after refresh failure (will use DB prices until TTL)",
                    game_id,
                )
            except Exception as inner:
                logger.error(f"Could not update last_api_fetch after refresh error: {inner}")

    elif cache_expired and cs_id and not allow_cheapshark:
        logger.debug(
            "Skipping live CheapShark refresh for game %s (budget); serving DB prices",
            game_id,
        )

    # Return latest prices from DB (grouped by platform, most recent per platform)
    return await get_latest_prices(conn, game_id)


async def get_latest_prices(conn, game_id: int) -> List[Dict]:
    """Get the most recent price for each platform from the database."""
    rows = await conn.fetch(
        """SELECT DISTINCT ON (platform)
              platform, current_price, retail_price, savings, deal_id, timestamp
           FROM price_logs
           WHERE game_id = $1
           ORDER BY platform, timestamp DESC""",
        game_id
    )
    return [dict(r) for r in rows]


async def get_price_history(conn, game_id: int, platform: str, limit: int = 14) -> List[float]:
    """Fetch price history for a specific platform from the DB."""
    rows = await conn.fetch(
        """SELECT current_price FROM price_logs
           WHERE game_id = $1 AND platform = $2
           ORDER BY timestamp DESC LIMIT $3""",
        game_id, platform, limit
    )
    return [float(r["current_price"]) for r in reversed(rows)]


# ─── Helper Functions ─────────────────────────────────────────────────────────

def extract_base_title(title: str) -> str:
    """Extract a base title prefix by splitting at common delimiters of editions and DLCs."""
    for delimiter in [" - ", ": ", " ("]:
        if delimiter in title:
            parts = title.split(delimiter)
            if parts[0].strip():
                return parts[0].strip()
    # Fallback: take the first 2 words if the title is multi-word
    words = title.split()
    if len(words) >= 2:
        return " ".join(words[:2])
    return title


def compute_buying_sentiment(best_price: float, historical_low: float, has_surge: bool) -> str:
    if has_surge:
        return "avoid"
    elif best_price <= historical_low * 1.05:
        return "buy"
    else:
        return "wait"


def compute_recommendation_score(rating: int, current_price: float, surge_detected: bool) -> float:
    if current_price <= 0:
        return rating * 10.0
    surge_penalty = 0.3 if surge_detected else 1.0
    return round((rating / current_price) * surge_penalty * 10, 2)


async def build_game_response(conn, game_row, latest_prices: List[Dict], lightweight: bool = False) -> Dict:
    """Build the API response for a single game with real price data.
    
    When lightweight=True, skips expensive 14-day price history lookups.
    This is used for the paginated listing endpoint to keep payloads small.
    """
    meta = json.loads(game_row["metadata"]) if isinstance(game_row["metadata"], str) else game_row["metadata"]

    best_deal = {"store": None, "price": float('inf')}
    any_surge = False
    platforms_data = []

    for price_row in latest_prices:
        store = price_row["platform"]
        current_price = float(price_row["current_price"])
        retail_price = float(price_row.get("retail_price") or current_price)
        savings = float(price_row.get("savings") or 0)
        deal_id = price_row.get("deal_id", "")

        if lightweight:
            # Lightweight mode: skip expensive DB lookups for history
            history = []
            historical_low = current_price
            surge_info = {"surge_detected": False, "surge_index": 0, "wma": current_price}
            stability = 0.0
            value_score = 50.0
            rec_score = compute_recommendation_score(
                meta.get("rating", 0), current_price, False
            )
        else:
            # Full mode: fetch 14-day history for analytics
            history = await get_price_history(conn, game_row["id"], store, 14)
            historical_low = min(history) if history else current_price
            surge_info = detect_price_surge(current_price, history)
            stability = calculate_price_stability(history)
            value_score = calculate_value_score(current_price, historical_low)
            rec_score = compute_recommendation_score(
                meta.get("rating", 0), current_price, surge_info["surge_detected"]
            )

        if surge_info["surge_detected"]:
            any_surge = True
        if current_price < best_deal["price"]:
            best_deal = {"store": store, "price": current_price}

        # Build store icon URL from deal's store ID
        store_icon = ""
        for sid, sname in cheapshark._store_cache.items():
            if sname == store:
                store_icon = cheapshark.get_store_icon_url(sid)
                break

        platform_entry = {
            "store": store,
            "current_price": current_price,
            "retail_price": retail_price,
            "savings": round(savings, 2),
            "deal_id": deal_id,
            "deal_url": cheapshark.get_deal_redirect_url(deal_id) if deal_id else "",
            "store_icon": store_icon,
            "surge_detected": surge_info["surge_detected"],
            "surge_index": surge_info["surge_index"],
            "wma": surge_info["wma"],
            "stability_std_dev": round(stability, 2),
            "value_score": round(value_score, 2),
            "recommendation_score": rec_score,
            "historical_low": round(historical_low, 2),
            "bonus_content": "",
        }

        # Only include 14-day history in full mode
        if not lightweight:
            platform_entry["historical_prices_14d"] = [round(p, 2) for p in history]

        platforms_data.append(platform_entry)

    # Sort platforms by price (cheapest first)
    platforms_data.sort(key=lambda p: p["current_price"])

    game_historical_low = meta.get("historical_low", best_deal.get("price", 0))
    sentiment = compute_buying_sentiment(
        best_deal["price"] if best_deal["price"] != float('inf') else 0,
        game_historical_low,
        any_surge
    )

    return {
        "game_id": game_row["id"],
        "title": game_row["title"],
        "tags": meta.get("tags", []),
        "developer": meta.get("developer", ""),
        "publisher": meta.get("publisher", ""),
        "release_date": meta.get("release_date", ""),
        "rating": meta.get("rating", 0),
        "summary": meta.get("summary", ""),
        "image_url": meta.get("image_url", ""),
        "header_url": meta.get("header_url", ""),
        "system_requirements": meta.get("system_requirements", {}),
        "availability": meta.get("platforms_available", {}),
        "historical_low": game_historical_low,
        "best_deal": best_deal,
        "platforms": platforms_data,
        "buying_sentiment": sentiment,
        "surge_recovery": False,  # Computed from price trend
    }


_bg_refresh_semaphore = asyncio.Semaphore(1)

async def background_refresh_task(games_to_refresh: List[Dict]):
    """Background task to fetch fresh prices without blocking the API response."""
    try:
        async with _bg_refresh_semaphore:
            for game_row in games_to_refresh:
                try:
                    async with pool.acquire() as conn:
                        await refresh_game_prices(conn, game_row, allow_cheapshark=True)
                except Exception as inner_e:
                    logger.error(f"Error refreshing game in background: {inner_e}")
                # Yield event loop and prevent API spam
                await asyncio.sleep(0.5)
    except Exception as e:
        logger.error(f"Background refresh task failed: {e}")


# ─── API Routes ───────────────────────────────────────────────────────────────

@app.get("/get-market-status")
async def get_market_status(
    background_tasks: BackgroundTasks,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(30, ge=1, le=100, description="Items per page"),
):
    """Aggregates live data from PostgreSQL + external APIs for all games.
    
    Supports server-side pagination to keep payloads small and fast.
    Returns lightweight responses (no 14-day history) for listings.
    """
    async with pool.acquire() as conn:
        # Fetch all games to filter out variations on the home page listing
        all_games_raw = await conn.fetch(
            "SELECT id, title, cheapshark_id, steam_app_id, metadata, last_api_fetch FROM games ORDER BY id"
        )

        # Group games by their base title prefix
        groups = {}
        for row in all_games_raw:
            base = extract_base_title(row["title"])
            if base not in groups:
                groups[base] = []
            groups[base].append(row)

        # Select the standard / best-matching game for each base title group
        filtered_games = []
        for base, rows in groups.items():
            best_match = None
            # 1. Look for a game whose title exactly matches the base title prefix (case insensitive)
            for r in rows:
                if r["title"].strip().lower() == base.lower():
                    best_match = r
                    break
            # 2. Fallback: Select the one with the shortest title (base game or smallest DLC title)
            if not best_match:
                best_match = min(rows, key=lambda r: len(r["title"]))
            filtered_games.append(best_match)

        # Re-sort the filtered games by their database ID to keep consistent sorting
        filtered_games.sort(key=lambda x: x["id"])

        total_count = len(filtered_games)
        offset = (page - 1) * limit
        games = filtered_games[offset : offset + limit]

        # Background refresh: pick stalest games across the ENTIRE catalog, not just this page
        if REFRESH_BUDGET_PER_REQUEST > 0:
            all_games = await conn.fetch(
                "SELECT id, title, cheapshark_id, steam_app_id, metadata, last_api_fetch FROM games ORDER BY last_api_fetch ASC NULLS FIRST LIMIT $1",
                REFRESH_BUDGET_PER_REQUEST
            )
            stale_games = [g for g in all_games if _is_price_cache_expired(g["last_api_fetch"])]
            if stale_games:
                stale_games_dicts = [dict(g) for g in stale_games]
                background_tasks.add_task(background_refresh_task, stale_games_dicts)

        results = []
        for game_row in games:
            latest_prices = await refresh_game_prices(conn, game_row, allow_cheapshark=False)
            if latest_prices:
                response = await build_game_response(conn, game_row, latest_prices, lightweight=True)
                results.append(response)

    return {
        "status": "success",
        "data": results,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "total_pages": (total_count + limit - 1) // limit,
        },
    }


@app.get("/game/{game_id}")
async def get_game_details(game_id: int, background_tasks: BackgroundTasks):
    """Returns details for a single game by ID with real price data."""
    async with pool.acquire() as conn:
        game_row = await conn.fetchrow(
            "SELECT id, title, cheapshark_id, steam_app_id, metadata, last_api_fetch FROM games WHERE id = $1",
            game_id
        )
        if not game_row:
            return {"status": "error", "message": "Game not found"}

        if _is_price_cache_expired(game_row["last_api_fetch"]):
            background_tasks.add_task(background_refresh_task, [dict(game_row)])

        latest_prices = await refresh_game_prices(conn, game_row, allow_cheapshark=False)
        if not latest_prices:
            return {"status": "error", "message": "No price data available"}

        response = await build_game_response(conn, game_row, latest_prices)

        # Fetch related variations dynamically
        base_title = extract_base_title(game_row["title"])
        related_variations = []
        if len(base_title) >= 3:
            related_rows = await conn.fetch(
                """
                SELECT g.id, g.title, g.metadata,
                       (SELECT MIN(current_price) FROM price_logs WHERE game_id = g.id) as best_price
                FROM games g
                WHERE g.title ILIKE $1 AND g.id != $2
                LIMIT 6
                """,
                f"{base_title}%", game_row["id"]
            )
            for r in related_rows:
                r_meta = json.loads(r["metadata"]) if isinstance(r["metadata"], str) else r["metadata"]
                related_variations.append({
                    "game_id": r["id"],
                    "title": r["title"],
                    "image_url": r_meta.get("image_url") or r_meta.get("header_url") or "",
                    "best_price": float(r["best_price"]) if r["best_price"] is not None else None
                })
        response["related_variations"] = related_variations

        return {"status": "success", "data": response}


@app.post("/refresh")
async def force_refresh():
    """Force refresh all game prices from external APIs."""
    async with pool.acquire() as conn:
        # Reset all cache timestamps to force refresh
        await conn.execute("UPDATE games SET last_api_fetch = NULL")
    return {"status": "success", "message": "Cache cleared. Next request will fetch fresh data."}



@app.get("/games/count")
async def games_count():
    """Returns the total number of games in the database."""
    async with pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM games")
    return {"total": count}


@app.get("/games")
async def get_all_games():
    """Returns a list of all games with their best current deals (lightweight)."""
    async with pool.acquire() as conn:
        game_rows = await conn.fetch(
            "SELECT id, title, cheapshark_id, steam_app_id, metadata, last_api_fetch FROM games ORDER BY id"
        )
        
        results = []
        for row in game_rows:
            latest_prices = await refresh_game_prices(conn, row, allow_cheapshark=False)
            if latest_prices:
                response = await build_game_response(conn, row, latest_prices, lightweight=True)
                results.append(response)
        return results


@app.get("/health")
def health_check():
    # reload trigger comment
    return {"status": "healthy", "database": "postgresql", "data_source": "CheapShark + Steam"}


# ─── Hybrid Authentication & Database Watchlist Persistence ────────────────

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict:
    """FastAPI Dependency to authenticate and fetch the current user using HMAC validation."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    token = authorization.replace("Bearer ", "").strip()
    
    # Secure token verification using HMAC-SHA256
    try:
        user_id_str, signature = token.split(".", 1)
        user_id = int(user_id_str)
        
        expected_sig = hmac.new(
            JWT_SECRET.encode(),
            user_id_str.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected_sig):
            raise HTTPException(status_code=401, detail="Invalid session signature")
    except Exception:
        # Fallback compatibility check for active sessions/mock credentials
        if token.startswith("mock-token-for-user-"):
            try:
                user_id = int(token.replace("mock-token-for-user-", ""))
            except ValueError:
                raise HTTPException(status_code=401, detail="Invalid token payload")
        else:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        
    async with pool.acquire() as conn:
        user_row = await conn.fetchrow(
            "SELECT id, username, display_name, avatar_url, auth_provider FROM users WHERE id = $1",
            user_id
        )
        if not user_row:
            raise HTTPException(status_code=401, detail="User not found")
        return dict(user_row)


class LoginRequest(BaseModel):
    provider: str
    access_token: Optional[str] = None
    openid_params: Optional[Dict[str, str]] = None

class SyncItem(BaseModel):
    game_id: int
    target_price: float

class SyncRequest(BaseModel):
    watchlist: List[SyncItem]

class AddItemRequest(BaseModel):
    game_id: int
    target_price: float


@app.get("/auth/config")
async def get_auth_config():
    """Dynamically serve social provider Client IDs securely from backend environment."""
    return {
        "status": "success",
        "discord_client_id": DISCORD_CLIENT_ID,
        "discord_redirect_uri": DISCORD_REDIRECT_URI
    }


@app.post("/auth/login")
async def auth_login(req: LoginRequest, request: Request):
    """Frictionless social sign-in simulator or live Discord OAuth2 token exchange."""
    rate_limit_login(request)
    provider = req.provider.strip().lower()
    
    if provider == "discord" and req.access_token:
        try:
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    "https://discord.com/api/users/@me",
                    headers={"Authorization": f"Bearer {req.access_token}"}
                )
                if res.status_code != 200:
                    raise HTTPException(status_code=400, detail="Failed to fetch Discord profile. Token may be expired.")
                discord_user = res.json()
                username = f"discord_{discord_user['id']}"
                display_name = discord_user.get("global_name") or discord_user["username"]
                avatar_hash = discord_user.get("avatar")
                if avatar_hash:
                    avatar_url = f"https://cdn.discordapp.com/avatars/{discord_user['id']}/{avatar_hash}.png"
                else:
                    avatar_url = "https://avatars.githubusercontent.com/u/583231?v=4"
        except Exception:
            logger.error("Discord API token exchange error: Profile retrieval failed.")
            raise HTTPException(status_code=400, detail="Discord authentication failed.")
    elif provider == "steam" and req.openid_params:
        try:
            # 1. Validate OpenID params with Steam
            val_params = {**req.openid_params, "openid.mode": "check_authentication"}
            async with httpx.AsyncClient() as client:
                val_res = await client.post("https://steamcommunity.com/openid/login", data=val_params, timeout=15.0)
                if val_res.status_code != 200 or "is_valid:true" not in val_res.text:
                    raise HTTPException(status_code=400, detail="Invalid Steam OpenID authentication signature.")
            
            # 2. Extract steam64 ID from claimed_id
            claimed_id = req.openid_params.get("openid.claimed_id", "")
            steam_id = claimed_id.split("/id/")[-1].strip()
            if not steam_id.isdigit():
                raise HTTPException(status_code=400, detail="Invalid Steam claimed ID format.")

            # 3. Retrieve user profile info from Steam Web API using STEAM_API_KEY
            steam_key = os.getenv("STEAM_API_KEY")
            username = f"steam_{steam_id}"
            display_name = "Steam User"
            avatar_url = "https://avatars.githubusercontent.com/u/15448?v=4"

            if steam_key:
                try:
                    async with httpx.AsyncClient() as client:
                        api_res = await client.get(
                            "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/",
                            params={"key": steam_key, "steamids": steam_id},
                            timeout=10.0
                        )
                        if api_res.status_code == 200:
                            players = api_res.json().get("response", {}).get("players", [])
                            if players:
                                display_name = players[0].get("personaname", display_name)
                                avatar_url = players[0].get("avatarfull", avatar_url)
                except Exception as api_err:
                    logger.warning(f"Steam Web API request failed: {api_err}")
            else:
                logger.info("STEAM_API_KEY not set. Using default Steam profile placeholder.")
                
        except Exception:
            logger.error("Steam OpenID exchange error: Signature verification failed.")
            raise HTTPException(status_code=400, detail="Steam OpenID authentication failed.")
    elif provider == "steam":
        username = "GamerPro_Steam"
        display_name = "SteamGamerPro"
        avatar_url = "https://avatars.githubusercontent.com/u/15448?v=4"
    elif provider == "discord":
        username = "EpicTrack_Discord"
        display_name = "DiscordDeals"
        avatar_url = "https://avatars.githubusercontent.com/u/583231?v=4"
    else:
        username = "LocalPlayer"
        display_name = "Guest Player"
        avatar_url = "https://avatars.githubusercontent.com/u/10137?v=4"

    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            """
            INSERT INTO users (username, display_name, avatar_url, auth_provider)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (username) DO UPDATE
            SET display_name = EXCLUDED.display_name, avatar_url = EXCLUDED.avatar_url
            RETURNING id, username, display_name, avatar_url, auth_provider
            """,
            username, display_name, avatar_url, provider
        )
        user_dict = dict(user)
        # Generate secure HMAC token
        token_str = str(user_dict['id'])
        signature = hmac.new(
            JWT_SECRET.encode(),
            token_str.encode(),
            hashlib.sha256
        ).hexdigest()
        token = f"{token_str}.{signature}"
        return {
            "status": "success",
            "token": token,
            "user": user_dict
        }


@app.get("/auth/me")
async def auth_me(current_user: Dict = Depends(get_current_user)):
    """Fetch profile metadata of the currently logged-in user."""
    return {
        "status": "success",
        "user": current_user
    }


@app.delete("/auth/account")
async def delete_account(current_user: Dict = Depends(get_current_user)):
    """Permanently delete user profile and all associated watchlist targets."""
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM users WHERE id = $1", current_user["id"])
    return {
        "status": "success",
        "message": "Account and all associated user data have been permanently deleted."
    }


@app.get("/watchlist")
async def get_db_watchlist(current_user: Dict = Depends(get_current_user)):
    """Fetch persistent user watchlist items synced from the backend database."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT w.game_id, g.title, g.metadata, w.target_price, w.added_at
            FROM watchlists w
            JOIN games g ON g.id = w.game_id
            WHERE w.user_id = $1
            ORDER BY w.added_at DESC
            """,
            current_user["id"]
        )
        
        watchlist_items = []
        for r in rows:
            meta = json.loads(r["metadata"]) if isinstance(r["metadata"], str) else r["metadata"]
            watchlist_items.append({
                "game_id": r["game_id"],
                "title": r["title"],
                "image_url": meta.get("image_url") or meta.get("header_url") or "",
                "target_price": float(r["target_price"]),
                "added_at": r["added_at"].isoformat()
            })
        return {
            "status": "success",
            "watchlist": watchlist_items
        }


@app.post("/watchlist/sync")
async def sync_watchlist(req: SyncRequest, current_user: Dict = Depends(get_current_user)):
    """Bulk merge client-side localStorage wishlists into the persistent database."""
    async with pool.acquire() as conn:
        async with conn.transaction():
            for item in req.watchlist:
                await conn.execute(
                    """
                    INSERT INTO watchlists (user_id, game_id, target_price)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (user_id, game_id) DO UPDATE
                    SET target_price = LEAST(watchlists.target_price, EXCLUDED.target_price)
                    """,
                    current_user["id"], item.game_id, item.target_price
                )
        
        # Return fully merged watchlist from DB
        return await get_db_watchlist(current_user)


@app.post("/watchlist/add")
async def add_to_db_watchlist(req: AddItemRequest, current_user: Dict = Depends(get_current_user)):
    """Add a targeted game deal to the user's persistent backend watchlist."""
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO watchlists (user_id, game_id, target_price)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, game_id) DO UPDATE
            SET target_price = EXCLUDED.target_price
            """,
            current_user["id"], req.game_id, req.target_price
        )
    return {"status": "success", "message": "Item added to watchlist"}


@app.delete("/watchlist/{game_id}")
async def remove_from_db_watchlist(game_id: int, current_user: Dict = Depends(get_current_user)):
    """Remove a tracked game deal from the user's backend watchlist database."""
    async with pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM watchlists WHERE user_id = $1 AND game_id = $2",
            current_user["id"], game_id
        )
    return {"status": "success", "message": "Item removed from watchlist"}

