const { query } = require('../config/database');

// Game mode specific logic - clean separation of concerns
const gameModeHandlers = {
  
  ladder: {
    // Ladder uses net wins for tier progression
    calculatePointChange: (result) => {
      return result === 'win' ? 1 : -1; // Always +1 or -1 net wins
    },
    
    // Update player stats for ladder mode
    updatePlayerStats: async (sessionId, userId, result) => {
      const netWinChange = result === 'win' ? 1 : -1;
      
      const updateQuery = `
        UPDATE player_session_stats 
        SET 
          total_games = total_games + 1,
          total_wins = total_wins + $3,
          total_losses = total_losses + $4,
          current_net_wins = current_net_wins + $5,
          last_updated = CURRENT_TIMESTAMP
        WHERE session_id = $1 AND user_id = $2
      `;
      
      await query(updateQuery, [
        sessionId, 
        userId,
        result === 'win' ? 1 : 0,  // wins
        result === 'loss' ? 1 : 0, // losses  
        netWinChange               // net wins change
      ]);
    }
  },
  
  rated: {
    // Rated uses exact point values entered by user
    calculatePointChange: (userInputPoints) => {
      return parseInt(userInputPoints); // User enters exact amount
    },
    
    // Update player stats for rated mode
    updatePlayerStats: async (sessionId, userId, result, pointChange) => {
      const updateQuery = `
        UPDATE player_session_stats 
        SET 
          total_games = total_games + 1,
          total_wins = total_wins + $3,
          total_losses = total_losses + $4,
          current_points = current_points + $5,
          last_updated = CURRENT_TIMESTAMP
        WHERE session_id = $1 AND user_id = $2
      `;
      
      await query(updateQuery, [
        sessionId,
        userId,
        result === 'win' ? 1 : 0,
        result === 'loss' ? 1 : 0,
        pointChange
      ]);
    }
  },
  
  duelist_cup: {
    // Duelist Cup uses exact points but floors at 0
    calculatePointChange: async (sessionId, userId, userInputPoints) => {
      // Get current points to calculate floor
      const currentStats = await query(
        'SELECT current_points FROM player_session_stats WHERE session_id = $1 AND user_id = $2',
        [sessionId, userId]
      );
      
      const currentPoints = currentStats.rows[0]?.current_points || 0;
      const newPoints = currentPoints + parseInt(userInputPoints);
      
      // Floor at 0 - can't go below zero points
      return Math.max(0, newPoints) - currentPoints;
    },
    
    // Update player stats for duelist cup mode
    updatePlayerStats: async (sessionId, userId, result, pointChange) => {
      const updateQuery = `
        UPDATE player_session_stats 
        SET 
          total_games = total_games + 1,
          total_wins = total_wins + $3,
          total_losses = total_losses + $4,
          current_points = GREATEST(0, current_points + $5), -- Floor at 0
          last_updated = CURRENT_TIMESTAMP
        WHERE session_id = $1 AND user_id = $2
      `;
      
      await query(updateQuery, [
        sessionId,
        userId,
        result === 'win' ? 1 : 0,
        result === 'loss' ? 1 : 0,
        pointChange
      ]);
    }
  }
};

// Get the appropriate handler for a game mode
const getGameModeHandler = (gameMode) => {
  const handler = gameModeHandlers[gameMode];
  if (!handler) {
    throw new Error(`Unsupported game mode: ${gameMode}`);
  }
  return handler;
};

module.exports = {
  gameModeHandlers,
  getGameModeHandler
};