const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken } = require('./auth');

// Join a session
router.post('/join', authenticateToken, async (req, res) => {
  try {
    const { sessionId, initialTierId, initialNetWins } = req.body;
    const userId = req.user.userId;

    console.log(`🎯 User ${req.user.username} attempting to join session ${sessionId}`);

    // Validate session exists and is active
    const sessionResult = await query(
      'SELECT id, name, game_mode, status FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Check if user is already in this session
    const existingParticipant = await query(
      'SELECT id FROM session_participants WHERE session_id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (existingParticipant.rows.length > 0) {
      console.log(`📝 User ${req.user.username} is already in session ${session.name}, allowing rejoin`);
      return res.json({
        success: true,
        message: `Welcome back to ${session.name}`,
        session: {
          id: session.id,
          name: session.name,
          game_mode: session.game_mode
        },
        rejoined: true
      });
    }

    // For ladder sessions, require initial tier data
    if (session.game_mode === 'ladder') {
      if (!initialTierId || initialNetWins === undefined) {
        return res.status(400).json({ 
          error: 'Initial tier and net wins are required for ladder sessions' 
        });
      }

      // Validate the tier exists
      const tierResult = await query(
        'SELECT id, tier_name FROM ladder_tiers WHERE id = $1',
        [initialTierId]
      );

      if (tierResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid tier selected' });
      }
    }

    // Add user to session participants
    const participantQuery = `
      INSERT INTO session_participants (
        session_id, user_id, initial_tier_id, initial_net_wins
      ) VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

    await query(participantQuery, [
      sessionId,
      userId, 
      initialTierId || null,
      initialNetWins || 0
    ]);

    // Initialize player stats
    const statsQuery = `
      INSERT INTO player_session_stats (
        session_id, user_id, current_points, current_tier_id, current_net_wins
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (session_id, user_id) DO NOTHING
    `;

    const startingPoints = session.game_mode === 'rated' ? session.starting_rating || 1500 : 0;
    
    await query(statsQuery, [
      sessionId,
      userId,
      startingPoints,
      initialTierId || null,
      initialNetWins || 0
    ]);

    console.log(`✅ User ${req.user.username} joined session: ${session.name}`);

    res.json({
      success: true,
      message: `Successfully joined ${session.name}`,
      session: {
        id: session.id,
        name: session.name,
        game_mode: session.game_mode
      }
    });

  } catch (error) {
    console.error('Error joining session:', error);
    res.status(500).json({ error: 'Failed to join session' });
  }
});

module.exports = router;