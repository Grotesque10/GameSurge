# Graph Report - antilearn  (2026-07-09)

## Corpus Check
- 43 files · ~1,616,463 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 416 nodes · 521 edges · 30 communities (25 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c5d94cbd`
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
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]

## God Nodes (most connected - your core abstractions)
1. `build_game_response()` - 21 edges
2. `useCurrency()` - 21 edges
3. `refresh_game_prices()` - 15 edges
4. `get_game_details()` - 15 edges
5. `get_market_status()` - 14 edges
6. `_cheapshark_get()` - 12 edges
7. `ensure_minimum_games()` - 12 edges
8. `seed_more()` - 12 edges
9. `seed_games_from_api()` - 11 edges
10. `get_latest_prices()` - 11 edges

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

## Communities (30 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (29): AuthCallback(), BuyingSentiment(), SENTIMENT_CONFIG, CommandPalette(), GameCard(), ChartTooltip(), FALLBACK_PALETTE, GameDetails() (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (44): background_refresh_task(), extract_base_title(), get_game_details(), get_market_status(), _is_price_cache_expired(), Fetch fresh prices from CheapShark for a single game.     Only calls the API if, Fetch fresh prices from CheapShark for a single game.     Only calls the API if, Fetch fresh prices from CheapShark for a single game.     Only calls the API if (+36 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (41): _cache_key(), _cheapshark_get(), close_redis(), discover_game_titles(), fetch_stores(), get_deal_details(), get_deal_redirect_url(), get_game_deals() (+33 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (34): calculate_price_stability(), calculate_value_score(), calculate_weighted_moving_average(), detect_price_surge(), Calculates the weighted moving average given a list of prices and their correspo, Volatility Detection: Calculates a Surge Index.     A "Price Surge" is flagged w, Economic Filtering: Calculates Value Score (Current Price vs. Historical Low)., Calculates the standard deviation of prices for a specific game      to determin (+26 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (33): add_to_db_watchlist(), auth_login(), auth_me(), Frictionless social sign-in simulator for Steam and Discord accounts., Frictionless social sign-in simulator or live Discord OAuth2 token exchange., Frictionless social sign-in simulator or live Discord OAuth2 token exchange., Frictionless social sign-in simulator or live Discord OAuth2 token exchange., Frictionless social sign-in simulator or live Discord OAuth2 token exchange. (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (28): force_refresh(), games_count(), Manually add more games to the catalog., Force refresh all game prices from external APIs., Manually add more games to the catalog., Returns details for a single game by ID with real price data., Force refresh all game prices from external APIs., Manually add more games to the catalog. (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (26): ensure_minimum_games(), Search for each tracked game on CheapShark, fetch metadata from Steam,     and p, Search for each tracked game on CheapShark, fetch metadata from Steam,     and p, Search for each tracked game on CheapShark, fetch metadata from Steam,     and p, Search for each tracked game on CheapShark, fetch metadata from Steam,     and p, Search for each tracked game on CheapShark, fetch metadata from Steam,     and p, Search for each tracked game on CheapShark, fetch metadata from Steam,     and p, Search for each tracked game on CheapShark, fetch metadata from Steam,     and p (+18 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (25): 1. Database Setup, 2. Backend Setup, 3. Frontend Setup, 4. End-to-End Testing (Playwright), code:sql (CREATE DATABASE GameSurge;), code:bash (npm install), code:bash (# Run tests in headless mode), code:bash (docker compose up -d) (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (17): get_db_watchlist(), Fetch persistent user watchlist items synced from the backend database., Fetch persistent user watchlist items synced from the backend database., Fetch persistent user watchlist items synced from the backend database., Fetch persistent user watchlist items synced from the backend database., Fetch persistent user watchlist items synced from the backend database., Bulk merge client-side localStorage wishlists into the persistent database., Bulk merge client-side localStorage wishlists into the persistent database. (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (17): get_latest_prices(), get_price_history(), Get the most recent price for each platform from the database., Get the most recent price for each platform from the database., Get the most recent price for each platform from the database., Get the most recent price for each platform from the database., Fetch price history for a specific platform from the DB., Get the most recent price for each platform from the database. (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.23
Nodes (11): _extract_req_fields(), get_app_details(), get_multiple_app_details(), _parse_steam_data(), _parse_system_requirements(), Steam Store API Integration Module Undocumented but widely-used public API — no, Parse system requirements from Steam API response., Extract system requirement fields from Steam's HTML format.     Steam returns re (+3 more)

### Community 11 - "Community 11"
Cohesion: 0.22
Nodes (8): currencySelect, euroPrice, firstDot, gameCards, gbpPrice, loadMoreBtn, paginationDots, secondDot

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (8): get_auth_config(), Dynamically serve social provider Client IDs securely from backend environment., Dynamically serve social provider Client IDs securely from backend environment., Dynamically serve social provider Client IDs securely from backend environment., Dynamically serve social provider Client IDs securely from backend environment., Dynamically serve social provider Client IDs securely from backend environment., Dynamically serve social provider Client IDs securely from backend environment., Dynamically serve social provider Client IDs securely from backend environment.

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (6): GameSurge Frontend, Key Pages, Notes, Requirements, Scripts, Setup

### Community 14 - "Community 14"
Cohesion: 0.4
Nodes (5): backfill(), Dynamic metadata backfiller. Finds games missing summaries or images, searches, Search Steam store API by title and return the best matching App ID., Search Steam store API by title and return the best matching App ID., search_steam_by_title()

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (5): confirmBtn, gameCard, removeBtn, targetInput, watchBtn

### Community 16 - "Community 16"
Cohesion: 0.4
Nodes (4): gameCard, items, watchButton, watchlistLink

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (3): errorMessage, gameCards, retryButton

### Community 18 - "Community 18"
Cohesion: 0.5
Nodes (3): backLink, gameCard, watchlistLink

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (3): resultItem, searchInput, searchTrigger

## Knowledge Gaps
- **248 isolated node(s):** `Calculates the standard deviation of prices for a specific game      to determin`, `Calculates the weighted moving average given a list of prices and their correspo`, `Volatility Detection: Calculates a Surge Index.     A "Price Surge" is flagged w`, `Economic Filtering: Calculates Value Score (Current Price vs. Historical Low).`, `Dynamic metadata backfiller. Finds games missing summaries or images, searches` (+243 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `build_game_response()` connect `Community 3` to `Community 9`, `Community 1`, `Community 6`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `get_game_details()` connect `Community 1` to `Community 3`, `Community 5`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `get_market_status()` connect `Community 1` to `Community 3`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `build_game_response()` (e.g. with `detect_price_surge()` and `calculate_price_stability()`) actually correct?**
  _`build_game_response()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Calculates the standard deviation of prices for a specific game      to determin`, `Calculates the weighted moving average given a list of prices and their correspo`, `Volatility Detection: Calculates a Surge Index.     A "Price Surge" is flagged w` to the rest of the system?**
  _248 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._