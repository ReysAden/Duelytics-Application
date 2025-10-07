/**
 * Background Loader Utility
 * Loads user's background immediately when app starts (before reaching lobby)
 */

// Apply user's background immediately
async function loadUserBackground() {
  try {
    // Check if user is logged in and is supporter
    const token = localStorage.getItem('duelytics_token');
    if (!token) return;

    // Decode JWT to check if user is supporter
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.isSupporter) return;

    // Get user's current background
    const response = await fetch('http://localhost:3001/api/backgrounds/current', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.background && data.background.imageUrl) {
        const fullImageUrl = `http://localhost:3001${data.background.imageUrl}`;
        document.documentElement.style.setProperty('--user-background-image', `url('${fullImageUrl}')`);
        console.log('✅ User background loaded:', data.background.name);
      } else {
        // User has no custom background selected, ensure default is used
        document.documentElement.style.removeProperty('--user-background-image');
        console.log('✅ Using default background');
      }
    }
  } catch (error) {
    console.log('Background loading skipped:', error.message);
    // Keep default background on error
  }
}

// Load background immediately when script runs
loadUserBackground();