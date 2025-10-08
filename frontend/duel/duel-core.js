/**
 * Duel Screen Core Functionality
 * Handles session data, user stats, and navigation
 */

// Session data
let currentSession = null;
let userStats = null;

// Tab switching - same pattern as lobby
document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', () => {
    const tab = item.dataset.tab
    
    // Switch active menu item
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'))
    item.classList.add('active')
    
    // Switch active content
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'))
    document.getElementById(tab).classList.add('active')
    
    // Update title
    const titles = {
      'submit': 'Submit Duel',
      'personal-stats': 'Your Performance',
      'deck-winrates': 'Deck Performance',
      'matchup-matrix': 'Matchup Analysis',
      'duel-history': 'Duel History',
      'leaderboard': 'Session Rankings'
    }
    document.getElementById('page-title').textContent = titles[tab] || tab
  })
})

// Back button functionality
document.getElementById('back-btn').addEventListener('click', () => {
  // Navigate back to lobby
  window.location.href = '../lobby/index.html'
})

// Initialize session data from URL parameters or localStorage
async function initializeSession() {
  try {
    // Get session data from URL parameters (when coming from lobby)
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session')
    
    if (sessionId) {
      // Store session ID for future use
      localStorage.setItem('current_session_id', sessionId)
      await loadSessionData(sessionId)
    } else {
      // Try to get session from localStorage (page refresh)
      const storedSessionId = localStorage.getItem('current_session_id')
      if (storedSessionId) {
        await loadSessionData(storedSessionId)
      } else {
        // No session found, redirect to lobby
        console.error('No session found, redirecting to lobby')
        window.location.href = '../lobby/index.html'
        return
      }
    }
    
    // Load user stats after session is loaded
    await loadUserStats()
    
  } catch (error) {
    console.error('Failed to initialize session:', error)
    alert('Failed to load session data. Redirecting to lobby.')
    window.location.href = '../lobby/index.html'
  }
}

// Load session data from backend
async function loadSessionData(sessionId) {
  try {
    const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('duelytics_token')}`
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to load session data')
    }
    
    const data = await response.json()
    currentSession = data.session
    
    // Update session name in sidebar
    document.getElementById('session-name').textContent = currentSession.name
    
    console.log('📊 Session loaded:', currentSession.name)
    
  } catch (error) {
    console.error('Error loading session:', error)
    throw error
  }
}

// Load user stats for this session
async function loadUserStats() {
  try {
    if (!currentSession) return
    
    const response = await fetch(`http://localhost:3001/api/sessions/${currentSession.id}/stats`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('duelytics_token')}`
      }
    })
    
    if (!response.ok) {
      // User might not have stats yet (just joined)
      displayEmptyStats()
      return
    }
    
    const data = await response.json()
    userStats = data.stats
    
    displayUserStats()
    
  } catch (error) {
    console.error('Error loading user stats:', error)
    displayEmptyStats()
  }
}

// Display user stats in sidebar
function displayUserStats() {
  const rankElement = document.getElementById('user-rank')
  const recordElement = document.getElementById('user-record')
  
  if (!userStats) {
    displayEmptyStats()
    return
  }
  
  // Display based on game mode
  if (currentSession.game_mode === 'ladder') {
    // Show current rank
    rankElement.className = 'stat-display rank'
    rankElement.textContent = userStats.current_tier || 'Rookie 2'
    
  } else if (currentSession.game_mode === 'rated') {
    // Show current rating with 2 decimal places
    rankElement.className = 'stat-display points'
    const rating = parseFloat(userStats.current_points) || 1500
    console.log('🏆 Current rating from stats:', userStats.current_points, 'parsed:', rating);
    rankElement.textContent = `${rating.toFixed(2)} Rating`
    
  } else if (currentSession.game_mode === 'duelist_cup') {
    // Show current points
    rankElement.className = 'stat-display points'
    rankElement.textContent = `${userStats.current_points || 0} Points`
  }
  
  // Show win/loss record with colors
  recordElement.className = 'stat-display record'
  const wins = userStats.total_wins || 0
  const losses = userStats.total_losses || 0
  recordElement.innerHTML = `<span class="wins">${wins}W</span> - <span class="losses">${losses}L</span>`
}

// Display empty stats for new users
function displayEmptyStats() {
  const rankElement = document.getElementById('user-rank')
  const recordElement = document.getElementById('user-record')
  
  if (!currentSession) return
  
  // Display default values based on game mode
  if (currentSession.game_mode === 'ladder') {
    rankElement.className = 'stat-display rank'
    rankElement.textContent = 'Loading...'
    
  } else if (currentSession.game_mode === 'rated') {
    rankElement.className = 'stat-display points'
    const rating = parseFloat(currentSession.starting_rating) || 1500
    rankElement.textContent = `${rating.toFixed(2)} Rating`
    
  } else if (currentSession.game_mode === 'duelist_cup') {
    rankElement.className = 'stat-display points'
    rankElement.textContent = '0 Points'
  }
  
  recordElement.className = 'stat-display record'
  recordElement.innerHTML = '<span class="wins">0W</span> - <span class="losses">0L</span>'
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is authenticated
  const token = localStorage.getItem('duelytics_token')
  if (!token) {
    window.location.href = '../login/index.html'
    return
  }
  
  // Initialize session data
  initializeSession()
})