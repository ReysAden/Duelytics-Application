/**
 * Decks Tab Functionality
 * Handles deck management and display
 */

import { decksApi, ApiError } from '../shared/api.js';

// Load decks from backend
async function loadDecks() {
  const decksGrid = document.querySelector('.decks-grid')
  if (!decksGrid) return
  
  try {
    const response = await decksApi.getAll()
    
    if (response.success && response.decks) {
      // Clear existing placeholder decks
      decksGrid.innerHTML = ''
      
      if (response.decks.length === 0) {
        decksGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: rgba(230, 230, 230, 0.6); padding: 40px;">No decks found. Add some decks to get started!</div>'
        return
      }
      
      // Create deck cards from backend data
      response.decks.forEach(deck => {
        const deckCard = createDeckCard(deck)
        decksGrid.appendChild(deckCard)
      })
    }
  } catch (error) {
    console.error('Failed to load decks:', error)
    decksGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #ed4245; padding: 40px;">Failed to load decks. Please refresh the page.</div>'
  }
}

// Create deck card element
function createDeckCard(deck) {
  const card = document.createElement('div')
  card.className = 'deck-card'
  card.dataset.deckId = deck.id
  
  // Construct proper image URL pointing to backend server
  let imageSection;
  if (deck.image_url) {
    const fullImageUrl = deck.image_url.startsWith('http') 
      ? deck.image_url 
      : `http://localhost:3001${deck.image_url}`;
    imageSection = `<img src="${fullImageUrl}" alt="${deck.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; flex-shrink: 0;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"><div class="deck-image-placeholder" style="display: none;"><span>📷</span></div>`;
  } else {
    imageSection = `<div class="deck-image-placeholder"><span>📷</span></div>`;
  }
  
  card.innerHTML = `
    <button class="deck-delete-btn" onclick="deleteDeck('${deck.id}', '${deck.name.replace(/'/g, "&apos;")}')" title="Delete deck">
      ×
    </button>
    ${imageSection}
    <div class="deck-name">${deck.name}</div>
  `
  
  return card
}

// Delete deck function (called from onclick)
window.deleteDeck = async function(deckId, deckName) {
  if (!confirm(`Are you sure you want to delete "${deckName}"?\n\nThis action cannot be undone.`)) {
    return
  }
  
  try {
    const response = await decksApi.delete(deckId)
    
    if (response.success) {
      alert(`Deck "${deckName}" deleted successfully!`)
      // Reload decks to reflect the deletion
      await loadDecks()
    } else {
      throw new Error(response.message || 'Failed to delete deck')
    }
    
  } catch (error) {
    let errorMessage = 'Failed to delete deck.'
    
    if (error instanceof ApiError) {
      if (error.status === 401) {
        errorMessage = 'You must be logged in as an admin to delete decks.'
      } else if (error.status === 403) {
        errorMessage = 'You do not have permission to delete decks.'
      } else if (error.status === 400) {
        errorMessage = error.message // This will show the "used in duels" message
      } else {
        errorMessage = error.message
      }
    } else {
      errorMessage += ' Please check your connection and try again.'
    }
    
    alert(`Error: ${errorMessage}`)
  }
}

// Deck form validation
function validateDeckForm() {
  const deckName = document.getElementById('deckName')?.value.trim()
  const addBtn = document.getElementById('addDeckBtn')
  
  if (addBtn) {
    // Only deck name is required, image is optional
    addBtn.disabled = !deckName
  }
}

async function handleAddDeck() {
  const deckName = document.getElementById('deckName').value.trim()
  const deckImageFile = document.getElementById('deckImage').files[0]
  const addBtn = document.getElementById('addDeckBtn')
  
  if (!deckName) {
    alert('Please provide a deck name')
    return
  }
  
  // Disable button and show loading state
  const originalText = addBtn.innerHTML
  addBtn.disabled = true
  addBtn.innerHTML = '⏳ Adding Deck...'
  
  try {
    // Create FormData to handle file upload
    const formData = new FormData()
    formData.append('name', deckName)
    
    // Add image file if provided
    if (deckImageFile) {
      formData.append('image', deckImageFile)
    }
    
    const response = await decksApi.create(formData)
    
    if (response.success) {
      alert(`Deck "${deckName}" added successfully!`)
      
      // Reset form
      document.getElementById('deckName').value = ''
      document.getElementById('deckImage').value = ''
      
      // Reload decks to show the new one
      await loadDecks()
      
    } else {
      throw new Error(response.message || 'Failed to create deck')
    }
    
  } catch (error) {
    let errorMessage = 'Failed to add deck.'
    
    if (error instanceof ApiError) {
      if (error.status === 401) {
        errorMessage = 'You must be logged in as an admin to add decks.'
      } else if (error.status === 403) {
        errorMessage = 'You do not have permission to add decks.'
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
    addBtn.disabled = false
    addBtn.innerHTML = originalText
    validateDeckForm()
  }
}

// Tab change event listener - load decks when decks tab is opened
document.addEventListener('tabChanged', (event) => {
  const { tab } = event.detail
  if (tab === 'decks') {
    loadDecks()
  }
})

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const deckName = document.getElementById('deckName')
  const deckImage = document.getElementById('deckImage')
  const addBtn = document.getElementById('addDeckBtn')
  
  if (deckName) deckName.addEventListener('input', validateDeckForm)
  if (deckImage) deckImage.addEventListener('change', validateDeckForm)
  
  if (addBtn) {
    addBtn.addEventListener('click', handleAddDeck)
  }
  
  // Initial validation
  validateDeckForm()
})

