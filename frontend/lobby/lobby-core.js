/**
 * Core Lobby Functionality
 * Handles navigation, tab switching, and app initialization
 */

// Tab switching with data loading
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
    document.getElementById('page-title').textContent = item.textContent.trim()
    
    // Trigger tab-specific loading via custom events
    const event = new CustomEvent('tabChanged', {
      detail: { tab, element: document.getElementById(tab) }
    })
    document.dispatchEvent(event)
  })
})

// Logout function
function logout() {
  localStorage.removeItem('duelytics_token')
  window.location.href = '../login/index.html'
}

// App initialization
document.addEventListener('DOMContentLoaded', () => {
  // Transfer token from sessionStorage to localStorage if needed
  const sessionToken = sessionStorage.getItem('duelytics_token')
  if (sessionToken && !localStorage.getItem('duelytics_token')) {
    localStorage.setItem('duelytics_token', sessionToken)
    sessionStorage.removeItem('duelytics_token')
  }
  
  // Check if we have a valid token, redirect to login if not
  const token = localStorage.getItem('duelytics_token')
  if (!token) {
    window.location.href = '../login/index.html'
    return
  }
  
  // Trigger initial load for active tab
  const activeTab = document.querySelector('.menu-item.active')
  if (activeTab) {
    const event = new CustomEvent('tabChanged', {
      detail: { 
        tab: activeTab.dataset.tab, 
        element: document.getElementById(activeTab.dataset.tab),
        isInitial: true 
      }
    })
    document.dispatchEvent(event)
  }
})

