const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')

// Keep a global reference of the window object
let mainWindow

// IPC handlers for auth token management
ipcMain.handle('check-auth-token', () => {
  try {
    const projectRoot = path.resolve(__dirname, '../..');
    const tokenPath = path.join(projectRoot, 'temp', 'auth_token.txt')
    if (fs.existsSync(tokenPath)) {
      const token = fs.readFileSync(tokenPath, 'utf8')
      // Delete the token file after reading
      fs.unlinkSync(tokenPath)
      console.log('🎉 Token found and consumed')
      return token.trim()
    }
    return null
  } catch (error) {
    console.error('Error checking auth token:', error)
    return null
  }
})

ipcMain.handle('clear-auth-token', () => {
  try {
    const projectRoot = path.resolve(__dirname, '../..');
    const tokenPath = path.join(projectRoot, 'temp', 'auth_token.txt')
    if (fs.existsSync(tokenPath)) {
      fs.unlinkSync(tokenPath)
    }
    return true
  } catch (error) {
    console.error('Error clearing auth token:', error)
    return false
  }
})

ipcMain.handle('open-oauth-url', (event, url) => {
  shell.openExternal(url)
})

function createWindow() {
  // Create the browser window with your exact specifications
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    maxWidth: 800,
    maxHeight: 600,
    resizable: false,
    autoHideMenuBar: true, // Hide menu bar for cleaner look
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'), // We'll add this later
    titleBarStyle: 'default',
    show: false // Don't show until ready
  })

  // Load the app - start with login page
  mainWindow.loadFile(path.join(__dirname, '../login/index.html'))
  
  // Open DevTools in development
  mainWindow.webContents.openDevTools()

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    console.log('🪟 Duelytics window created (800x600)')
  })

  // Emitted when the window is closed
  mainWindow.on('closed', function () {
    mainWindow = null
  })

  // Handle window controls
  mainWindow.on('minimize', function (event) {
    event.preventDefault()
    mainWindow.minimize()
  })

  mainWindow.on('close', function (event) {
    // Allow normal close behavior - don't prevent it
    app.quit()
  })
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Session',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            // TODO: Implement new session
            mainWindow.webContents.send('menu-new-session')
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.isQuiting = true
            app.quit()
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// App event listeners
app.whenReady().then(() => {
  createWindow()
  // Menu is hidden for cleaner desktop app experience
  
  console.log('🚀 Duelytics Electron app ready')

  // On macOS, re-create a window when the dock icon is clicked
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed
app.on('window-all-closed', function () {
  // On macOS, keep the app running even when all windows are closed
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', function () {
  app.isQuiting = true
})

// Security: Prevent navigation to external sites
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    
    // Allow local file navigation and localhost
    if (parsedUrl.protocol !== 'file:' && 
        parsedUrl.origin !== 'http://localhost:8080' && 
        parsedUrl.origin !== 'http://localhost:3001') {
      event.preventDefault()
      console.log('🛑️ Blocked navigation to:', navigationUrl)
    }
  })
})

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('http://localhost')) {
    // Ignore certificate errors on localhost during development
    event.preventDefault()
    callback(true)
  } else {
    // Use default behavior for other URLs
    callback(false)
  }
})