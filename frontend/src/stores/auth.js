import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const token = ref(null)
  const initialized = ref(false)
  const loading = ref(false)

  // Computed
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.isAdmin ?? false)
  const isSupporter = computed(() => user.value?.isSupporter ?? false)

  // Actions
  const initializeAuth = async () => {
    if (initialized.value) return

    loading.value = true
    try {
      // Check for existing token in localStorage
      const savedToken = localStorage.getItem('duelytics_token')
      if (savedToken) {
        token.value = savedToken
        api.setAuthToken(savedToken)
        
        // Verify token and get user info
        const response = await api.get('/auth/me')
        user.value = response.data.user
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error)
      // Clear invalid token
      logout()
    } finally {
      initialized.value = true
      loading.value = false
    }
  }

  const login = async (authToken) => {
    loading.value = true
    try {
      token.value = authToken
      localStorage.setItem('duelytics_token', authToken)
      api.setAuthToken(authToken)

      // Get user info
      const response = await api.get('/auth/me')
      user.value = response.data.user
      
      console.log(`✅ User logged in: ${user.value.username}`)
      return true
    } catch (error) {
      console.error('Login failed:', error)
      logout()
      throw error
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    loading.value = true
    try {
      if (token.value) {
        // Call backend logout endpoint
        await api.post('/auth/logout')
      }
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      // Clear local state regardless of API call result
      user.value = null
      token.value = null
      localStorage.removeItem('duelytics_token')
      api.setAuthToken(null)
      loading.value = false
      console.log('👋 User logged out')
    }
  }

  const refreshUserInfo = async () => {
    if (!token.value) return

    try {
      const response = await api.get('/auth/me')
      user.value = response.data.user
    } catch (error) {
      console.error('Failed to refresh user info:', error)
      // If token is invalid, logout
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout()
      }
    }
  }

  const refreshRoles = async () => {
    if (!token.value) return

    try {
      const response = await api.post('/auth/refresh')
      
      // Update user info with new roles
      if (user.value) {
        user.value.isAdmin = response.data.roles.isAdmin
        user.value.isSupporter = response.data.roles.isSupporter
        user.value.roles = response.data.roles.guildRoles
      }

      console.log('🔄 User roles refreshed')
      return response.data.roles
    } catch (error) {
      console.error('Failed to refresh roles:', error)
      throw error
    }
  }

  return {
    // State
    user,
    token,
    initialized,
    loading,
    
    // Computed
    isAuthenticated,
    isAdmin,
    isSupporter,
    
    // Actions
    initializeAuth,
    login,
    logout,
    refreshUserInfo,
    refreshRoles
  }
})