const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { requireAdmin, requireSessionAdminOrSystemAdmin } = require('../middleware/auth');

// Create new session (admin only)
router.post('/sessions', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      gameMode,
      startsAt,
      endsAt,
      startingRating,
      pointValue
    } = req.body;
    
    // Validate required fields
    if (!name || !gameMode || !startsAt || !endsAt) {
      return res.status(400).json({
        error: 'Missing required fields: name, gameMode, startsAt, endsAt'
      });
    }
    
    // Validate game mode
    const validGameModes = ['ladder', 'rated', 'duelist_cup'];
    if (!validGameModes.includes(gameMode)) {
      return res.status(400).json({
        error: 'Invalid game mode. Must be: ladder, rated, or duelist_cup'
      });
    }
    
    // Set defaults based on game mode
    const defaultStartingRating = gameMode === 'duelist_cup' ? 0 : 1500;
    const defaultPointValue = gameMode === 'duelist_cup' ? 1000 : 7;
    
    const insertQuery = `
      INSERT INTO sessions (
        name, game_mode, admin_user_id, starts_at, ends_at, 
        starting_rating, point_value, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING id, name, game_mode, starts_at, ends_at
    `;
    
    const result = await query(insertQuery, [
      name,
      gameMode,
      req.user.userId,
      startsAt,
      endsAt,
      startingRating || defaultStartingRating,
      pointValue || defaultPointValue
    ]);
    
    const newSession = result.rows[0];
    
    console.log(`✅ Session created: ${newSession.name} (${gameMode}) by ${req.user.username}`);
    
    res.status(201).json({
      success: true,
      message: `${gameMode} session "${name}" created successfully`,
      session: newSession
    });
    
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Archive session (admin only)
router.patch('/sessions/:sessionId/archive', requireSessionAdminOrSystemAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Archive the session
    await query(
      'UPDATE sessions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['archived', sessionId]
    );
    
    console.log(`📦 Session archived: ${req.sessionData.name} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: `Session "${req.sessionData.name}" archived successfully`
    });
    
  } catch (error) {
    console.error('Error archiving session:', error);
    res.status(500).json({ error: 'Failed to archive session' });
  }
});

// Delete session (admin only)
router.delete('/sessions/:sessionId', requireSessionAdminOrSystemAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Check if session exists and get name for logging
    const sessionCheck = await query(
      'SELECT name FROM sessions WHERE id = $1',
      [sessionId]
    );
    
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const sessionName = sessionCheck.rows[0].name;
    
    // Delete all related data first (foreign key constraints)
    await query('DELETE FROM player_session_stats WHERE session_id = $1', [sessionId]);
    await query('DELETE FROM session_participants WHERE session_id = $1', [sessionId]);
    await query('DELETE FROM duels WHERE session_id = $1', [sessionId]);
    
    // Finally delete the session
    await query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    
    console.log(`🗑️ Session deleted: ${sessionName} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: `Session "${sessionName}" deleted successfully`
    });
    
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Get session participants (admin only)
router.get('/sessions/:sessionId/participants', requireSessionAdminOrSystemAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await query(`
      SELECT 
        sp.user_id,
        u.username,
        sp.joined_at,
        sp.is_banned,
        pss.total_games,
        pss.total_wins,
        pss.current_points,
        lt.tier_name
      FROM session_participants sp
      LEFT JOIN users u ON sp.user_id = u.discord_id
      LEFT JOIN player_session_stats pss ON sp.session_id = pss.session_id AND sp.user_id = pss.user_id
      LEFT JOIN ladder_tiers lt ON pss.current_tier_id = lt.id
      WHERE sp.session_id = $1
      ORDER BY pss.current_points DESC NULLS LAST, sp.joined_at ASC
    `, [sessionId]);
    
    res.json({
      success: true,
      participants: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Failed to get participants' });
  }
});

module.exports = router;