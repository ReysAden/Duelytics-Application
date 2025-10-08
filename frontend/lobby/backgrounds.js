/**
 * Backgrounds Tab Functionality
 * Handles background upload and selection for supporters
 */

import { backgroundsApi, ApiError, getCurrentUser } from '../shared/api.js';

// Check if user is supporter (can access backgrounds)
let isSupporter = false;
let currentUser = null;

// Initialize user data from JWT token
function initializeUserData() {
  const token = localStorage.getItem('duelytics_token');
  console.log('🔍 Raw token from localStorage:', token?.substring(0, 50) + '...');
  
  currentUser = getCurrentUser();
  if (currentUser) {
    isSupporter = currentUser.isSupporter || false;
    console.log('🔍 Full JWT payload:', currentUser);
    console.log('🔍 Backgrounds: User role check:', {
      username: currentUser.username,
      isAdmin: currentUser.isAdmin,
      isSupporter: currentUser.isSupporter
    });
    
    // Update tab visibility based on supporter status
    const backgroundsTab = document.querySelector('[data-tab="backgrounds"]');
    if (backgroundsTab) {
      backgroundsTab.style.display = isSupporter ? 'block' : 'none';
      console.log('🔍 Backgrounds tab visibility:', isSupporter ? 'shown' : 'hidden');
    }
  }
}

// Load user's backgrounds from backend
async function loadBackgrounds() {
  const backgroundsGrid = document.querySelector('.backgrounds-grid')
  if (!backgroundsGrid) return
  
  try {
    // Check user role first
    if (!isSupporter) {
      backgroundsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: rgba(230, 230, 230, 0.6); padding: 40px;">Backgrounds are available for supporters only.</div>'
      return
    }

    const response = await backgroundsApi.getAll()
    
    if (response.success && response.backgrounds) {
      // Clear existing backgrounds
      backgroundsGrid.innerHTML = ''
      
      if (response.backgrounds.length === 0) {
        backgroundsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: rgba(230, 230, 230, 0.6); padding: 40px;">No backgrounds uploaded yet. Upload your first background above!</div>'
        return
      }
      
      // Add Default Background option first (always available)
      const defaultCard = createDefaultBackgroundCard()
      backgroundsGrid.appendChild(defaultCard)
      
      // Create background cards from backend data
      response.backgrounds.forEach(background => {
        const backgroundCard = createBackgroundCard(background)
        backgroundsGrid.appendChild(backgroundCard)
      })
      
      // Mark current background as active
      await markCurrentBackground()
    }
  } catch (error) {
    console.error('Failed to load backgrounds:', error)
    if (error instanceof ApiError && error.status === 403) {
      backgroundsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: rgba(230, 230, 230, 0.6); padding: 40px;">Backgrounds are available for supporters only.</div>'
    } else {
      backgroundsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #ed4245; padding: 40px;">Failed to load backgrounds. Please refresh the page.</div>'
    }
  }
}

// Create default background card element (cannot be deleted)
function createDefaultBackgroundCard() {
  const card = document.createElement('div')
  card.className = 'background-card'
  card.dataset.backgroundId = 'default'
  
  card.innerHTML = `
    <div class="background-preview">
      <img src="../assets/DefaultBackground.jpg" alt="Default Background" />
    </div>
    <div class="background-info">
      <div class="background-name">Default Background</div>
      <button class="set-background-btn" onclick="setDefaultBackground()">Set as Background</button>
    </div>
  `
  
  return card
}

// Create background card element
function createBackgroundCard(background) {
  const card = document.createElement('div')
  card.className = 'background-card'
  card.dataset.backgroundId = background.id
  
  const imageSection = background.image_url ? 
    `<img src="http://localhost:3001${background.image_url}" alt="${background.name}" />` :
    `<div class="background-placeholder"><span>🖼️</span></div>`
  
  card.innerHTML = `
    <button class="background-delete-btn" onclick="deleteBackground('${background.id}', '${background.name.replace(/'/g, "&apos;")}')" title="Delete background">
      ×
    </button>
    <div class="background-preview">
      ${imageSection}
    </div>
    <div class="background-info">
      <div class="background-name">${background.name}</div>
      <button class="set-background-btn" onclick="setBackground('${background.id}', '${background.name.replace(/'/g, "&apos;")}')">Set as Background</button>
    </div>
  `
  
  return card
}

