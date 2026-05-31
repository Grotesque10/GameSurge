"""Quick test to debug the API response."""
import asyncio
import json
import traceback

async def test():
    import main
    import cheapshark

    await main.startup()

    async with main.pool.acquire() as conn:
        games = await conn.fetch(
            "SELECT id, title, cheapshark_id, steam_app_id, metadata, last_api_fetch FROM games ORDER BY id LIMIT 1"
        )
        game = games[0]
        print(f"Game: {game['title']}")

        prices = await main.get_latest_prices(conn, game["id"])
        print(f"Prices: {len(prices)} stores")
        for p in prices[:3]:
            print(f"  {p['platform']}: ${p['current_price']}")

        try:
            resp = await main.build_game_response(conn, game, prices)
            print(f"Response OK - title: {resp['title']}")
            print(f"Best deal: {resp['best_deal']}")
            print(f"Platforms count: {len(resp['platforms'])}")
            print(json.dumps(resp, indent=2, default=str)[:2000])
        except Exception as e:
            print(f"ERROR in build_game_response: {e}")
            traceback.print_exc()

    await main.pool.close()

asyncio.run(test())
