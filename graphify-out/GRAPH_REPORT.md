# Graph Report - antilearn  (2026-06-19)

## Corpus Check
- 32 files · ~21,238 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 286 nodes · 381 edges · 19 communities (17 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `880286c7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]

## God Nodes (most connected - your core abstractions)
1. `useCurrency()` - 19 edges
2. `build_game_response()` - 17 edges
3. `get_game_details()` - 13 edges
4. `get_market_status()` - 12 edges
5. `refresh_game_prices()` - 11 edges
6. `useWatchlist()` - 11 edges
7. `ensure_minimum_games()` - 10 edges
8. `seed_more()` - 10 edges
9. `_cheapshark_get()` - 9 edges
10. `seed_games_from_api()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `test()` --calls--> `get_latest_prices()`  [INFERRED]
  backend/test_api.py → backend/main.py
- `test()` --calls--> `build_game_response()`  [INFERRED]
  backend/test_api.py → backend/main.py
- `build_game_response()` --calls--> `calculate_price_stability()`  [INFERRED]
  backend/main.py → backend/analytics.py
- `build_game_response()` --calls--> `detect_price_surge()`  [INFERRED]
  backend/main.py → backend/analytics.py
- `build_game_response()` --calls--> `calculate_value_score()`  [INFERRED]
  backend/main.py → backend/analytics.py

## Communities (19 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (27): AuthCallback(), BuyingSentiment(), SENTIMENT_CONFIG, CommandPalette(), GameCard(), ChartTooltip(), FALLBACK_PALETTE, GameDetails() (+19 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (36): add_to_db_watchlist(), AddItemRequest, auth_login(), auth_me(), get_auth_config(), get_current_user(), get_db_watchlist(), LoginRequest (+28 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (35): background_refresh_task(), extract_base_title(), get_game_details(), get_market_status(), _is_price_cache_expired(), Fetch fresh prices from CheapShark for a single game.     Only calls the API if, Fetch fresh prices from CheapShark for a single game.     Only calls the API if, Fetch fresh prices from CheapShark for a single game.     Only calls the API if (+27 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (25): _cheapshark_get(), discover_game_titles(), fetch_stores(), get_deal_details(), get_deal_redirect_url(), get_game_deals(), get_store_icon_url(), get_store_name() (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (20): ensure_minimum_games(), Search for each tracked game on CheapShark, fetch metadata from Steam,     and p, Search for each tracked game on CheapShark, fetch metadata from Steam,     and p, Search for each tracked game on CheapShark, fetch metadata from Steam,     and p, Search for each tracked game on CheapShark, fetch metadata from Steam,     and p, Search for each tracked game on CheapShark, fetch metadata from Steam,     and p, Seed one game by title. Returns True if inserted, else False., Seed one game by title. Returns True if inserted, else False. (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (17): calculate_price_stability(), calculate_value_score(), calculate_weighted_moving_average(), detect_price_surge(), Calculates the weighted moving average given a list of prices and their correspo, Volatility Detection: Calculates a Surge Index.     A "Price Surge" is flagged w, Economic Filtering: Calculates Value Score (Current Price vs. Historical Low)., Calculates the standard deviation of prices for a specific game      to determin (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (17): 1. Database Setup, 2. Backend Setup, 3. Frontend Setup, code:sql (CREATE DATABASE antigravity;), code:bash (cd backend), code:bash (cp .env.example .env), code:bash (pip install -r requirements.txt), code:bash (python -m uvicorn main:app --host 127.0.0.1 --port 8080 --re) (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (17): force_refresh(), Force refresh all game prices from external APIs., Manually add more games to the catalog., Force refresh all game prices from external APIs., Manually add more games to the catalog., Force refresh all game prices from external APIs., Manually add more games to the catalog., Force refresh all game prices from external APIs. (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.17
Nodes (12): get_latest_prices(), get_price_history(), Get the most recent price for each platform from the database., Get the most recent price for each platform from the database., Get the most recent price for each platform from the database., Get the most recent price for each platform from the database., Fetch price history for a specific platform from the DB., Get the most recent price for each platform from the database. (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.23
Nodes (11): _extract_req_fields(), get_app_details(), get_multiple_app_details(), _parse_steam_data(), _parse_system_requirements(), Steam Store API Integration Module Undocumented but widely-used public API — no, Parse system requirements from Steam API response., Extract system requirement fields from Steam's HTML format.     Steam returns re (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (8): games_count(), Returns details for a single game by ID with real price data., Returns the total number of games in the database., Returns the total number of games in the database., Returns the total number of games in the database., Returns the total number of games in the database., Returns the total number of games in the database., Returns the total number of games in the database.

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (6): GameSurge Frontend, Key Pages, Notes, Requirements, Scripts, Setup

### Community 12 - "Community 12"
Cohesion: 0.4
Nodes (5): backfill(), Dynamic metadata backfiller. Finds games missing summaries or images, searches S, Search Steam store API by title and return the best matching App ID., Search Steam store API by title and return the best matching App ID., search_steam_by_title()

## Knowledge Gaps
- **147 isolated node(s):** `Calculates the standard deviation of prices for a specific game      to determin`, `Calculates the weighted moving average given a list of prices and their correspo`, `Volatility Detection: Calculates a Surge Index.     A "Price Surge" is flagged w`, `Economic Filtering: Calculates Value Score (Current Price vs. Historical Low).`, `Dynamic metadata backfiller. Finds games missing summaries or images, searches S` (+142 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `build_game_response()` connect `Community 5` to `Community 8`, `Community 1`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `get_game_details()` connect `Community 2` to `Community 1`, `Community 10`, `Community 5`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `seed_more()` connect `Community 7` to `Community 1`, `Community 4`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `build_game_response()` (e.g. with `detect_price_surge()` and `calculate_price_stability()`) actually correct?**
  _`build_game_response()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Calculates the standard deviation of prices for a specific game      to determin`, `Calculates the weighted moving average given a list of prices and their correspo`, `Volatility Detection: Calculates a Surge Index.     A "Price Surge" is flagged w` to the rest of the system?**
  _147 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._