const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('./auth');

// Get sessions with optional status filter
router.get('/', async (req, res) => {
  try {
    const status = req.query.status || 'active';
    
    const result = await query(
      'SELECT id, name, game_mode, status, admin_user_id, starts_at, ends_at FROM sessions WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );
    
    res.json({
      success: true,
      sessions: result.rows
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Get specific session details
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await query(
      'SELECT id, name, game_mode, status, admin_user_id, starts_at, ends_at, starting_rating, point_value FROM sessions WHERE id = $1',
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
      success: true,
      session: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching session details:', error);
    res.status(500).json({ error: 'Failed to get session details' });
  }
});

// Check if user is a participant in a session
router.get('/:sessionId/participant-check', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;
    
    const result = await query(
      'SELECT id FROM session_participants WHERE session_id = $1 AND user_id = $2',
      [sessionId, userId]
    );
    
    res.json({
      success: true,
      isParticipant: result.rows.length > 0
    });
    
  } catch (error) {
    console.error('Error checking session participation:', error);
    res.status(500).json({ error: 'Failed to check participation' });
  }
});

// Get user's stats for a specific session
router.get('/:sessionId/stats', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;
    
    // Check if user is in this session
    const participantResult = await query(
      'SELECT id FROM session_participants WHERE session_id = $1 AND user_id = $2',
      [sessionId, userId]
    );
    
    if (participantResult.rows.length === 0) {
      return res.status(404).json({ error: 'You are not a participant in this session' });
    }
    
    // Get user's session stats
    const statsResult = await query(`
      SELECT 
        pss.current_points,
        pss.current_tier_id,
        pss.current_net_wins,
        pss.total_wins,
        pss.total_games,
        (pss.total_games - pss.total_wins) as total_losses,
        lt.tier_name as current_tier,
        s.game_mode,
        s.starting_rating
      FROM player_session_stats pss
      JOIN sessions s ON pss.session_id = s.id
      LEFT JOIN ladder_tiers lt ON pss.current_tier_id = lt.id
      WHERE pss.session_id = $1 AND pss.user_id = $2
    `, [sessionId, userId]);
    
    if (statsResult.rows.length === 0) {
      return res.status(404).json({ error: 'No stats found for this session' });
    }
    
    const stats = statsResult.rows[0];
    
    res.json({
      success: true,
      stats: {
        current_points: stats.current_points,
        current_tier_id: stats.current_tier_id,
        current_tier: stats.current_tier,
        current_net_wins: stats.current_net_wins,
        total_wins: stats.total_wins || 0,
        total_losses: stats.total_losses || 0,
        total_games: stats.total_games || 0,
        game_mode: stats.game_mode,
        starting_rating: stats.starting_rating
      }
    });
    
  } catch (error) {
    console.error('Error fetching user session stats:', error);
    res.status(500).json({ error: 'Failed to get session stats' });
  }
});

module.exports = router;
