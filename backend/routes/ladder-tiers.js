const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

// Get all ladder tiers
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, 
        tier_name, 
        wins_required, 
        can_demote_from, 
        sort_order
      FROM ladder_tiers 
      ORDER BY sort_order ASC
    `);
    
    res.json({
      success: true,
      tiers: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching ladder tiers:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch ladder tiers' 
    });
  }
});

module.exports = router;