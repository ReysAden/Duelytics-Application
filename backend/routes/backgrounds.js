const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const { requireSupporter } = require('../middleware/auth');

// Configure multer for background uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/backgrounds');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage
  // No file restrictions per user request
});

// Serve uploaded background images
router.get('/uploads/backgrounds/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, '../uploads/backgrounds', filename);
  
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ error: 'Background image not found' });
  }
  
  // Set appropriate content type based on file extension
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', 
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff'
  };
  
  const contentType = contentTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  
  // Send the file
  res.sendFile(imagePath);
});

// Get user's backgrounds (supporter only)
router.get('/', requireSupporter, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, 
        name, 
        image_url, 
        image_filename,
        created_at
      FROM backgrounds 
      WHERE uploaded_by = $1
      ORDER BY created_at DESC
    `, [req.user.userId]);
    
    res.json({
      success: true,
      backgrounds: result.rows
    });
  } catch (error) {
    console.error('Error fetching backgrounds:', error);
    res.status(500).json({ error: 'Failed to get backgrounds' });
  }
});

// Upload new background (supporter only)
router.post('/', requireSupporter, upload.single('image'), async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Background name is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Background image is required' });
    }
    
    // Check if background name already exists for this user
    const existingBackground = await query(
      'SELECT id FROM backgrounds WHERE name = $1 AND uploaded_by = $2',
      [name, req.user.userId]
    );
    
    if (existingBackground.rows.length > 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Background name already exists' });
    }
    
    // Generate image URL
    const imageUrl = `/api/backgrounds/uploads/backgrounds/${req.file.filename}`;
    
    const insertQuery = `
      INSERT INTO backgrounds (name, image_url, image_filename, uploaded_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, image_url, image_filename, created_at
    `;
    
    const result = await query(insertQuery, [
      name,
      imageUrl,
      req.file.filename,
      req.user.userId
    ]);
    
    const newBackground = result.rows[0];
    
    console.log(`🖼️ Background created: ${newBackground.name} by ${req.user.username}`);
    
    res.status(201).json({
      success: true,
      message: `Background "${name}" uploaded successfully`,
      background: newBackground
    });
    
  } catch (error) {
    console.error('Error creating background:', error);
    
    // Clean up uploaded file if background creation failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to upload background' });
  }
});

// Set user's selected background (supporter only)
router.put('/select/:backgroundId', requireSupporter, async (req, res) => {
  try {
    const { backgroundId } = req.params;
    
    // Handle default background selection (clear selection)
    if (backgroundId === 'default') {
      // Clear user's selected background
      await query(
        'UPDATE users SET selected_background_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE discord_id = $1',
        [req.user.userId]
      );
      
      console.log(`🎨 User ${req.user.username} selected default background`);
      
      return res.json({
        success: true,
        message: 'Default background set successfully',
        backgroundId: 'default'
      });
    }
    
    // Verify the background exists and belongs to the user
    const backgroundResult = await query(
      'SELECT id, name FROM backgrounds WHERE id = $1 AND uploaded_by = $2',
      [backgroundId, req.user.userId]
    );
    
    if (backgroundResult.rows.length === 0) {
      return res.status(404).json({ error: 'Background not found or not owned by user' });
    }
    
    const background = backgroundResult.rows[0];
    
    // Update user's selected background
    await query(
      'UPDATE users SET selected_background_id = $1, updated_at = CURRENT_TIMESTAMP WHERE discord_id = $2',
      [backgroundId, req.user.userId]
    );
    
    console.log(`🎨 User ${req.user.username} selected background: ${background.name}`);
    
    res.json({
      success: true,
      message: `Background "${background.name}" set successfully`,
      backgroundId: backgroundId
    });
    
  } catch (error) {
    console.error('Error setting background:', error);
    res.status(500).json({ error: 'Failed to set background' });
  }
});

// Get user's current selected background
router.get('/current', requireSupporter, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        b.id, 
        b.name, 
        b.image_url, 
        b.image_filename
      FROM users u
      LEFT JOIN backgrounds b ON u.selected_background_id = b.id
      WHERE u.discord_id = $1
    `, [req.user.userId]);
    
    const user = result.rows[0];
    
    if (!user || !user.id) {
      // User has no selected background
      return res.json({
        success: true,
        background: null
      });
    }
    
    res.json({
      success: true,
      background: {
        id: user.id,
        name: user.name,
        imageUrl: user.image_url,
        imageFilename: user.image_filename
      }
    });
    
  } catch (error) {
    console.error('Error getting current background:', error);
    res.status(500).json({ error: 'Failed to get current background' });
  }
});

// Delete background (supporter can delete their own)
router.delete('/:backgroundId', requireSupporter, async (req, res) => {
  try {
    const { backgroundId } = req.params;
    
    // Get background info and verify ownership
    const backgroundResult = await query(
      'SELECT id, name, image_filename FROM backgrounds WHERE id = $1 AND uploaded_by = $2',
      [backgroundId, req.user.userId]
    );
    
    if (backgroundResult.rows.length === 0) {
      return res.status(404).json({ error: 'Background not found or not owned by user' });
    }
    
    const background = backgroundResult.rows[0];
    
    // Delete the background from database
    await query('DELETE FROM backgrounds WHERE id = $1', [backgroundId]);
    
    // Delete the image file
    if (background.image_filename) {
      const imagePath = path.join(__dirname, '../uploads/backgrounds', background.image_filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    console.log(`🗑️ Background deleted: ${background.name} by ${req.user.username}`);
    
    res.json({
      success: true,
      message: `Background "${background.name}" deleted successfully`
    });
    
  } catch (error) {
    console.error('Error deleting background:', error);
    res.status(500).json({ error: 'Failed to delete background' });
  }
});

module.exports = router;