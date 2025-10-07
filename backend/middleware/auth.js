const { verifyJWT } = require('../config/discord');

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

// Middleware to require admin privileges
function requireAdmin(req, res, next) {
  // First authenticate the token
  authenticateToken(req, res, (err) => {
    if (err || !req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user has admin privileges
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        error: 'Admin privileges required',
        userRole: req.user.isSupporter ? 'supporter' : 'user'
      });
    }
    
    console.log(`🔐 Admin access granted to ${req.user.username}`);
    next();
  });
}

// Middleware to require supporter privileges (includes admin)
function requireSupporter(req, res, next) {
  // First authenticate the token
  authenticateToken(req, res, (err) => {
    if (err || !req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user has supporter or admin privileges
    if (!req.user.isSupporter && !req.user.isAdmin) {
      return res.status(403).json({ 
        error: 'Supporter privileges required',
        userRole: 'user'
      });
    }
    
    console.log(`🎗️ Supporter access granted to ${req.user.username}`);
    next();
  });
}

// Middleware to optionally authenticate (won't fail if no token provided)
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    const user = verifyJWT(token);
    if (user) {
      req.user = user;
    }
  }
  
  // Always proceed, even if no valid token
  next();
}

// Check if user is session admin or system admin
async function requireSessionAdminOrSystemAdmin(req, res, next) {
  const { query } = require('../config/database');
  
  // First authenticate the token
  authenticateToken(req, res, async (err) => {
    if (err || !req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
      }
      
      // Get session admin info
      const sessionResult = await query(
        'SELECT admin_user_id, name FROM sessions WHERE id = $1',
        [sessionId]
      );
      
      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      const session = sessionResult.rows[0];
      
      // Check if user is session admin or system admin
      const isSessionAdmin = session.admin_user_id === req.user.userId;
      const isSystemAdmin = req.user.isAdmin;
      
      if (!isSessionAdmin && !isSystemAdmin) {
        return res.status(403).json({ 
          error: 'Session admin or system admin privileges required',
          sessionAdmin: session.admin_user_id,
          currentUser: req.user.userId
        });
      }
      
      req.sessionData = session;
      req.isSessionAdmin = isSessionAdmin;
      req.isSystemAdmin = isSystemAdmin;
      
      console.log(`👑 Session admin access granted to ${req.user.username} for session "${session.name}"`);
      next();
      
    } catch (error) {
      console.error('Session admin check error:', error);
      res.status(500).json({ error: 'Failed to verify session permissions' });
    }
  });
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireSupporter,
  optionalAuth,
  requireSessionAdminOrSystemAdmin
};