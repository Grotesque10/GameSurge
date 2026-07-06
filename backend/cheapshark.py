"""
CheapShark API Integration Module
Free API — no API key required. Requires custom User-Agent header.
Docs: https://apidocs.cheapshark.com/

Redis caching layer: all external GET requests are cached with a 15-minute TTL.
"""

import os
import json
import time
import httpx
import asyncio
import logging
from typing import Dict, List, Optional, Any

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

BASE_URL = "https://www.cheapshark.com/api/1.0"
HEADERS = {"User-Agent": "Antigravity/1.0 (game-price-dashboard)"}
STORE_ICON_BASE = "https://www.cheapshark.com"

# Serialize + pace requests so bulk refreshes do not trigger HTTP 429
_cheapshark_lock = asyncio.Lock()
_last_cheapshark_monotonic: float = 0.0

# In-memory store name cache (rarely changes)
_store_cache: Dict[str, str] = {}
_store_active: Dict[str, bool] = {}

# ─── Redis Connection ─────────────────────────────────────────────────────────
REDIS_URL = os.getenv("REDIS_URL", "")
CACHE_TTL_SECONDS = int(os.getenv("CHEAPSHARK_CACHE_TTL", "900"))  # 15 minutes

_redis_pool: Optional[aioredis.Redis] = None


async def get_redis() -> Optional[aioredis.Redis]:
    """Lazily initialize and return the Redis connection pool."""
    global _redis_pool
    if not REDIS_URL:
        return None
    if _redis_pool is None:
        try:
            _redis_pool = aioredis.from_url(
                REDIS_URL, decode_responses=True, socket_connect_timeout=3
            )
            await _redis_pool.ping()
            logger.info("Redis connected at %s", REDIS_URL)
        except Exception as e:
            logger.warning("Redis unavailable (%s) — running without cache", e)
            _redis_pool = None
    return _redis_pool


async def close_redis():
    """Gracefully close the Redis connection pool."""
    global _redis_pool
    if _redis_pool:
        await _redis_pool.aclose()
        _redis_pool = None
        logger.info("Redis connection closed")


def _cache_key(path: str, params: Optional[Dict[str, Any]] = None) -> str:
    """Generate a deterministic Redis key for a CheapShark request."""
    sorted_params = json.dumps(params or {}, sort_keys=True)
    return f"cheapshark:{path}:{sorted_params}"


def _min_interval_sec() -> float:
    return float(os.getenv("CHEAPSHARK_MIN_INTERVAL_SEC", "0.9"))


def _max_retries() -> int:
    return int(os.getenv("CHEAPSHARK_MAX_RETRIES", "6"))


async def _cheapshark_get(path: str, params: Optional[Dict[str, Any]] = None) -> Any:
    """
    Single CheapShark GET with Redis caching, process-wide pacing, and
    bounded retries on 429. Returns parsed JSON directly.
    """
    global _last_cheapshark_monotonic
    params = params or {}

    # ── Cache Read ──
    r = await get_redis()
    key = _cache_key(path, params)
    if r:
        try:
            cached = await r.get(key)
            if cached is not None:
                logger.debug("CACHE HIT  %s", key)
                return json.loads(cached)
        except Exception as e:
            logger.warning("Redis read error: %s", e)
    logger.debug("CACHE MISS %s", key)

    # ── API Fetch (with pacing + retries) ──
    url = f"{BASE_URL}{path}" if path.startswith("/") else f"{BASE_URL}/{path}"
    max_r = _max_retries()
    last_resp: Optional[httpx.Response] = None

    async with _cheapshark_lock:
        for attempt in range(max_r):
            gap = _min_interval_sec()
            now = time.monotonic()
            wait_gap = gap - (now - _last_cheapshark_monotonic)
            if wait_gap > 0:
                await asyncio.sleep(wait_gap)

            async with httpx.AsyncClient(headers=HEADERS, timeout=20.0) as client:
                resp = await client.get(url, params=params)
            _last_cheapshark_monotonic = time.monotonic()
            last_resp = resp

            if resp.status_code == 429:
                retry_after = resp.headers.get("Retry-After")
                backoff = min(60.0, 2.0 ** attempt)
                if retry_after:
                    try:
                        backoff = max(backoff, float(retry_after))
                    except ValueError:
                        pass
                logger.warning(
                    "CheapShark rate limited (429) on %s — waiting %.1fs (attempt %s/%s)",
                    path,
                    backoff,
                    attempt + 1,
                    max_r,
                )
                await asyncio.sleep(backoff)
                continue

            resp.raise_for_status()
            data = resp.json()

            # ── Cache Write ──
            if r:
                try:
                    await r.set(key, json.dumps(data), ex=CACHE_TTL_SECONDS)
                    logger.debug("CACHE SET  %s (TTL %ds)", key, CACHE_TTL_SECONDS)
                except Exception as e:
                    logger.warning("Redis write error: %s", e)

            return data

    if last_resp is not None:
        last_resp.raise_for_status()
    raise httpx.HTTPError("CheapShark request failed after retries")



