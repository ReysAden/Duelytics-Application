// Load environment variables
require('dotenv').config({ path: './backend/.env' });

const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');

// Database connection
const { connectDatabase, closeDatabase } = require('./config/database');

// Route imports
const duelRoutes = require('./routes/duels');
const sessionRoutes = require('./routes/sessions');
const adminRoutes = require('./routes/admin');
const deckRoutes = require('./routes/decks');
const backgroundRoutes = require('./routes/backgrounds');
const ladderTiersRoutes = require('./routes/ladder-tiers');
const sessionJoinRoutes = require('./routes/session-join');
const { router: authRoutes } = require('./routes/auth');

// Initialize Discord OAuth strategy
require('./config/discord');

const app = express();
const server = http.createServer(app);

// WebSocket setup - allow frontend connections
const io = new Server(server, {
  cors: {
    origin: "http://localhost:8080", // Vue dev server
    methods: ["GET", "POST"]
  }
});

// Basic middleware
app.use(cors());
app.use(express.json());

// Session middleware (required for Passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// API Routes
app.use('/api/duels', duelRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/backgrounds', backgroundRoutes);
app.use('/api/ladder-tiers', ladderTiersRoutes);
app.use('/api/sessions', sessionJoinRoutes);
app.use('/auth', authRoutes);

// Health check - simple way to verify server is running
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Duelytics server is running' 
  });
});

// Basic WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Handle user joining a session
  socket.on('join_session', (sessionId) => {
    socket.join(`session_${sessionId}`);
    console.log(`User ${socket.id} joined session ${sessionId}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Start server with database connection
const startServer = async () => {
  try {
    // Connect to database first
    await connectDatabase();
    
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚀 Duelytics server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 WebSocket ready for connections`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown - important for production
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  
  // Close server and database connections
  server.close(async () => {
    await closeDatabase();
    console.log('✅ Server closed cleanly');
    process.exit(0);
  });
});
