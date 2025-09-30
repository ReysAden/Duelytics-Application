const { query } = require('../config/database');

// Calculate tier changes for immediate visual feedback
const calculateTierProgression = async (sessionId, userId, gameMode) => {
  console.log(`🔍 Calculating tier progression: ${gameMode} mode for user ${userId}`);
  
  // Only ladder mode has tier progression
  if (gameMode !== 'ladder') {
    console.log('⏭️ Skipping tier progression (not ladder mode)');
    return { type: 'none' };
  }
  
  try {
    // Get current player stats and tier info
    const playerQuery = `
      SELECT 
        pss.current_net_wins,
        pss.current_tier_id,
        lt.tier_name,
        lt.wins_required,
        lt.can_demote_from,
        lt.sort_order
      FROM player_session_stats pss
      LEFT JOIN ladder_tiers lt ON pss.current_tier_id = lt.id
      WHERE pss.session_id = $1 AND pss.user_id = $2
    `;
    
    const result = await query(playerQuery, [sessionId, userId]);
    const playerData = result.rows[0];
    
    console.log(`📊 Query result:`, result.rows);
    
    if (!playerData) {
      console.warn(`No player data found for session ${sessionId}, user ${userId}`);
      return { type: 'none' };
    }
    
    const { current_net_wins, current_tier_id, wins_required, can_demote_from, sort_order } = playerData;
    
    console.log(`🎯 Player stats: ${current_net_wins} net wins, needs ${wins_required} for promotion`);
    
    // Check for promotion (net wins >= required wins for next tier)
    if (current_net_wins >= wins_required) {
      console.log('🎆 Promotion criteria met!');
    } else {
      console.log(`🔄 No promotion: ${current_net_wins} < ${wins_required}`);
    }
    
    if (current_net_wins >= wins_required) {
      const nextTier = await getNextTier(sort_order);
      if (nextTier) {
        await promoteTier(sessionId, userId, nextTier.id, current_net_wins - wins_required);
        return {
          type: 'promotion',
          newTier: nextTier,
          message: `🎉 Promoted to ${nextTier.tier_name}!`
        };
      }
    }
    
    // Check for demotion (net wins < 0 and can demote)
    if (current_net_wins < 0 && can_demote_from) {
      const previousTier = await getPreviousTier(sort_order);
      if (previousTier) {
        // Reset net wins to previous tier's requirement + current deficit
        const newNetWins = previousTier.wins_required + current_net_wins;
        await demoteTier(sessionId, userId, previousTier.id, newNetWins);
        return {
          type: 'demotion', 
          newTier: previousTier,
          message: `📉 Demoted to ${previousTier.tier_name}`
        };
      }
    }
    
    return { type: 'none' };
    
  } catch (error) {
    console.error('Error calculating tier progression:', error);
    return { type: 'error', message: 'Failed to calculate tier progression' };
  }
};

// Get next tier in progression
const getNextTier = async (currentSortOrder) => {
  const result = await query(
    'SELECT id, tier_name, wins_required, sort_order FROM ladder_tiers WHERE sort_order = $1',
    [currentSortOrder + 1]
  );
  return result.rows[0] || null;
};

// Get previous tier for demotion
const getPreviousTier = async (currentSortOrder) => {
  const result = await query(
    'SELECT id, tier_name, wins_required, sort_order FROM ladder_tiers WHERE sort_order = $1',
    [currentSortOrder - 1]
  );
  return result.rows[0] || null;
};

// Promote player to next tier
const promoteTier = async (sessionId, userId, newTierId, remainingNetWins) => {
  const updateQuery = `
    UPDATE player_session_stats 
    SET 
      current_tier_id = $3,
      current_net_wins = $4,
      last_updated = CURRENT_TIMESTAMP
    WHERE session_id = $1 AND user_id = $2
  `;
  
  await query(updateQuery, [sessionId, userId, newTierId, remainingNetWins]);
};

// Demote player to previous tier  
const demoteTier = async (sessionId, userId, newTierId, newNetWins) => {
  const updateQuery = `
    UPDATE player_session_stats 
    SET 
      current_tier_id = $3,
      current_net_wins = $4,
      last_updated = CURRENT_TIMESTAMP
    WHERE session_id = $1 AND user_id = $2
  `;
  
  await query(updateQuery, [sessionId, userId, newTierId, newNetWins]);
};

// Initialize player in session (create stats record if doesn't exist)
const initializePlayerStats = async (sessionId, userId, sessionData) => {
  // Get starting tier (lowest tier - Rookie 2)
  const startingTierResult = await query(
    'SELECT id FROM ladder_tiers ORDER BY sort_order ASC LIMIT 1'
  );
  const startingTierId = startingTierResult.rows[0]?.id;
  
  const insertQuery = `
    INSERT INTO player_session_stats (
      session_id, 
      user_id, 
      current_points,
      current_tier_id,
      current_net_wins
    ) VALUES ($1, $2, $3, $4, 0)
    ON CONFLICT (session_id, user_id) DO NOTHING
  `;
  
  await query(insertQuery, [
    sessionId, 
    userId, 
    sessionData.starting_rating || 0,
    sessionData.game_mode === 'ladder' ? startingTierId : null
  ]);
};

module.exports = {
  calculateTierProgression,
  initializePlayerStats
};