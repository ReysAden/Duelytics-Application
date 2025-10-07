/**
 * Sessions Tab Functionality
 * Handles active and archived sessions loading and interaction
 */

import { sessionsApi, ApiError } from '../shared/api.js';

// Session Management Functions
async function loadActiveSessions() {
  const loadingEl = document.getElementById('sessions-loading')
  const errorEl = document.getElementById('sessions-error')
  const selectionEl = document.getElementById('session-selection')
  const selectEl = document.getElementById('sessionSelect')
  
  // Show loading, hide others
  loadingEl.style.display = 'flex'
  errorEl.style.display = 'none'
  selectionEl.style.display = 'none'
  
  try {
    const response = await sessionsApi.getActive()
    
    // Clear existing options except the first one
    selectEl.innerHTML = '<option value="">Choose an active session...</option>'
    
    if (response.sessions && response.sessions.length > 0) {
      // Populate dropdown with sessions
      response.sessions.forEach(session => {
        const option = document.createElement('option')
        option.value = session.id
        option.textContent = formatSessionOption(session)
        option.dataset.sessionData = JSON.stringify(session)
        selectEl.appendChild(option)
      })
      
      // Show selection UI
      loadingEl.style.display = 'none'
      selectionEl.style.display = 'block'
    } else {
      // No sessions found
      showSessionsError('No active sessions found')
    }
  } catch (error) {
    showSessionsError(error.message || 'Failed to load sessions')
  }
}

async function loadArchivedSessions() {
  const loadingEl = document.getElementById('archived-loading')
  const errorEl = document.getElementById('archived-error')
  const selectionEl = document.getElementById('archived-selection')
  const selectEl = document.getElementById('archivedSelect')
  
  // Show loading, hide others
  loadingEl.style.display = 'flex'
  errorEl.style.display = 'none'
  selectionEl.style.display = 'none'
  
  try {
    const response = await sessionsApi.getArchived()
    
    // Clear existing options except the first one
    selectEl.innerHTML = '<option value="">Choose an archived session...</option>'
    
    if (response.sessions && response.sessions.length > 0) {
      // Populate dropdown with sessions
      response.sessions.forEach(session => {
        const option = document.createElement('option')
        option.value = session.id
        option.textContent = formatArchivedSessionOption(session)
        option.dataset.sessionData = JSON.stringify(session)
        selectEl.appendChild(option)
      })
      
      // Show selection UI
      loadingEl.style.display = 'none'
      selectionEl.style.display = 'block'
    } else {
      // No sessions found
      showArchivedError('No archived sessions found')
    }
  } catch (error) {
    showArchivedError(error.message || 'Failed to load archived sessions')
  }
}

