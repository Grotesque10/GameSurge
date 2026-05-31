"""
Steam Store API Integration Module
Undocumented but widely-used public API — no API key required.
Rate limit: ~200 requests per 5 minutes per IP.
"""

import httpx
import asyncio
import logging
from typing import Dict, Optional, List

logger = logging.getLogger(__name__)

STEAM_API_URL = "https://store.steampowered.com/api/appdetails"
HEADERS = {"User-Agent": "Antigravity/1.0 (game-price-dashboard)"}


async def get_app_details(steam_app_id: str, cc: str = "us") -> Optional[Dict]:
    """
    Fetch game details from the Steam Store API.

    Args:
        steam_app_id: The Steam application ID (e.g., "1091500" for Cyberpunk 2077)
        cc: Country code for pricing (default "us")

    Returns a cleaned dict with the fields our app needs:
    {
        "title": "Cyberpunk 2077",
        "developer": "CD Projekt Red",
        "publisher": "CD Projekt",
        "release_date": "Dec 10, 2020",
        "rating": 86,
        "summary": "...",
        "tags": ["RPG", "Open World", ...],
        "image_url": "https://...",
        "header_url": "https://...",
        "system_requirements": {...},
        "steam_price": 59.99,
        "is_free": False,
    }
    """
    async with httpx.AsyncClient(headers=HEADERS, timeout=15.0) as client:
        try:
            resp = await client.get(
                STEAM_API_URL,
                params={"appids": steam_app_id, "cc": cc}
            )
            resp.raise_for_status()
            data = resp.json()
        except (httpx.HTTPStatusError, httpx.RequestError) as e:
            logger.error(f"Steam API error for app {steam_app_id}: {e}")
            return None

    app_data = data.get(str(steam_app_id), {})
    if not app_data.get("success"):
        logger.warning(f"Steam API returned success=false for app {steam_app_id}")
        return None

    info = app_data["data"]
    return _parse_steam_data(info)


def _parse_steam_data(info: Dict) -> Dict:
    """Parse raw Steam API response into our app's format."""

    # Extract genres/tags
    genres = [g["description"] for g in info.get("genres", [])]
    categories = [c["description"] for c in info.get("categories", [])]
    # Use genres as tags (more meaningful than categories for our dashboard)
    tags = genres[:6]  # Limit to 6 tags

    # Extract developer & publisher
    developers = info.get("developers", [])
    publishers = info.get("publishers", [])

    # Extract release date
    release_info = info.get("release_date", {})
    release_date = release_info.get("date", "TBA")

    # Extract Metacritic score
    metacritic = info.get("metacritic", {})
    rating = metacritic.get("score", 0)

    # Extract description
    summary = info.get("short_description", "")

    # Extract images
    header_url = info.get("header_image", "")
    # Build the library portrait image URL from Steam's CDN
    steam_appid = info.get("steam_appid", "")
    image_url = f"https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/{steam_appid}/library_600x900_2x.jpg"

    # Extract pricing
    is_free = info.get("is_free", False)
    price_overview = info.get("price_overview", {})
    steam_price = price_overview.get("final", 0) / 100.0 if price_overview else 0.0

    # Extract system requirements (PC only)
    sys_reqs = _parse_system_requirements(info)

    # Extract platform availability
    platforms = info.get("platforms", {})

    return {
        "title": info.get("name", ""),
        "developer": developers[0] if developers else "",
        "publisher": publishers[0] if publishers else "",
        "release_date": release_date,
        "rating": rating,
        "summary": summary,
        "tags": tags,
        "image_url": image_url,
        "header_url": header_url,
        "system_requirements": sys_reqs,
        "steam_price": steam_price,
        "is_free": is_free,
        "categories": categories[:5],
        "platforms_available": platforms,
        "steam_appid": str(steam_appid),
    }


def _parse_system_requirements(info: Dict) -> Dict:
    """Parse system requirements from Steam API response."""
    pc_reqs = info.get("pc_requirements", {})

    result = {}
    for tier in ["minimum", "recommended"]:
        raw_html = pc_reqs.get(tier, "")
        if raw_html:
            result[tier] = _extract_req_fields(raw_html)

    return result


def _extract_req_fields(html: str) -> Dict:
    """
    Extract system requirement fields from Steam's HTML format.
    Steam returns requirements as HTML strings like:
    <li><strong>OS:</strong> Windows 10<br></li>
    """
    import re
    fields = {}
    field_map = {
        "os": "os",
        "processor": "processor",
        "memory": "memory",
        "graphics": "graphics",
        "storage": "storage",
        "directx": "directx",
    }

    for key, field_name in field_map.items():
        # Match patterns like: <strong>OS:</strong> Windows 10
        # or <strong>OS *:</strong> Windows 10
        pattern = rf'<strong>{re.escape(key)}[^<]*:</strong>\s*(.*?)(?:<br|</li|</ul|<strong|\Z)'
        match = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
        if match:
            value = match.group(1).strip()
            # Clean HTML tags
            value = re.sub(r'<[^>]+>', '', value).strip()
            # Remove trailing whitespace and line breaks
            value = value.strip().rstrip(',').strip()
            if value:
                fields[field_name] = value

    return fields


async def get_multiple_app_details(
    steam_app_ids: List[str],
    cc: str = "us",
    delay: float = 0.3
) -> Dict[str, Optional[Dict]]:
    """
    Fetch details for multiple Steam apps with rate limiting.
    Returns a dict mapping steam_app_id -> parsed details.
    """
    results = {}
    for app_id in steam_app_ids:
        details = await get_app_details(app_id, cc)
        results[app_id] = details
        if delay > 0:
            await asyncio.sleep(delay)  # Respect rate limits

    return results
