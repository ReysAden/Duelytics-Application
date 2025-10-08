/**
 * Duel Submission Form Handler
 * Handles deck dropdowns, form validation, and submission logic
 */

// Form state
let decks = [];
let selectedPlayerDeck = null;
let selectedOpponentDeck = null;
let selectedResult = null;

// Initialize form when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  initializeDuelForm();
});

async function initializeDuelForm() {
  try {
    // Load decks from API
    await loadDecks();
    
    // Setup form handlers
    setupResultButtons();
    setupDropdowns();
    setupFormValidation();
    setupConditionalRatingField();
    
    console.log('🎯 Duel form initialized');
  } catch (error) {
    console.error('Failed to initialize duel form:', error);
  }
}

// Load decks from backend
async function loadDecks() {
  try {
    const response = await fetch('http://localhost:3001/api/decks', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('duelytics_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load decks');
    }
    
    const data = await response.json();
    decks = data.decks || [];
    
    console.log(`📚 Loaded ${decks.length} decks`);
    
    // Populate both dropdowns
    populateDropdown('playerDeckList', decks);
    populateDropdown('opponentDeckList', decks);
    
  } catch (error) {
    console.error('Error loading decks:', error);
    // Show error in dropdowns
    showDropdownError('playerDeckList');
    showDropdownError('opponentDeckList');
  }
}

// Populate dropdown with deck options
function populateDropdown(listId, deckList) {
  const list = document.getElementById(listId);
  list.innerHTML = '';
  
  if (deckList.length === 0) {
    list.innerHTML = '<div class="dropdown-item no-results">No decks available</div>';
    return;
  }
  
  deckList.forEach(deck => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.dataset.deckId = deck.id;
    item.dataset.deckName = deck.name;
    item.textContent = deck.name;
    
    item.addEventListener('click', () => {
      selectDeck(listId, deck, item);
    });
    
    list.appendChild(item);
  });
}

// Show error in dropdown
function showDropdownError(listId) {
  const list = document.getElementById(listId);
  list.innerHTML = '<div class="dropdown-item no-results">Failed to load decks</div>';
}

// Handle deck selection
function selectDeck(listId, deck, item) {
  const isPlayerDeck = listId === 'playerDeckList';
  const inputId = isPlayerDeck ? 'playerDeckInput' : 'opponentDeckInput';
  const dropdownId = isPlayerDeck ? 'playerDeckDropdown' : 'opponentDeckDropdown';
  
  // Update input value
  document.getElementById(inputId).value = deck.name;
  
  // Store selection
  if (isPlayerDeck) {
    selectedPlayerDeck = deck;
  } else {
    selectedOpponentDeck = deck;
  }
  
  // Close dropdown
  document.getElementById(dropdownId).classList.remove('open');
  
  // Validate form
  validateForm();
  
  console.log(`🃏 Selected ${isPlayerDeck ? 'player' : 'opponent'} deck: ${deck.name}`);
}

// Setup dropdown functionality
function setupDropdowns() {
  setupSingleDropdown('playerDeckDropdown', 'playerDeckInput', 'playerDeckList');
  setupSingleDropdown('opponentDeckDropdown', 'opponentDeckInput', 'opponentDeckList');
}

function setupSingleDropdown(dropdownId, inputId, listId) {
  const dropdown = document.getElementById(dropdownId);
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  
  // Toggle dropdown on input click
  input.addEventListener('click', () => {
    const isOpen = dropdown.classList.contains('open');
    
    // Close all other dropdowns first
    document.querySelectorAll('.searchable-dropdown').forEach(dd => {
      dd.classList.remove('open');
    });
    
    if (!isOpen) {
      dropdown.classList.add('open');
      input.focus();
      input.removeAttribute('readonly');
    }
  });
  
  // Search functionality
  input.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    filterDropdown(listId, searchTerm);
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
      input.setAttribute('readonly', 'readonly');
    }
  });
}

// Filter dropdown based on search term
function filterDropdown(listId, searchTerm) {
  const list = document.getElementById(listId);
  const items = list.querySelectorAll('.dropdown-item:not(.no-results)');
  let hasVisible = false;
  
  items.forEach(item => {
    const deckName = item.dataset.deckName?.toLowerCase() || '';
    const matches = deckName.includes(searchTerm);
    
    item.style.display = matches ? 'block' : 'none';
    if (matches) hasVisible = true;
  });
  
  // Show/hide no results message
  let noResults = list.querySelector('.dropdown-item.no-results');
  if (!hasVisible && searchTerm) {
    if (!noResults) {
      noResults = document.createElement('div');
      noResults.className = 'dropdown-item no-results';
      noResults.textContent = 'No decks found';
      list.appendChild(noResults);
    }
    noResults.style.display = 'block';
  } else if (noResults) {
    noResults.style.display = 'none';
  }
}

// Setup result buttons
function setupResultButtons() {
  const winBtn = document.getElementById('winBtn');
  const lossBtn = document.getElementById('lossBtn');
  
  winBtn.addEventListener('click', () => {
    selectResult('win', winBtn, lossBtn);
  });
  
  lossBtn.addEventListener('click', () => {
    selectResult('loss', lossBtn, winBtn);
  });
}

function selectResult(result, activeBtn, inactiveBtn) {
  selectedResult = result;
  
  // Update button states
  activeBtn.classList.add('active');
  inactiveBtn.classList.remove('active');
  
  // Validate form
  validateForm();
  
  console.log(`🎯 Selected result: ${result}`);
}

