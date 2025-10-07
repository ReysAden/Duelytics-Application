/**
 * API Service for Duelytics Frontend
 * Handles all HTTP requests to the backend with clean error handling
 */

const API_BASE_URL = 'http://localhost:3001';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Get auth token from localStorage
function getAuthToken() {
  return localStorage.getItem('duelytics_token');
}

// Generic API request handler with error handling
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    ...options.headers
  };
  
  // Only set Content-Type for JSON, let fetch handle FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add authentication header if token exists
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const config = {
    headers,
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || `HTTP ${response.status}`,
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiError(
      'Network error or server unavailable',
      0,
      { originalError: error.message }
    );
  }
}

// Sessions API
export const sessionsApi = {
  // Get all active sessions
  async getActive() {
    return apiRequest('/api/sessions');
  },

  // Get specific session details
  async getById(sessionId) {
    return apiRequest(`/api/sessions/${sessionId}`);
  },

  // Get archived sessions (add this endpoint to backend later)
  async getArchived() {
    return apiRequest('/api/sessions?status=archived');
  }
};

// Admin API
export const adminApi = {
  // Create new session
  async createSession(sessionData) {
    return apiRequest('/api/admin/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  },

  // Archive session
  async archiveSession(sessionId) {
    return apiRequest(`/api/admin/sessions/${sessionId}/archive`, {
      method: 'PATCH'
    });
  },

  // Delete session (if endpoint exists)
  async deleteSession(sessionId) {
    return apiRequest(`/api/admin/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  },

  // Get session participants
  async getSessionParticipants(sessionId) {
    return apiRequest(`/api/admin/sessions/${sessionId}/participants`);
  }
};

// Decks API
export const decksApi = {
  // Get all decks
  async getAll() {
    return apiRequest('/api/decks');
  },

  // Create new deck
  async create(deckData) {
    // Handle both FormData (for file uploads) and regular objects
    const body = deckData instanceof FormData ? deckData : JSON.stringify(deckData);
    
    return apiRequest('/api/decks', {
      method: 'POST',
      body: body
    });
  },

  // Update deck
  async update(deckId, deckData) {
    return apiRequest(`/api/decks/${deckId}`, {
      method: 'PATCH',
      body: JSON.stringify(deckData)
    });
  },

  // Delete deck
  async delete(deckId) {
    return apiRequest(`/api/decks/${deckId}`, {
      method: 'DELETE'
    });
  },

  // Get deck statistics
  async getStats(deckId) {
    return apiRequest(`/api/decks/${deckId}/stats`);
  }
};

// Backgrounds API
export const backgroundsApi = {
  // Get user's backgrounds
  async getAll() {
    return apiRequest('/api/backgrounds');
  },

  // Upload new background
  async create(backgroundData) {
    // Handle both FormData (for file uploads) and regular objects
    const body = backgroundData instanceof FormData ? backgroundData : JSON.stringify(backgroundData);
    
    return apiRequest('/api/backgrounds', {
      method: 'POST',
      body: body
    });
  },

  // Set user's selected background
  async select(backgroundId) {
    return apiRequest(`/api/backgrounds/select/${backgroundId}`, {
      method: 'PUT'
    });
  },

  // Get user's current background
  async getCurrent() {
    return apiRequest('/api/backgrounds/current');
  },

  // Delete background
  async delete(backgroundId) {
    return apiRequest(`/api/backgrounds/${backgroundId}`, {
      method: 'DELETE'
    });
  }
};

// Health check
export const healthApi = {
  async check() {
    return apiRequest('/health');
  }
};

export { ApiError };