async def fetch_stores() -> Dict[str, str]:
    """
    Fetch the store ID → store name mapping from CheapShark.
    Cached in memory after first call.
    Returns: {"1": "Steam", "25": "Epic Games Store", ...}
    """
    global _store_cache, _store_active
    if _store_cache:
        return _store_cache

    stores = await _cheapshark_get("/stores")

    _store_cache = {s["storeID"]: s["storeName"] for s in stores}
    _store_active = {s["storeID"]: bool(s["isActive"]) for s in stores}
    logger.info(f"Loaded {len(_store_cache)} stores from CheapShark")
    return _store_cache


def get_store_name(store_id: str) -> str:
    """Get store name from cached mapping."""
    return _store_cache.get(store_id, f"Store #{store_id}")


def get_store_icon_url(store_id: str) -> str:
    """Get the store icon URL from CheapShark CDN."""
    # CheapShark uses 0-indexed icons (storeID - 1)
    icon_index = int(store_id) - 1
    return f"{STORE_ICON_BASE}/img/stores/icons/{icon_index}.png"


def is_store_active(store_id: str) -> bool:
    """Check if a store is currently active on CheapShark."""
    return _store_active.get(store_id, False)


async def search_game(title: str, limit: int = 1) -> Optional[Dict]:
    """
    Search for a game by title on CheapShark.
    Returns: {"gameID": "202350", "steamAppID": "1091500", "cheapest": "20.99", "external": "Cyberpunk 2077", ...}
    """
    results = await _cheapshark_get("/games", params={"title": title, "limit": limit})

    if results and len(results) > 0:
        return results[0]
    return None


async def get_game_deals(cheapshark_game_id: str) -> Optional[Dict]:
    """
    Get all active deals for a game by its CheapShark game ID.
    Returns:
    {
        "info": {"title": "...", "steamAppID": "...", "thumb": "..."},
        "cheapestPriceEver": {"price": "20.99", "date": 1750965247},
        "deals": [
            {"storeID": "1", "dealID": "...", "price": "59.99", "retailPrice": "59.99", "savings": "0.00"},
            ...
        ]
    }
    """
    return await _cheapshark_get("/games", params={"id": cheapshark_game_id})


async def get_deal_details(deal_id: str) -> Optional[Dict]:
    """Get details for a specific deal (includes redirect URL to store)."""
    return await _cheapshark_get("/deals", params={"id": deal_id})


def get_deal_redirect_url(deal_id: str) -> str:
    """Get the redirect URL that takes the user to the store page for a deal."""
    return f"https://www.cheapshark.com/redirect?dealID={deal_id}"


async def search_and_get_deals(title: str) -> Optional[Dict]:
    """
    Convenience: search for a game by title and return its deals.
    Combines search_game() + get_game_deals() in one call.
    """
    game = await search_game(title)
    if not game:
        logger.warning(f"Game not found on CheapShark: {title}")
        return None

    deals = await get_game_deals(game["gameID"])
    if deals:
        deals["_search"] = game  # attach search result for reference
    return deals


async def discover_game_titles(limit: int = 100, page_size: int = 60) -> List[str]:
    """
    Discover many game titles from CheapShark's public deals feed.
    Returns unique titles, ordered by first appearance.
    """
    if limit <= 0:
        return []

    unique_titles: List[str] = []
    seen = set()
    page = 0

    while len(unique_titles) < limit:
        rows = await _cheapshark_get(
            "/deals",
            params={
                "pageNumber": page,
                "pageSize": page_size,
                "sortBy": "Recent",
                "desc": 1,
            },
        )
        if not rows:
            break

        added_this_page = 0
        for row in rows:
            title = (row.get("title") or "").strip()
            if not title:
                continue
            key = title.casefold()
            if key in seen:
                continue
            seen.add(key)
            unique_titles.append(title)
            added_this_page += 1
            if len(unique_titles) >= limit:
                break

        if added_this_page == 0:
            break
        page += 1

    return unique_titles
