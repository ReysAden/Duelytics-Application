const express = require('express');
const passport = require('passport');
const router = express.Router();
const { generateJWT, verifyJWT } = require('../config/discord');
const { query } = require('../config/database');

// Initialize Discord OAuth strategy
require('../config/discord');

// Start Discord OAuth flow
router.get('/discord', passport.authenticate('discord'));

// Discord OAuth callback
router.get('/discord/callback', 
  passport.authenticate('discord', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  async (req, res) => {
    try {
      // Generate JWT token for the authenticated user
      const token = generateJWT(req.user);
      
      // In a production app, you might want to redirect to your frontend with the token
      // For now, we'll return the token as JSON for testing
      res.json({
        success: true,
        message: 'Authentication successful',
        token: token,
        user: {
          id: req.user.discord_id,
          username: req.user.username,
          avatar: req.user.avatar,
          isAdmin: req.user.is_admin,
          isSupporter: req.user.is_supporter
        }
      });
      
      console.log(`🎉 User ${req.user.username} successfully authenticated with JWT token`);
      
    } catch (error) {
      console.error('Error in OAuth callback:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Authentication failed' 
      });
    }
  }
);

// Get current user info (requires valid JWT token)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Fetch fresh user data from database
    const result = await query(
      'SELECT discord_id, username, avatar, email, is_admin, is_supporter, guild_roles, last_login FROM users WHERE discord_id = $1',
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      success: true,
      user: {
        id: user.discord_id,
        username: user.username,
        avatar: user.avatar,
        email: user.email,
        isAdmin: user.is_admin,
        isSupporter: user.is_supporter,
        roles: user.guild_roles,
        lastLogin: user.last_login
      }
    });
    
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Logout (invalidate token - in a real app you'd want to blacklist the token)
router.post('/logout', authenticateToken, (req, res) => {
  // In a production app, you'd add the token to a blacklist
  // For now, we'll just return success and let the client delete the token
  
  console.log(`👋 User ${req.user.username} logged out`);
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Refresh user roles (re-fetch from Discord)
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    // Get user's current access token
    const userResult = await query(
      'SELECT access_token FROM users WHERE discord_id = $1',
      [req.user.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { access_token } = userResult.rows[0];
    
    // Re-fetch guild member info from Discord
    const { getGuildMember } = require('../config/discord');
    const guildMember = await getGuildMember(access_token, req.user.userId);
    
    if (!guildMember) {
      return res.status(400).json({ error: 'Failed to fetch updated role information' });
    }
    
    // Update user roles in database
    const hasAdminRole = guildMember.roles.includes(process.env.DISCORD_ADMIN_ROLE_ID);
    const hasSupporterRole = guildMember.roles.includes(process.env.DISCORD_SUPPORTER_ROLE_ID);
    
    await query(`
      UPDATE users SET 
        guild_roles = $1,
        is_admin = $2,
        is_supporter = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE discord_id = $4
    `, [
      guildMember.roles,
      hasAdminRole,
      hasSupporterRole || hasAdminRole,
      req.user.userId
    ]);
    
    console.log(`🔄 Refreshed roles for user ${req.user.username}`);
    
    res.json({
      success: true,
      message: 'Roles refreshed successfully',
      roles: {
        isAdmin: hasAdminRole,
        isSupporter: hasSupporterRole || hasAdminRole,
        guildRoles: guildMember.roles
      }
    });
    
  } catch (error) {
    console.error('Error refreshing user roles:', error);
    res.status(500).json({ error: 'Failed to refresh roles' });
  }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  const user = verifyJWT(token);
  if (!user) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
  
  req.user = user;
  next();
}

module.exports = { router, authenticateToken };