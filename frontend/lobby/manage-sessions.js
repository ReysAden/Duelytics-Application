/**
 * Manage Sessions Tab Functionality
 * Handles session management modal and actions
 */

import { sessionsApi, adminApi, ApiError } from '../shared/api.js';

// Load sessions into the management dropdown
async function loadManageSessions() {
  const selectEl = document.getElementById('manageSessionSelect')
  if (!selectEl) return
  
  try {
    // Clear existing options except the first one
    selectEl.innerHTML = '<option value="">Choose a session to manage...</option>'
    
    // Load both active and archived sessions
    const [activeResponse, archivedResponse] = await Promise.all([
      sessionsApi.getActive(),
      sessionsApi.getArchived()
    ])
    
    // Add active sessions
    if (activeResponse.sessions && activeResponse.sessions.length > 0) {
      const activeGroup = document.createElement('optgroup')
      activeGroup.label = 'Active Sessions'
      
      activeResponse.sessions.forEach(session => {
        const option = document.createElement('option')
        option.value = session.id
        option.dataset.status = 'active'
        option.dataset.sessionData = JSON.stringify(session)
        option.textContent = formatManageSessionOption(session, 'active')
        activeGroup.appendChild(option)
      })
      
      selectEl.appendChild(activeGroup)
    }
    
    // Add archived sessions
    if (archivedResponse.sessions && archivedResponse.sessions.length > 0) {
      const archivedGroup = document.createElement('optgroup')
      archivedGroup.label = 'Archived Sessions'
      
      archivedResponse.sessions.forEach(session => {
        const option = document.createElement('option')
        option.value = session.id
        option.dataset.status = 'archived'
        option.dataset.sessionData = JSON.stringify(session)
        option.textContent = formatManageSessionOption(session, 'archived')
        archivedGroup.appendChild(option)
      })
      
      selectEl.appendChild(archivedGroup)
    }
    
  } catch (error) {
    // Add error option if loading fails
    const errorOption = document.createElement('option')
    errorOption.value = ''
    errorOption.textContent = 'Error loading sessions - please refresh'
    errorOption.disabled = true
    selectEl.appendChild(errorOption)
  }
}

// Format session option for management dropdown
function formatManageSessionOption(session, status) {
  const gameModeDisplay = {
    'ladder': 'Ladder Mode',
    'rated': 'Rated Mode',
    'duelist_cup': 'Duelist Cup'
  }[session.game_mode] || session.game_mode
  
  if (status === 'active') {
    const endDate = new Date(session.ends_at)
    const now = new Date()
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
    const timeDisplay = daysLeft > 0 ? `Ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : 'Ending soon'
    return `${session.name} - ${gameModeDisplay} - ${timeDisplay}`
  } else {
    const endDate = new Date(session.ends_at)
    const completedDate = endDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    return `${session.name} - ${gameModeDisplay} - Completed ${completedDate}`
  }
}

// Session modal functions
function showSessionModal(option) {
  const modal = document.getElementById('sessionModal')
  const sessionName = document.getElementById('modalSessionName')
  const sessionStatus = document.getElementById('sessionStatus')
  const sessionType = document.getElementById('modalSessionType')
  const sessionDuration = document.getElementById('modalSessionDuration')
  const sessionPlayers = document.getElementById('modalSessionPlayers')
  const archiveBtn = document.getElementById('archiveSessionBtn')
  const deleteBtn = document.getElementById('deleteSessionBtn')
  
  if (modal) {
    // Get real session data from the option
    const sessionData = JSON.parse(option.dataset.sessionData)
    const isArchived = option.dataset.status === 'archived'
    
    // Format game mode display
    const gameModeDisplay = {
      'ladder': 'Ladder Mode',
      'rated': 'Rated Mode', 
      'duelist_cup': 'Duelist Cup'
    }[sessionData.game_mode] || sessionData.game_mode
    
    // Format duration display
    const startDate = new Date(sessionData.starts_at)
    const endDate = new Date(sessionData.ends_at)
    let durationText
    
    if (isArchived) {
      durationText = `Completed ${endDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      })}`
    } else {
      const now = new Date()
      const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
      durationText = daysLeft > 0 ? `Ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : 'Ending soon'
    }
    
    // Update modal content with real data
    if (sessionName) sessionName.textContent = sessionData.name
    if (sessionType) sessionType.textContent = gameModeDisplay
    if (sessionDuration) sessionDuration.textContent = durationText
    if (sessionPlayers) sessionPlayers.textContent = isArchived ? 'Session completed' : 'Active participants'
    
    // Update status badge
    if (sessionStatus) {
      sessionStatus.textContent = isArchived ? 'Archived' : 'Active'
      sessionStatus.className = `session-status-badge ${isArchived ? 'archived' : 'active'}`
    }
    
    // Store session ID for actions
    if (archiveBtn) archiveBtn.dataset.sessionId = sessionData.id
    if (deleteBtn) deleteBtn.dataset.sessionId = sessionData.id
    
    // Disable archive button if already archived
    if (archiveBtn) {
      archiveBtn.disabled = isArchived
      archiveBtn.innerHTML = isArchived ? 
        '<span class="btn-icon">📦</span> Already Archived' : 
        '<span class="btn-icon">📦</span> Archive Session'
    }
    
    // Show modal
    modal.style.display = 'block'
  }
}

