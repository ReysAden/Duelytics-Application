const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// Middleware to check admin permissions for deck management
const requireAdmin = async (req, res, next) => {
  try {
    // For deck routes, check userId from query params or body
    const userId = req.body.userId || req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    
    const userResult = await query(
      'SELECT is_admin, guild_roles FROM users WHERE discord_id = $1',
      [userId]
    );
    
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user is admin
    const isAdmin = user.is_admin || (user.guild_roles && user.guild_roles.includes('admin'));
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    
    req.user = user;
    req.userId = userId;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Get all decks (public - used for duel submission)
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, 
        name, 
        image_url, 
        image_filename,
        created_at
      FROM decks 
      ORDER BY name ASC
    `);
    
    res.json({
      success: true,
      decks: result.rows
    });
  } catch (error) {
    console.error('Error fetching decks:', error);
    res.status(500).json({ error: 'Failed to get decks' });
  }
});

// Create new deck (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, imageUrl, imageFilename } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Deck name is required' });
    }
    
    // Check if deck name already exists
    const existingDeck = await query(
      'SELECT id FROM decks WHERE name = $1',
      [name]
    );
    
    if (existingDeck.rows.length > 0) {
      return res.status(400).json({ error: 'Deck name already exists' });
    }
    
    const insertQuery = `
      INSERT INTO decks (name, image_url, image_filename, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, image_url, image_filename, created_at
    `;
    
    const result = await query(insertQuery, [
      name,
      imageUrl || null,
      imageFilename || null,
      req.userId
    ]);
    
    const newDeck = result.rows[0];
    
    console.log(`✅ Deck created: ${newDeck.name} by ${req.userId}`);
    
    res.status(201).json({
      success: true,
      message: `Deck "${name}" created successfully`,
      deck: newDeck
    });
    
  } catch (error) {
    console.error('Error creating deck:', error);
    res.status(500).json({ error: 'Failed to create deck' });
  }
});

// Update deck (admin only)
router.patch('/:deckId', requireAdmin, async (req, res) => {
  try {
    const { deckId } = req.params;
    const { name, imageUrl, imageFilename } = req.body;
    
    // Check if deck exists
    const existingDeck = await query(
      'SELECT id, name FROM decks WHERE id = $1',
      [deckId]
    );
    
    if (existingDeck.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    
    if (imageUrl !== undefined) {
      updates.push(`image_url = $${paramCount}`);
      values.push(imageUrl);
      paramCount++;
    }
    
    if (imageFilename !== undefined) {
      updates.push(`image_filename = $${paramCount}`);
      values.push(imageFilename);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const updateQuery = `
      UPDATE decks 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, image_url, image_filename
    `;
    
    values.push(deckId);
    const result = await query(updateQuery, values);
    
    const updatedDeck = result.rows[0];
    
    console.log(`✅ Deck updated: ${updatedDeck.name} by ${req.userId}`);
    
    res.json({
      success: true,
      message: `Deck "${updatedDeck.name}" updated successfully`,
      deck: updatedDeck
    });
    
  } catch (error) {
    console.error('Error updating deck:', error);
    res.status(500).json({ error: 'Failed to update deck' });
  }
});

// Delete deck (admin only)
router.delete('/:deckId', requireAdmin, async (req, res) => {
  try {
    const { deckId } = req.params;
    
    // Check if deck exists
    const existingDeck = await query(
      'SELECT id, name FROM decks WHERE id = $1',
      [deckId]
    );
    
    if (existingDeck.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    const deck = existingDeck.rows[0];
    
    // Check if deck is used in any duels
    const duelCount = await query(
      'SELECT COUNT(*) as count FROM duels WHERE player_deck_id = $1 OR opponent_deck_id = $1',
      [deckId]
    );
    
    if (parseInt(duelCount.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete deck: it has been used in duels. Consider archiving instead.' 
      });
    }
    
    // Delete the deck
    await query('DELETE FROM decks WHERE id = $1', [deckId]);
    
    console.log(`🗑️ Deck deleted: ${deck.name} by ${req.userId}`);
    
    res.json({
      success: true,
      message: `Deck "${deck.name}" deleted successfully`
    });
    
  } catch (error) {
    console.error('Error deleting deck:', error);
    res.status(500).json({ error: 'Failed to delete deck' });
  }
});

// Get deck statistics
router.get('/:deckId/stats', async (req, res) => {
  try {
    const { deckId } = req.params;
    
    // Get overall deck stats across all sessions
    const statsQuery = `
      SELECT 
        COUNT(CASE WHEN result = 'win' THEN 1 END) as wins,
        COUNT(CASE WHEN result = 'loss' THEN 1 END) as losses,
        COUNT(*) as total_games,
        ROUND(
          COUNT(CASE WHEN result = 'win' THEN 1 END)::numeric / 
          NULLIF(COUNT(*), 0) * 100, 
          2
        ) as win_rate
      FROM duels 
      WHERE player_deck_id = $1
    `;
    
    const result = await query(statsQuery, [deckId]);
    const stats = result.rows[0];
    
    res.json({
      success: true,
      stats: {
        wins: parseInt(stats.wins) || 0,
        losses: parseInt(stats.losses) || 0,
        totalGames: parseInt(stats.total_games) || 0,
        winRate: parseFloat(stats.win_rate) || 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching deck stats:', error);
    res.status(500).json({ error: 'Failed to get deck statistics' });
  }
});

module.exports = router;