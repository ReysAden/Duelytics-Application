-- Fix column types to support decimal values for rated mode
-- Run this in your PostgreSQL database

-- Fix points_change in duels table to support decimals (e.g., 7.5, -8.2)
ALTER TABLE duels ALTER COLUMN points_change TYPE NUMERIC(10,2);

-- Fix current_points in player_session_stats to support decimal ratings
ALTER TABLE player_session_stats ALTER COLUMN current_points TYPE NUMERIC(10,2);

-- Verify the changes
\d duels;
\d player_session_stats;

SELECT 'Database columns fixed to support decimal values!' AS message;