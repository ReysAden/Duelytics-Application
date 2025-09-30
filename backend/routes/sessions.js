const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// Get all active sessions
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, game_mode, status, admin_user_id, starts_at, ends_at FROM sessions WHERE status = $1 ORDER BY created_at DESC',
      ['active']
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

module.exports = router;