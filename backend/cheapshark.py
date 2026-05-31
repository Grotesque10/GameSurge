"""
CheapShark API Integration Module
Free API — no API key required. Requires custom User-Agent header.
Docs: https://apidocs.cheapshark.com/
"""

import os
import time
import httpx
import asyncio
import logging
from typing import Dict, List, Optional, Any

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


def _min_interval_sec() -> float:
    return float(os.getenv("CHEAPSHARK_MIN_INTERVAL_SEC", "0.9"))


def _max_retries() -> int:
    return int(os.getenv("CHEAPSHARK_MAX_RETRIES", "6"))


async def _cheapshark_get(path: str, params: Optional[Dict[str, Any]] = None) -> httpx.Response:
    """
    Single CheapShark GET with process-wide pacing and bounded retries on 429.
    All high-frequency endpoints should go through this.
    """
    global _last_cheapshark_monotonic
    url = f"{BASE_URL}{path}" if path.startswith("/") else f"{BASE_URL}/{path}"
    params = params or {}
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
            return resp

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

    resp = await _cheapshark_get("/stores")
    stores = resp.json()

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
    resp = await _cheapshark_get("/games", params={"title": title, "limit": limit})
    results = resp.json()

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
    resp = await _cheapshark_get("/games", params={"id": cheapshark_game_id})
    return resp.json()


async def get_deal_details(deal_id: str) -> Optional[Dict]:
    """Get details for a specific deal (includes redirect URL to store)."""
    resp = await _cheapshark_get("/deals", params={"id": deal_id})
    return resp.json()


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
        resp = await _cheapshark_get(
            "/deals",
            params={
                "pageNumber": page,
                "pageSize": page_size,
                "sortBy": "Recent",
                "desc": 1,
            },
        )
        rows = resp.json()
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