// Setup conditional rating field based on game mode
function setupConditionalRatingField() {
  if (!currentSession) return;
  
  const ratingGroup = document.getElementById('ratingChangeGroup');
  const ratingLabel = document.getElementById('ratingChangeLabel');
  const ratingHelp = document.getElementById('ratingChangeHelp');
  const ratingInput = document.getElementById('ratingChangeInput');
  
  if (currentSession.game_mode === 'ladder') {
    // Hide rating field for ladder
    ratingGroup.style.display = 'none';
  } else if (currentSession.game_mode === 'rated') {
    // Show rating field for rated - pre-fill with average for quick submit
    ratingGroup.style.display = 'block';
    ratingLabel.textContent = 'Rating Change';
    ratingHelp.textContent = 'Enter rating points gained/lost (e.g. 7.5)';
    ratingInput.placeholder = '7.5';
    ratingInput.value = '7.5'; // Pre-fill with average
    ratingInput.step = '0.1';
  } else if (currentSession.game_mode === 'duelist_cup') {
    // Show points field for duelist cup - pre-fill with average for quick submit
    ratingGroup.style.display = 'block';
    ratingLabel.textContent = 'Points Change';
    ratingHelp.textContent = 'Enter points gained/lost (e.g. 1000)';
    ratingInput.placeholder = '1000';
    ratingInput.value = '1000'; // Pre-fill with average
    ratingInput.step = '1';
  }
}

// Form validation
function setupFormValidation() {
  const form = document.getElementById('duelForm');
  const submitBtn = document.getElementById('submitDuelBtn');
  
  form.addEventListener('submit', handleFormSubmit);
  
  // Validate on form changes
  form.addEventListener('change', validateForm);
  document.getElementById('ratingChangeInput').addEventListener('input', validateForm);
}

function validateForm() {
  const coinFlip = document.querySelector('input[name="coinFlip"]:checked');
  const turnOrder = document.querySelector('input[name="turnOrder"]:checked');
  const ratingInput = document.getElementById('ratingChangeInput');
  const ratingGroup = document.getElementById('ratingChangeGroup');
  const submitBtn = document.getElementById('submitDuelBtn');
  
  // Check required fields
  const isValid = selectedPlayerDeck && 
                  selectedOpponentDeck && 
                  selectedResult && 
                  coinFlip && 
                  turnOrder &&
                  (ratingGroup.style.display === 'none' || ratingInput.value.trim() !== '');
  
  submitBtn.disabled = !isValid;
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submitDuelBtn');
  const originalText = submitBtn.textContent;
  
  try {
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    // Collect form data
    const formData = {
      sessionId: currentSession.id,
      result: selectedResult,
      playerDeckId: selectedPlayerDeck.id,
      opponentDeckId: selectedOpponentDeck.id,
      coinFlipWon: document.querySelector('input[name="coinFlip"]:checked').value === 'won',
      wentFirst: document.querySelector('input[name="turnOrder"]:checked').value === 'first',
    };
    
    // Add rating change if applicable
    const ratingInput = document.getElementById('ratingChangeInput');
    const ratingGroup = document.getElementById('ratingChangeGroup');
    if (ratingGroup.style.display !== 'none' && ratingInput.value.trim()) {
      formData.pointsChange = parseFloat(ratingInput.value);
      console.log(`💰 Points change: ${formData.pointsChange}`);
    } else if (ratingGroup.style.display !== 'none') {
      console.log('⚠️ Rating field is visible but empty!');
    }
    
    console.log('📤 Submitting duel:', formData);
    
    // Submit to backend
    const response = await fetch('http://localhost:3001/api/duels/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('duelytics_token')}`
      },
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit duel');
    }
    
    const result = await response.json();
    console.log('✅ Duel submitted successfully:', result);
    
    // Show success message
    alert('Duel submitted successfully!');
    
    // Reset form
    resetForm();
    
    // Refresh user stats
    await loadUserStats();
    
  } catch (error) {
    console.error('Failed to submit duel:', error);
    alert(`Failed to submit duel: ${error.message}`);
  } finally {
    // Restore submit button
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    validateForm(); // Revalidate
  }
}

// Reset form to initial state
function resetForm() {
  const form = document.getElementById('duelForm');
  
  // Store the rating input value before reset
  const ratingInput = document.getElementById('ratingChangeInput');
  const savedRatingValue = ratingInput.value;
  
  form.reset();
  
  // Clear selections
  selectedPlayerDeck = null;
  selectedOpponentDeck = null;
  selectedResult = null;
  
  // Clear input values
  document.getElementById('playerDeckInput').value = '';
  document.getElementById('opponentDeckInput').value = '';
  
  // Restore the rating input value (preserve defaults)
  if (savedRatingValue && currentSession) {
    const ratingGroup = document.getElementById('ratingChangeGroup');
    if (ratingGroup.style.display !== 'none') {
      ratingInput.value = savedRatingValue;
    }
  }
  
  // Remove active states
  document.querySelectorAll('.result-btn').forEach(btn => btn.classList.remove('active'));
  
  // Close dropdowns
  document.querySelectorAll('.searchable-dropdown').forEach(dd => dd.classList.remove('open'));
  
  // Reset readonly state
  document.querySelectorAll('.dropdown-input').forEach(input => {
    input.setAttribute('readonly', 'readonly');
  });
  
  console.log('🔄 Form reset with preserved defaults');
}
