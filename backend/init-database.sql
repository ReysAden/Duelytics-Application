-- Duelytics Database Schema
-- Based on actual codebase analysis

-- Users table - Discord OAuth with role-based access
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    discord_id VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    avatar VARCHAR(255),
    email VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    guild_roles TEXT[], -- Array of Discord role IDs
    is_admin BOOLEAN DEFAULT FALSE,
    is_supporter BOOLEAN DEFAULT FALSE,
    selected_background_id INTEGER, -- References backgrounds(id)
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table - Tournament sessions
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    game_mode VARCHAR(50) NOT NULL CHECK (game_mode IN ('ladder', 'rated', 'duelist_cup')),
    admin_user_id VARCHAR(20) NOT NULL REFERENCES users(discord_id),
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    starting_rating INTEGER DEFAULT 1500,
    point_value INTEGER DEFAULT 7,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'ended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ladder tiers table - For ladder mode progression
CREATE TABLE IF NOT EXISTS ladder_tiers (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL,
    wins_required INTEGER NOT NULL, -- Net wins required to advance from this tier
    can_demote_from BOOLEAN DEFAULT TRUE,
    sort_order INTEGER NOT NULL UNIQUE, -- 1 = lowest tier
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert basic ladder tiers (based on tier-progression service)
INSERT INTO ladder_tiers (tier_name, wins_required, can_demote_from, sort_order) VALUES
('Rookie 2', 1, FALSE, 1),
('Rookie 1', 1, TRUE, 2),
('Bronze 5', 2, TRUE, 3),
('Bronze 4', 2, TRUE, 4),
('Bronze 3', 2, TRUE, 5),
('Bronze 2', 2, TRUE, 6),
('Bronze 1', 2, TRUE, 7),
('Silver 5', 2, TRUE, 8),
('Silver 4', 2, TRUE, 9),
('Silver 3', 2, TRUE, 10),
('Silver 2', 2, TRUE, 11),
('Silver 1', 3, TRUE, 12),
('Gold 5', 3, TRUE, 13),
('Gold 4', 3, TRUE, 14),
('Gold 3', 3, TRUE, 15),
('Gold 2', 3, TRUE, 16),
('Gold 1', 4, TRUE, 17),
('Platinum 5', 4, TRUE, 18),
('Platinum 4', 4, TRUE, 19),
('Platinum 3', 4, TRUE, 20),
('Platinum 2', 4, TRUE, 21),
('Platinum 1', 5, TRUE, 22),
('Diamond 5', 5, TRUE, 23),
('Diamond 4', 5, TRUE, 24),
('Diamond 3', 5, TRUE, 25),
('Diamond 2', 5, TRUE, 26),
('Diamond 1', 5, TRUE, 27),
-- Master tiers (5 tiers): 5 net wins each
('Master 5', 5, TRUE, 28),
('Master 4', 5, TRUE, 29),
('Master 3', 5, TRUE, 30),
('Master 2', 5, TRUE, 31),
('Master 1', 0, FALSE, 32) -- Master 1 is the highest tier
ON CONFLICT (sort_order) DO NOTHING;

-- Decks table - Master deck registry
CREATE TABLE IF NOT EXISTS decks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    image_url VARCHAR(500),
    image_filename VARCHAR(500),
    created_by VARCHAR(20) REFERENCES users(discord_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backgrounds table - Supporter custom backgrounds
CREATE TABLE IF NOT EXISTS backgrounds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    image_filename VARCHAR(500) NOT NULL,
    uploaded_by VARCHAR(20) NOT NULL REFERENCES users(discord_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session participants - User participation in sessions
CREATE TABLE IF NOT EXISTS session_participants (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(20) NOT NULL REFERENCES users(discord_id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_banned BOOLEAN DEFAULT FALSE,
    -- Ladder mode specific: initial rank when joining
    initial_tier_id INTEGER REFERENCES ladder_tiers(id),
    initial_net_wins INTEGER DEFAULT 0,
    UNIQUE(session_id, user_id)
);

-- Player session stats - Performance tracking per session
CREATE TABLE IF NOT EXISTS player_session_stats (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(20) NOT NULL REFERENCES users(discord_id),
    total_games INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    current_points INTEGER DEFAULT 0, -- Points/rating/net wins based on game mode
    current_tier_id INTEGER REFERENCES ladder_tiers(id), -- For ladder mode
    current_net_wins INTEGER DEFAULT 0, -- For ladder mode
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, user_id)
);

-- Duels table - Individual match records
CREATE TABLE IF NOT EXISTS duels (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(20) NOT NULL REFERENCES users(discord_id),
    player_deck_id INTEGER REFERENCES decks(id),
    opponent_deck_id INTEGER REFERENCES decks(id),
    coin_flip_won BOOLEAN DEFAULT FALSE,
    went_first BOOLEAN DEFAULT FALSE,
    result VARCHAR(10) NOT NULL CHECK (result IN ('win', 'loss')),
    points_change INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_admin_user ON sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_duels_session_user ON duels(session_id, user_id);
CREATE INDEX IF NOT EXISTS idx_duels_created_at ON duels(created_at);
CREATE INDEX IF NOT EXISTS idx_duels_decks ON duels(player_deck_id, opponent_deck_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_session_user ON player_session_stats(session_id, user_id);
CREATE INDEX IF NOT EXISTS idx_backgrounds_user ON backgrounds(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_backgrounds_user_selected ON users(selected_background_id);
CREATE INDEX IF NOT EXISTS idx_decks_name ON decks(name);

-- Add foreign key constraint for selected_background_id
ALTER TABLE users ADD CONSTRAINT fk_users_selected_background 
    FOREIGN KEY (selected_background_id) REFERENCES backgrounds(id);

-- Insert default system data
-- System user (kept for any future system-level operations)
INSERT INTO users (discord_id, username, is_admin, is_supporter) VALUES 
('1', 'System', TRUE, TRUE)
ON CONFLICT (discord_id) DO NOTHING;

-- Success message
SELECT 'Database schema initialized successfully!' AS message;