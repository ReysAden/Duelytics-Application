/**
 * Create Session Tab Functionality
 * Handles session creation form validation and submission
 */

import { adminApi, ApiError } from '../shared/api.js';

// Create Session Form Validation
function validateCreateSessionForm() {
  const sessionName = document.getElementById('sessionName')?.value.trim()
  const sessionType = document.getElementById('sessionType')?.value
  const startDate = document.getElementById('startDate')?.value
  const endDate = document.getElementById('endDate')?.value
  const createBtn = document.getElementById('createSessionBtn')
  
  if (createBtn) {
    const allFieldsFilled = sessionName && sessionType && startDate && endDate
    createBtn.disabled = !allFieldsFilled
  }
}

// Handle form submission
async function handleCreateSession() {
  const sessionName = document.getElementById('sessionName').value.trim()
  const sessionType = document.getElementById('sessionType').value
  const startDate = document.getElementById('startDate').value
  const endDate = document.getElementById('endDate').value
  const createBtn = document.getElementById('createSessionBtn')
  
  // Basic validation
  if (!sessionName || !sessionType || !startDate || !endDate) {
    alert('Please fill in all fields')
    return
  }
  
  // Date validation
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (end <= start) {
    alert('End date must be after start date')
    return
  }
  
  // Disable button and show loading state
  const originalText = createBtn.innerHTML
  createBtn.disabled = true
  createBtn.innerHTML = '⏳ Creating Session...'
  
  try {
    // Prepare session data for API
    const sessionData = {
      name: sessionName,
      gameMode: sessionType,
      startsAt: startDate,
      endsAt: endDate
    }
    
    // Submit to API
    const response = await adminApi.createSession(sessionData)
    
    if (response.success) {
      alert(`Session "${sessionName}" created successfully!\n\nSession ID: ${response.session.id}\nMode: ${sessionType}\nStarts: ${new Date(startDate).toLocaleString()}\nEnds: ${new Date(endDate).toLocaleString()}`)
      
      // Reset form on success
      document.getElementById('sessionName').value = ''
      document.getElementById('sessionType').value = ''
      document.getElementById('startDate').value = ''
      document.getElementById('endDate').value = ''
      
      // Trigger a refresh of active sessions if user is on that tab
      const event = new CustomEvent('sessionCreated', {
        detail: { session: response.session }
      })
      document.dispatchEvent(event)
    } else {
      throw new Error(response.message || 'Failed to create session')
    }
    
  } catch (error) {
    
    let errorMessage = 'Failed to create session.'
    
    if (error instanceof ApiError) {
      if (error.status === 401) {
        errorMessage = 'You must be logged in as an admin to create sessions.'
      } else if (error.status === 403) {
        errorMessage = 'You do not have permission to create sessions.'
      } else {
        errorMessage = error.message
      }
    } else {
      errorMessage += ' Please check your connection and try again.'
    }
    
    alert(`Error: ${errorMessage}`)
  } finally {
    // Restore button state
    createBtn.disabled = false
    createBtn.innerHTML = originalText
    validateCreateSessionForm()
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Add listeners to all create session form fields
  const sessionName = document.getElementById('sessionName')
  const sessionType = document.getElementById('sessionType')
  const startDate = document.getElementById('startDate')
  const endDate = document.getElementById('endDate')
  const createBtn = document.getElementById('createSessionBtn')
  
  if (sessionName) sessionName.addEventListener('input', validateCreateSessionForm)
  if (sessionType) sessionType.addEventListener('change', validateCreateSessionForm)
  if (startDate) startDate.addEventListener('change', validateCreateSessionForm)
  if (endDate) endDate.addEventListener('change', validateCreateSessionForm)
  
  if (createBtn) {
    createBtn.addEventListener('click', handleCreateSession)
  }
  
  // Initial validation check
  validateCreateSessionForm()
})

