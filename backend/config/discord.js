require('dotenv').config({ path: './.env' });
const passport = require('passport');
const { Strategy: DiscordStrategy } = require('passport-discord-auth');
const jwt = require('jsonwebtoken');
const { query } = require('./database');
const axios = require('axios');

// Discord OAuth Strategy
passport.use(new DiscordStrategy({
  clientId: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackUrl: process.env.DISCORD_REDIRECT_URI,
  scope: ['identify', 'guilds', 'guilds.members.read']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔐 Discord OAuth callback received for user:', profile.username);
    
    // Get user's guild member information to check roles
    const guildMember = await getGuildMember(accessToken, profile.id);
    
    // Extract user information
    const userData = {
      discord_id: profile.id,
      username: profile.username,
      avatar: profile.avatar,
      email: profile.email,
      access_token: accessToken,
      refresh_token: refreshToken,
      guild_roles: guildMember?.roles || [],
      is_admin: false // Will be updated based on roles
    };
    
    // Check if user has admin or supporter roles
    const hasAdminRole = userData.guild_roles.includes(process.env.DISCORD_ADMIN_ROLE_ID);
    const hasSupporterRole = userData.guild_roles.includes(process.env.DISCORD_SUPPORTER_ROLE_ID);
    
    userData.is_admin = hasAdminRole;
    userData.is_supporter = hasSupporterRole || hasAdminRole; // Admins are also supporters
    
    // Save or update user in database
    const user = await saveOrUpdateUser(userData);
    
    console.log(`✅ User authenticated: ${user.username} (Admin: ${user.is_admin}, Supporter: ${user.is_supporter})`);
    
    return done(null, user);
  } catch (error) {
    console.error('❌ Discord OAuth error:', error);
    return done(error, null);
  }
}));

// Passport serialization (required for session-based auth)
passport.serializeUser((user, done) => {
  done(null, user.discord_id);
});

passport.deserializeUser(async (discord_id, done) => {
  try {
    const result = await query('SELECT * FROM users WHERE discord_id = $1', [discord_id]);
    if (result.rows.length > 0) {
      done(null, result.rows[0]);
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error, null);
  }
});

// Get guild member information from Discord API
async function getGuildMember(accessToken, userId) {
  try {
    const response = await axios.get(
      `https://discord.com/api/v10/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Failed to fetch guild member info:', error.response?.data || error.message);
    return null;
  }
}

// Save or update user in database
async function saveOrUpdateUser(userData) {
  try {
    // Check if user exists
    const existingUser = await query(
      'SELECT * FROM users WHERE discord_id = $1',
      [userData.discord_id]
    );
    
    if (existingUser.rows.length > 0) {
      // Update existing user
      const updateQuery = `
        UPDATE users SET 
          username = $2,
          avatar = $3,
          email = $4,
          access_token = $5,
          refresh_token = $6,
          guild_roles = $7,
          is_admin = $8,
          is_supporter = $9,
          last_login = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE discord_id = $1
        RETURNING *
      `;
      
      const result = await query(updateQuery, [
        userData.discord_id,
        userData.username,
        userData.avatar,
        userData.email,
        userData.access_token,
        userData.refresh_token,
        userData.guild_roles,
        userData.is_admin,
        userData.is_supporter
      ]);
      
      return result.rows[0];
    } else {
      // Create new user
      const insertQuery = `
        INSERT INTO users (
          discord_id, username, avatar, email,
          access_token, refresh_token, guild_roles, is_admin, is_supporter,
          last_login, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const result = await query(insertQuery, [
        userData.discord_id,
        userData.username,
        userData.avatar,
        userData.email,
        userData.access_token,
        userData.refresh_token,
        userData.guild_roles,
        userData.is_admin,
        userData.is_supporter
      ]);
      
      return result.rows[0];
    }
  } catch (error) {
    console.error('Database error saving user:', error);
    throw error;
  }
}

// Generate JWT token for user
function generateJWT(user) {
  const payload = {
    userId: user.discord_id,
    username: user.username,
    isAdmin: user.is_admin,
    isSupporter: user.is_supporter,
    roles: user.guild_roles
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d' // Token expires in 7 days
  });
}

// Verify JWT token
function verifyJWT(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

module.exports = {
  generateJWT,
  verifyJWT,
  saveOrUpdateUser,
  getGuildMember
};