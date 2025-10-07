const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App information
  getAppVersion: () => process.env.npm_package_version,
  getPlatform: () => process.platform,
  
  // Menu actions
  onMenuNewSession: (callback) => {
    ipcRenderer.on('menu-new-session', callback)
  },
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Auth token management
  checkAuthToken: () => ipcRenderer.invoke('check-auth-token'),
  clearAuthToken: () => ipcRenderer.invoke('clear-auth-token'),
  openOAuthUrl: (url) => ipcRenderer.invoke('open-oauth-url', url),
  
  // Future API methods for Duelytics
  // These will be used when we integrate with the backend
  apiCall: (endpoint, options) => ipcRenderer.invoke('api-call', endpoint, options),
  
  // System integration features for later
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Development helpers
  isDevelopment: () => process.env.NODE_ENV === 'development'
})

// Log that preload script loaded
console.log('🔧 Duelytics preload script loaded')

// Remove the loading text once the window is ready
window.addEventListener('DOMContentLoaded', () => {
  const loadingElement = document.querySelector('.loading')
  if (loadingElement) {
    setTimeout(() => {
      loadingElement.style.display = 'none'
    }, 1000) // Small delay to show loading briefly
  }
})