// Set default background function (called from onclick)
window.setDefaultBackground = async function() {
  if (!confirm('Set default background?')) {
    return
  }
  
  try {
    // Clear user's selected background (set to null)
    const response = await fetch('http://localhost:3001/api/backgrounds/select/default', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('duelytics_token')}`
      }
    })
    
    if (response.ok) {
      alert('Default background set!')
      // Reset to default background immediately
      // Clear the custom property to use the default fallback
      document.documentElement.style.removeProperty('--user-background-image')
      
      // Force refresh the background by reapplying the CSS
      const style = document.createElement('style')
      style.id = 'background-reset'
      style.textContent = `
        body::before {
          background-image: url('../assets/DefaultBackground.jpg') !important;
        }
      `
      // Remove any existing background-reset styles
      const existingStyle = document.getElementById('background-reset')
      if (existingStyle) existingStyle.remove()
      document.head.appendChild(style)
      // Refresh backgrounds to update active status
      await loadBackgrounds()
    } else {
      throw new Error('Failed to set default background')
    }
    
  } catch (error) {
    alert(`Error: ${error.message}`)
  }
}

// Mark current background as active
async function markCurrentBackground() {
  try {
    const response = await backgroundsApi.getCurrent()
    
    // Remove active class from all cards
    document.querySelectorAll('.background-card').forEach(card => {
      card.classList.remove('active')
      const status = card.querySelector('.background-status')
      if (status) status.remove()
      const setBtn = card.querySelector('.set-background-btn')
      if (setBtn) setBtn.style.display = 'block'
    })
    
    if (response.success && response.background) {
      // Mark current background as active
      const currentCard = document.querySelector(`[data-background-id="${response.background.id}"]`)
      if (currentCard) {
        currentCard.classList.add('active')
        const info = currentCard.querySelector('.background-info')
        const setBtn = currentCard.querySelector('.set-background-btn')
        setBtn.style.display = 'none'
        
        const status = document.createElement('div')
        status.className = 'background-status'
        status.textContent = 'Currently Active'
        info.appendChild(status)
      }
    } else {
      // No custom background selected, default is active
      const defaultCard = document.querySelector('[data-background-id="default"]')
      if (defaultCard) {
        defaultCard.classList.add('active')
        const info = defaultCard.querySelector('.background-info')
        const setBtn = defaultCard.querySelector('.set-background-btn')
        setBtn.style.display = 'none'
        
        const status = document.createElement('div')
        status.className = 'background-status'
        status.textContent = 'Currently Active'
        info.appendChild(status)
      }
    }
  } catch (error) {
    console.error('Failed to get current background:', error)
    // If error, assume default is active
    const defaultCard = document.querySelector('[data-background-id="default"]')
    if (defaultCard) {
      defaultCard.classList.add('active')
      const info = defaultCard.querySelector('.background-info')
      const setBtn = defaultCard.querySelector('.set-background-btn')
      if (setBtn) setBtn.style.display = 'none'
      
      const status = document.createElement('div')
      status.className = 'background-status'
      status.textContent = 'Currently Active'
      info.appendChild(status)
    }
  }
}

// Set background function (called from onclick)
window.setBackground = async function(backgroundId, backgroundName) {
  if (!confirm(`Set "${backgroundName}" as your background?`)) {
    return
  }
  
  try {
    const response = await backgroundsApi.select(backgroundId)
    
    if (response.success) {
      alert(`Background set to "${backgroundName}"!`)
      // Remove any background reset styles
      const existingStyle = document.getElementById('background-reset')
      if (existingStyle) existingStyle.remove()
      // Refresh backgrounds to update active status
      await loadBackgrounds()
      // Update global background immediately
      await updateGlobalBackground()
    } else {
      throw new Error(response.message || 'Failed to set background')
    }
    
  } catch (error) {
    let errorMessage = 'Failed to set background.'
    
    if (error instanceof ApiError) {
      if (error.status === 401) {
        errorMessage = 'You must be logged in as a supporter to set backgrounds.'
      } else if (error.status === 403) {
        errorMessage = 'You do not have permission to set backgrounds.'
      } else if (error.status === 404) {
        errorMessage = 'Background not found.'
      } else {
        errorMessage = error.message
      }
    } else {
      errorMessage += ' Please check your connection and try again.'
    }
    
    alert(`Error: ${errorMessage}`)
  }
}

// Delete background function (called from onclick)
window.deleteBackground = async function(backgroundId, backgroundName) {
  if (!confirm(`Are you sure you want to delete "${backgroundName}"?\n\nThis action cannot be undone.`)) {
    return
  }
  
  try {
    const response = await backgroundsApi.delete(backgroundId)
    
    if (response.success) {
      alert(`Background "${backgroundName}" deleted successfully!`)
      // Reload backgrounds to reflect the deletion
      await loadBackgrounds()
    } else {
      throw new Error(response.message || 'Failed to delete background')
    }
    
  } catch (error) {
    let errorMessage = 'Failed to delete background.'
    
    if (error instanceof ApiError) {
      if (error.status === 401) {
        errorMessage = 'You must be logged in as a supporter to delete backgrounds.'
      } else if (error.status === 403) {
        errorMessage = 'You do not have permission to delete backgrounds.'
      } else if (error.status === 404) {
        errorMessage = 'Background not found or not owned by you.'
      } else {
        errorMessage = error.message
      }
    } else {
      errorMessage += ' Please check your connection and try again.'
    }
    
    alert(`Error: ${errorMessage}`)
  }
}

// Background form validation
function validateBackgroundForm() {
  const backgroundName = document.getElementById('backgroundName')?.value.trim()
  const backgroundImage = document.getElementById('backgroundImage')?.files.length > 0
  const uploadBtn = document.getElementById('uploadBackgroundBtn')
  
  if (uploadBtn) {
    uploadBtn.disabled = !backgroundName || !backgroundImage
  }
}

async function handleUploadBackground() {
  const backgroundName = document.getElementById('backgroundName').value.trim()
  const backgroundImageFile = document.getElementById('backgroundImage').files[0]
  const uploadBtn = document.getElementById('uploadBackgroundBtn')
  
  if (!backgroundName || !backgroundImageFile) {
    alert('Please provide both background name and image')
    return
  }
  
  // Disable button and show loading state
  const originalText = uploadBtn.innerHTML
  uploadBtn.disabled = true
  uploadBtn.innerHTML = '⏳ Uploading Background...'
  
  try {
    // Create FormData to handle file upload
    const formData = new FormData()
    formData.append('name', backgroundName)
    formData.append('image', backgroundImageFile)
    
    const response = await backgroundsApi.create(formData)
    
    if (response.success) {
      alert(`Background "${backgroundName}" uploaded successfully!`)
      
      // Reset form
      document.getElementById('backgroundName').value = ''
      document.getElementById('backgroundImage').value = ''
      
      // Reload backgrounds to show the new one
      await loadBackgrounds()
      
    } else {
      throw new Error(response.message || 'Failed to upload background')
    }
    
  } catch (error) {
    let errorMessage = 'Failed to upload background.'
    
    if (error instanceof ApiError) {
      if (error.status === 401) {
        errorMessage = 'You must be logged in as a supporter to upload backgrounds.'
      } else if (error.status === 403) {
        errorMessage = 'You do not have permission to upload backgrounds.'
      } else if (error.status === 400) {
        errorMessage = error.message
      } else {
        errorMessage = error.message
      }
    } else {
      errorMessage += ' Please check your connection and try again.'
    }
    
    alert(`Error: ${errorMessage}`)
  } finally {
    // Restore button state
    uploadBtn.disabled = false
    uploadBtn.innerHTML = originalText
    validateBackgroundForm()
  }
}

// Update global background based on user's selection
async function updateGlobalBackground() {
  try {
    if (!isSupporter) return // Non-supporters keep default background
    
    const response = await backgroundsApi.getCurrent()
    
    if (response.success && response.background && response.background.imageUrl) {
      const fullImageUrl = `http://localhost:3001${response.background.imageUrl}`
      document.documentElement.style.setProperty('--user-background-image', `url('${fullImageUrl}')`)
      
      // Update body::before background-image via CSS custom property
      const style = document.createElement('style')
      style.textContent = `
        body::before {
          background-image: var(--user-background-image) !important;
        }
      `
      document.head.appendChild(style)
    }
  } catch (error) {
    console.error('Failed to update global background:', error)
    // Keep default background on error
  }
}

// Check user role and initialize
async function initializeBackgrounds() {
  try {
    // Initialize user data from JWT token
    initializeUserData();
    
    // Load backgrounds and update global background for supporters
    if (isSupporter) {
      await updateGlobalBackground();
    }
    
  } catch (error) {
    console.error('Failed to initialize backgrounds:', error)
  }
}

// Tab change event listener - load backgrounds when backgrounds tab is opened
document.addEventListener('tabChanged', (event) => {
  const { tab } = event.detail
  if (tab === 'backgrounds') {
    // Initialize user data first to check supporter status
    initializeUserData();
    if (isSupporter) {
      loadBackgrounds()
    }
  }
})

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const backgroundName = document.getElementById('backgroundName')
  const backgroundImage = document.getElementById('backgroundImage')
  const uploadBtn = document.getElementById('uploadBackgroundBtn')
  
  if (backgroundName) backgroundName.addEventListener('input', validateBackgroundForm)
  if (backgroundImage) backgroundImage.addEventListener('change', validateBackgroundForm)
  
  if (uploadBtn) {
    uploadBtn.addEventListener('click', handleUploadBackground)
  }
  
  // Initial validation
  validateBackgroundForm()
  
  // Initialize backgrounds system
  initializeBackgrounds()
})