function formatSessionOption(session) {
  const gameModeDisplay = {
    'ladder': 'Ladder Mode',
    'rated': 'Rated Mode',
    'duelist_cup': 'Duelist Cup'
  }[session.game_mode] || session.game_mode
  
  const endDate = new Date(session.ends_at)
  const now = new Date()
  const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
  
  let timeDisplay
  if (daysLeft > 0) {
    timeDisplay = `Ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
  } else {
    timeDisplay = 'Ending soon'
  }
  
  return `${session.name} - ${gameModeDisplay} - ${timeDisplay}`
}

function formatArchivedSessionOption(session) {
  const gameModeDisplay = {
    'ladder': 'Ladder Mode',
    'rated': 'Rated Mode',
    'duelist_cup': 'Duelist Cup'
  }[session.game_mode] || session.game_mode
  
  const endDate = new Date(session.ends_at)
  const completedDate = endDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  return `${session.name} - ${gameModeDisplay} - Completed ${completedDate}`
}

function showSessionsError(message) {
  const loadingEl = document.getElementById('sessions-loading')
  const errorEl = document.getElementById('sessions-error')
  const selectionEl = document.getElementById('session-selection')
  const errorMessageEl = document.getElementById('error-message')
  
  loadingEl.style.display = 'none'
  selectionEl.style.display = 'none'
  errorEl.style.display = 'flex'
  errorMessageEl.textContent = message
}

function showArchivedError(message) {
  const loadingEl = document.getElementById('archived-loading')
  const errorEl = document.getElementById('archived-error')
  const selectionEl = document.getElementById('archived-selection')
  const errorMessageEl = document.getElementById('archived-error-message')
  
  loadingEl.style.display = 'none'
  selectionEl.style.display = 'none'
  errorEl.style.display = 'flex'
  errorMessageEl.textContent = message
}

// Session selection handling
function handleSessionSelection() {
  const selectEl = document.getElementById('sessionSelect')
  const joinBtn = document.getElementById('joinBtn')
  
  if (selectEl && joinBtn) {
    selectEl.addEventListener('change', (e) => {
      const hasSelection = e.target.value !== ''
      joinBtn.disabled = !hasSelection
      
      if (hasSelection) {
        // Store selected session data for when user clicks join
        const selectedOption = e.target.selectedOptions[0]
        const sessionData = JSON.parse(selectedOption.dataset.sessionData)
        joinBtn.dataset.sessionData = JSON.stringify(sessionData)
      }
    })
    
    // Handle join button click
    joinBtn.addEventListener('click', () => {
      if (!joinBtn.disabled && joinBtn.dataset.sessionData) {
        const sessionData = JSON.parse(joinBtn.dataset.sessionData)
        handleJoinSession(sessionData)
      }
    })
  }
}

function handleArchivedSelection() {
  const selectEl = document.getElementById('archivedSelect')
  const viewBtn = document.getElementById('viewBtn')
  
  if (selectEl && viewBtn) {
    selectEl.addEventListener('change', (e) => {
      const hasSelection = e.target.value !== ''
      viewBtn.disabled = !hasSelection
      
      if (hasSelection) {
        // Store selected session data for when user clicks view
        const selectedOption = e.target.selectedOptions[0]
        const sessionData = JSON.parse(selectedOption.dataset.sessionData)
        viewBtn.dataset.sessionData = JSON.stringify(sessionData)
      }
    })
    
    // Handle view button click
    viewBtn.addEventListener('click', () => {
      if (!viewBtn.disabled && viewBtn.dataset.sessionData) {
        const sessionData = JSON.parse(viewBtn.dataset.sessionData)
        handleViewSession(sessionData)
      }
    })
  }
}

function handleJoinSession(session) {
  // TODO: Implement session joining logic
  alert(`Joining session: ${session.name}\\nThis feature will be implemented next!`)
}

function handleViewSession(session) {
  // TODO: Implement session viewing logic
  alert(`Viewing archived session: ${session.name}\\nThis feature will be implemented next!`)
}

// Tab change event listener
document.addEventListener('tabChanged', (event) => {
  const { tab, isInitial } = event.detail
  
  if (tab === 'active-sessions') {
    loadActiveSessions()
  } else if (tab === 'archived-sessions') {
    loadArchivedSessions()
  }
})

// Listen for session events to refresh lists
document.addEventListener('sessionCreated', (event) => {
  // Refresh active sessions list if we're on that tab
  const activeTab = document.querySelector('.menu-item.active')
  if (activeTab && activeTab.dataset.tab === 'active-sessions') {
    loadActiveSessions()
  }
})

document.addEventListener('sessionArchived', (event) => {
  // Refresh both active and archived sessions lists
  const activeTab = document.querySelector('.menu-item.active')
  if (activeTab && activeTab.dataset.tab === 'active-sessions') {
    loadActiveSessions()
  } else if (activeTab && activeTab.dataset.tab === 'archived-sessions') {
    loadArchivedSessions()
  }
})

document.addEventListener('sessionDeleted', (event) => {
  // Refresh both active and archived sessions lists
  const activeTab = document.querySelector('.menu-item.active')
  if (activeTab && activeTab.dataset.tab === 'active-sessions') {
    loadActiveSessions()
  } else if (activeTab && activeTab.dataset.tab === 'archived-sessions') {
    loadArchivedSessions()
  }
})

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Setup session selection handling
  handleSessionSelection()
  handleArchivedSelection()
  
  // Setup retry buttons
  const retryBtn = document.getElementById('retry-sessions')
  if (retryBtn) {
    retryBtn.addEventListener('click', loadActiveSessions)
  }
  
  const retryArchivedBtn = document.getElementById('retry-archived')
  if (retryArchivedBtn) {
    retryArchivedBtn.addEventListener('click', loadArchivedSessions)
  }
})