function hideSessionModal() {
  const modal = document.getElementById('sessionModal')
  const manageSelect = document.getElementById('manageSessionSelect')
  
  if (modal) {
    modal.style.display = 'none'
  }
  
  if (manageSelect) {
    manageSelect.value = ''
  }
}

async function handleArchiveSession() {
  const sessionName = document.getElementById('modalSessionName')?.textContent
  const archiveBtn = document.getElementById('archiveSessionBtn')
  const sessionId = archiveBtn?.dataset.sessionId
  
  if (!sessionId) {
    alert('Error: Session ID not found')
    return
  }
  
  // Disable button and show loading state
  const originalText = archiveBtn.innerHTML
  archiveBtn.disabled = true
  archiveBtn.innerHTML = '⏳ Archiving...'
  
  try {
    const response = await adminApi.archiveSession(sessionId)
    
    if (response.success) {
      alert(`Session "${sessionName}" archived successfully!`)
      hideSessionModal()
      
      // Refresh the sessions list
      loadManageSessions()
      
      // Trigger refresh of other tabs if needed
      document.dispatchEvent(new CustomEvent('sessionArchived', {
        detail: { sessionId, sessionName }
      }))
    } else {
      throw new Error(response.message || 'Failed to archive session')
    }
    
  } catch (error) {
    let errorMessage = 'Failed to archive session.'
    
    if (error instanceof ApiError) {
      if (error.status === 401) {
        errorMessage = 'You must be logged in as an admin to archive sessions.'
      } else if (error.status === 403) {
        errorMessage = 'You do not have permission to archive this session.'
      } else {
        errorMessage = error.message
      }
    } else {
      errorMessage += ' Please check your connection and try again.'
    }
    
    alert(`Error: ${errorMessage}`)
  } finally {
    // Restore button state
    archiveBtn.disabled = false
    archiveBtn.innerHTML = originalText
  }
}

async function handleDeleteSession() {
  const sessionName = document.getElementById('modalSessionName')?.textContent
  const deleteBtn = document.getElementById('deleteSessionBtn')
  const sessionId = deleteBtn?.dataset.sessionId
  
  if (!sessionId) {
    alert('Error: Session ID not found')
    return
  }
  
  if (!confirm(`Are you sure you want to DELETE "${sessionName}"?\n\nThis will permanently remove:\n- The session and all its data\n- All participant records\n- All duel records\n\nThis action CANNOT be undone!`)) {
    return
  }
  
  // Disable button and show loading state
  const originalText = deleteBtn.innerHTML
  deleteBtn.disabled = true
  deleteBtn.innerHTML = '⏳ Deleting...'
  
  try {
    const response = await adminApi.deleteSession(sessionId)
    
    if (response.success) {
      alert(`Session "${sessionName}" has been permanently deleted.`)
      hideSessionModal()
      
      // Refresh the sessions list
      loadManageSessions()
      
      // Trigger refresh of other tabs
      document.dispatchEvent(new CustomEvent('sessionDeleted', {
        detail: { sessionId, sessionName }
      }))
    } else {
      throw new Error(response.message || 'Failed to delete session')
    }
    
  } catch (error) {
    let errorMessage = 'Failed to delete session.'
    
    if (error instanceof ApiError) {
      if (error.status === 401) {
        errorMessage = 'You must be logged in as an admin to delete sessions.'
      } else if (error.status === 403) {
        errorMessage = 'You do not have permission to delete this session.'
      } else {
        errorMessage = error.message
      }
    } else {
      errorMessage += ' Please check your connection and try again.'
    }
    
    alert(`Error: ${errorMessage}`)
  } finally {
    // Restore button state
    deleteBtn.disabled = false
    deleteBtn.innerHTML = originalText
  }
}

// Tab change event listener - load sessions when manage tab is opened
document.addEventListener('tabChanged', (event) => {
  const { tab } = event.detail
  if (tab === 'manage-sessions') {
    loadManageSessions()
  }
})

// Listen for session events to refresh the list
document.addEventListener('sessionCreated', () => {
  // Refresh manage sessions if we're on that tab
  const activeTab = document.querySelector('.menu-item.active')
  if (activeTab && activeTab.dataset.tab === 'manage-sessions') {
    loadManageSessions()
  }
})

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Manage Sessions functionality
  const manageSelect = document.getElementById('manageSessionSelect')
  const sessionModal = document.getElementById('sessionModal')
  const closeModalBtn = document.getElementById('closeModalBtn')
  const archiveBtn = document.getElementById('archiveSessionBtn')
  const deleteBtn = document.getElementById('deleteSessionBtn')
  
  if (manageSelect) {
    manageSelect.addEventListener('change', (e) => {
      const selectedOption = e.target.selectedOptions[0]
      if (selectedOption && selectedOption.value) {
        showSessionModal(selectedOption)
      } else {
        hideSessionModal()
      }
    })
  }
  
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideSessionModal)
  }
  
  if (archiveBtn) {
    archiveBtn.addEventListener('click', handleArchiveSession)
  }
  
  if (deleteBtn) {
    deleteBtn.addEventListener('click', handleDeleteSession)
  }
})

