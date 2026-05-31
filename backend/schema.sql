-- Project Antigravity SQL Schema

-- Table for Game Metadata (Relational + JSONB Document Storage)
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    cheapshark_id VARCHAR(20),           -- CheapShark game ID for price lookups
    steam_app_id VARCHAR(20),            -- Steam app ID for metadata lookups
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- Stores tags, hardware requirements, descriptions, availability, bonus_content
    last_api_fetch TIMESTAMP WITH TIME ZONE,     -- When prices were last fetched from external APIs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for searching metadata tags if needed
CREATE INDEX IF NOT EXISTS idx_games_metadata ON games USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_games_cheapshark ON games(cheapshark_id);
CREATE INDEX IF NOT EXISTS idx_games_steam ON games(steam_app_id);

-- Table for Price Logs (Time-Series Data)
CREATE TABLE IF NOT EXISTS price_logs (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    platform VARCHAR(100) NOT NULL, -- Store name e.g., 'Steam', 'Epic Games Store', 'GOG'
    current_price DECIMAL(10, 2) NOT NULL,
    retail_price DECIMAL(10, 2),    -- Original/retail price
    savings DECIMAL(5, 2),          -- Savings percentage
    deal_id TEXT,                    -- CheapShark deal ID for redirect URL
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Required Indexes for optimized historical price lookups
CREATE INDEX IF NOT EXISTS idx_price_logs_game_id ON price_logs(game_id);
CREATE INDEX IF NOT EXISTS idx_price_logs_timestamp ON price_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_price_logs_platform ON price_logs(platform);

-- Composite index for fast lookup of a game's price on a specific platform at a specific time
CREATE INDEX IF NOT EXISTS idx_price_logs_composite ON price_logs(game_id, platform, timestamp DESC);

-- Table for Users (Authentication Profile Storage)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150),
    avatar_url VARCHAR(255),
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'local', -- 'steam', 'discord', 'local'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for Watchlists (Persistent cloud watchlist tracking)
CREATE TABLE IF NOT EXISTS watchlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    target_price DECIMAL(10, 2) NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, game_id)
);

-- Indexes for optimized watchlist lookups
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_composite ON watchlists(user_id, game_id);

