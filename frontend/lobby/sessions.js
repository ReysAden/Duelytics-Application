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
      
      // Hide ladder section if it's showing from a previous selection
      const ladderSection = document.getElementById('ladder-rank-section');
      if (ladderSection && ladderSection.classList.contains('show')) {
        hideLadderRankSection();
      }
      
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

async function handleJoinSession(session) {
  try {
    if (session.game_mode === 'ladder') {
      // Check if user is already in this ladder session
      const isAlreadyParticipant = await checkIfUserInSession(session.id);
      
      if (isAlreadyParticipant) {
        // User is already in this session, join directly
        await joinSessionDirect(session);
      } else {
        // Show the inline rank selection for new participants
        await showLadderRankSection(session);
      }
    } else {
      // For non-ladder sessions, join directly
      await joinSessionDirect(session);
    }
  } catch (error) {
    console.error('Failed to join session:', error);
    alert(`Failed to join session: ${error.message}`);
  }
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
  
  // Initialize ladder rank section
  initializeLadderRankSection();
})

// Helper function to check if user is already in a session
async function checkIfUserInSession(sessionId) {
  try {
    const response = await fetch(`http://localhost:3001/api/sessions/${sessionId}/participant-check`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('duelytics_token')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.isParticipant;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking session participation:', error);
    return false;
  }
}

// Ladder Rank Section Functions
let currentLadderSession = null;
let ladderTiers = [];

async function showLadderRankSection(session) {
  currentLadderSession = session;
  
  // Load ladder tiers if not already loaded
  if (ladderTiers.length === 0) {
    await loadLadderTiers();
  }
  
  // Populate tier dropdown
  populateLadderTiers();
  
  // Show inline section with animation
  const section = document.getElementById('ladder-rank-section');
  section.style.display = 'block';
  setTimeout(() => section.classList.add('show'), 10);
  
  // Reset form
  document.getElementById('ladderTier').value = '';
  document.getElementById('ladderNetWins').value = 0;
  document.getElementById('confirmLadderBtn').disabled = true;
  document.getElementById('tierInfo').style.display = 'none';
  
  // Hide the main join button
  document.getElementById('joinBtn').style.display = 'none';
}

async function loadLadderTiers() {
  try {
    // Call backend API to get ladder tiers
    const response = await fetch('http://localhost:3001/api/ladder-tiers', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('duelytics_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load ladder tiers');
    }
    
    const data = await response.json();
    ladderTiers = data.tiers || [];
  } catch (error) {
    console.error('Failed to load ladder tiers:', error);
    alert('Failed to load ladder tiers from server. Please try again.');
    throw error;
  }
}

function populateLadderTiers() {
  const select = document.getElementById('ladderTier');
  
  // Clear existing options except the first
  select.innerHTML = '<option value="">Select your current tier...</option>';
  
  // Add tiers in reverse order (highest to lowest)
  ladderTiers
    .sort((a, b) => b.sort_order - a.sort_order)
    .forEach(tier => {
      const option = document.createElement('option');
      option.value = tier.id;
      option.textContent = tier.tier_name; // tier_name already includes level (e.g., 'Bronze 5')
      option.dataset.winsRequired = tier.wins_required;
      option.dataset.tierName = tier.tier_name;
      select.appendChild(option);
    });
}

function initializeLadderRankSection() {
  const tierSelect = document.getElementById('ladderTier');
  const netWinsInput = document.getElementById('ladderNetWins');
  const confirmBtn = document.getElementById('confirmLadderBtn');
  const cancelBtn = document.getElementById('cancelLadderBtn');
  const tierInfo = document.getElementById('tierInfo');
  
  // Handle tier selection change
  tierSelect.addEventListener('change', function() {
    const selectedOption = this.selectedOptions[0];
    
    if (selectedOption.value) {
      const winsRequired = parseInt(selectedOption.dataset.winsRequired);
      const tierName = selectedOption.dataset.tierName;
      
      // Update net wins input max value
      netWinsInput.max = Math.max(winsRequired - 1, 0);
      netWinsInput.value = 0;
      
      // Show tier info
      tierInfo.innerHTML = `
        <strong>Tier Info:</strong> You need ${winsRequired} net wins to advance from ${tierName}. 
        Enter your current progress (0-${Math.max(winsRequired - 1, 0)}).
      `;
      tierInfo.style.display = 'block';
    } else {
      tierInfo.style.display = 'none';
    }
    
    validateLadderForm();
  });
  
  // Handle net wins input change
  netWinsInput.addEventListener('input', validateLadderForm);
  
  // Handle confirm button click
  confirmBtn.addEventListener('click', async function() {
    await handleLadderFormSubmit();
  });
  
  // Handle cancel button click
  cancelBtn.addEventListener('click', function() {
    hideLadderRankSection();
  });
}

function validateLadderForm() {
  const tierSelect = document.getElementById('ladderTier');
  const netWinsInput = document.getElementById('ladderNetWins');
  const confirmBtn = document.getElementById('confirmLadderBtn');
  
  const isValid = tierSelect.value && netWinsInput.value !== '' && 
                  parseInt(netWinsInput.value) >= 0 && 
                  parseInt(netWinsInput.value) <= parseInt(netWinsInput.max);
  
  confirmBtn.disabled = !isValid;
}

function hideLadderRankSection() {
  const section = document.getElementById('ladder-rank-section');
  const joinBtn = document.getElementById('joinBtn');
  
  // Hide section with animation
  section.classList.remove('show');
  setTimeout(() => {
    section.style.display = 'none';
  }, 300);
  
  // Show the main join button again
  joinBtn.style.display = 'block';
  
  // Clear current session
  currentLadderSession = null;
}

async function handleLadderFormSubmit() {
  const tierSelect = document.getElementById('ladderTier');
  const netWinsInput = document.getElementById('ladderNetWins');
  const confirmBtn = document.getElementById('confirmLadderBtn');
  
  const tierId = parseInt(tierSelect.value);
  const netWins = parseInt(netWinsInput.value);
  
  if (!currentLadderSession) {
    console.error('No ladder session available');
    alert('Session is no longer available. Please try again.');
    return;
  }
  
  // Store session reference before operations
  const sessionToJoin = currentLadderSession;
  
  // Disable button and show loading
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Joining Session...';
  
  try {
    const response = await joinLadderSession(sessionToJoin, tierId, netWins);
    hideLadderRankSection();
    
    // Navigate to duel screen using stored reference
    window.location.href = `../duel/index.html?session=${sessionToJoin.id}`;
  } catch (error) {
    console.error('Failed to join ladder session:', error);
    alert(`Failed to join session: ${error.message}`);
  } finally {
    // Restore button state
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Join Ladder Session';
  }
}

async function joinLadderSession(session, tierId, netWins) {
  const response = await fetch('http://localhost:3001/api/sessions/join', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('duelytics_token')}`
    },
    body: JSON.stringify({
      sessionId: session.id,
      initialTierId: tierId,
      initialNetWins: netWins
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join session');
  }
  
  return response.json();
}

async function joinSessionDirect(session) {
  const response = await fetch('http://localhost:3001/api/sessions/join', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('duelytics_token')}`
    },
    body: JSON.stringify({
      sessionId: session.id
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join session');
  }
  
  const responseData = await response.json();
  
  // Navigate to duel screen
  window.location.href = `../duel/index.html?session=${session.id}`;
  
  return responseData;
}

// Clean inline dropdown implementation complete

