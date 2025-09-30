const express = require('express');
const router = express.Router();
const { getGameModeHandler } = require('../services/game-modes');
const { calculateTierProgression, initializePlayerStats } = require('../services/tier-progression');
const { query } = require('../config/database');

// Submit a duel result
router.post('/', async (req, res) => {
  try {
    const {
      sessionId,
      userId,
      playerDeckId,
      opponentDeckId,
      result, // 'win' or 'loss'
      coinFlipWon,
      wentFirst,
      pointsInput // User-entered points (for rated/duelist_cup)
    } = req.body;

    // Validate required fields
    if (!sessionId || !userId || !result) {
      return res.status(400).json({ 
        error: 'Missing required fields: sessionId, userId, result' 
      });
    }

    // Get session info to determine game mode
    const sessionResult = await query(
      'SELECT id, name, game_mode, starting_rating, point_value FROM sessions WHERE id = $1',
      [sessionId]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = sessionResult.rows[0];

    console.log(`🎯 Processing ${session.game_mode} duel: ${result} for user ${userId}`);

    // Initialize player stats if first time in session
    await initializePlayerStats(sessionId, userId, session);

    // Get game mode handler
    const gameHandler = getGameModeHandler(session.game_mode);
    
    // Calculate points based on game mode
    let pointsChange;
    if (session.game_mode === 'ladder') {
      pointsChange = gameHandler.calculatePointChange(result);
    } else if (session.game_mode === 'duelist_cup') {
      pointsChange = await gameHandler.calculatePointChange(sessionId, userId, pointsInput || 0);
    } else {
      pointsChange = gameHandler.calculatePointChange(pointsInput || 0);
    }

    // Save the duel
    const duelData = {
      sessionId,
      userId,
      playerDeckId: playerDeckId || 1,
      opponentDeckId: opponentDeckId || 2,
      coinFlipWon: coinFlipWon || false,
      wentFirst: wentFirst || false,
      result,
      pointsChange
    };

    // Save duel to database
    const insertDuelQuery = `
      INSERT INTO duels (
        session_id, user_id, player_deck_id, opponent_deck_id,
        coin_flip_won, went_first, result, points_change
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    const duelResult = await query(insertDuelQuery, [
      sessionId,
      userId,
      playerDeckId || 1,
      opponentDeckId || 2,
      coinFlipWon || false,
      wentFirst || false,
      result,
      pointsChange
    ]);
    
    const duelId = duelResult.rows[0].id;

    // Update player stats
    await gameHandler.updatePlayerStats(sessionId, userId, result, pointsChange);

    // Check for tier progression (ladder mode only)
    let tierProgression = { type: 'none' };
    if (session.game_mode === 'ladder') {
      tierProgression = await calculateTierProgression(sessionId, userId, session.game_mode);
    }

    // Prepare response
    const response = {
      success: true,
      duelId,
      gameMode: session.game_mode,
      result,
      pointsChange,
      tierProgression
    };

    // Add game mode specific info
    if (session.game_mode === 'ladder') {
      response.message = `${result === 'win' ? 'Victory!' : 'Defeat'} Net wins: ${pointsChange > 0 ? '+' : ''}${pointsChange}`;
    } else {
      response.message = `${result === 'win' ? 'Victory!' : 'Defeat'} Points: ${pointsChange > 0 ? '+' : ''}${pointsChange}`;
    }

    // Add tier progression message if applicable
    if (tierProgression.type !== 'none') {
      response.message += ` | ${tierProgression.message}`;
    }

    console.log(`✅ Duel processed: ${response.message}`);
    res.json(response);

  } catch (error) {
    console.error('❌ Error processing duel:', error);
    res.status(500).json({ 
      error: 'Failed to process duel',
      details: error.message 
    });
  }
});

// Get duel history for a session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const duels = mockData.duels.filter(d => d.sessionId == sessionId);
    
    res.json({
      success: true,
      duels: duels.slice(-10) // Return last 10 duels
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get duel history' });
  }
});

module.exports = router;