/**
 * API Sync Service
 * Frontend service for syncing data with the backend
 */

const API_BASE = window.location.origin;

/**
 * API Client with built-in error handling and retry logic
 */
class ApiClient {
  constructor(baseUrl = API_BASE) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('authToken');
    this.phoneNumber = localStorage.getItem('phoneNumber');
  }

  /**
   * Set authentication credentials
   */
  setAuth(phoneNumber, token) {
    this.phoneNumber = phoneNumber;
    this.token = token;
    localStorage.setItem('authToken', token);
    localStorage.setItem('phoneNumber', phoneNumber);
  }

  /**
   * Clear authentication
   */
  clearAuth() {
    this.token = null;
    this.phoneNumber = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('phoneNumber');
  }

  /**
   * Get headers for requests
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.token) {
      headers['token'] = this.token;
    }
    if (this.phoneNumber) {
      headers['phoneNumber'] = this.phoneNumber;
    }
    
    return headers;
  }

  /**
   * Make API request with retry logic
   */
  async request(endpoint, options = {}, retries = 3) {
    const url = `${this.baseUrl}${endpoint}`;
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.getHeaders(),
            ...options.headers
          }
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            this.clearAuth();
            throw new Error('Session expired. Please login again.');
          }
          throw new Error(data.error || 'Request failed');
        }

        return data;
      } catch (error) {
        console.error(`API request failed (attempt ${i + 1}/${retries}):`, error);
        
        if (i === retries - 1) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  /**
   * GET request
   */
  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  /**
   * POST request
   */
  post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request
   */
  put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request
   */
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Create global API instance
const api = new ApiClient();

// ============================================
// USER API FUNCTIONS
// ============================================

export const userApi = {
  /**
   * Get current user profile
   */
  async getProfile() {
    return await api.get('/api/users/me');
  },

  /**
   * Update user profile
   */
  async updateProfile(data) {
    return await api.put('/api/users/me', data);
  },

  /**
   * Get driver info
   */
  async getDriverInfo() {
    return await api.get('/api/users/me/driver-info');
  },

  /**
   * Update driver info
   */
  async updateDriverInfo(data) {
    return await api.put('/api/users/me/driver-info', data);
  },

  /**
   * Get privacy settings
   */
  async getPrivacySettings() {
    return await api.get('/api/users/me/privacy-settings');
  },

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(data) {
    return await api.put('/api/users/me/privacy-settings', data);
  },

  /**
   * Get notification settings
   */
  async getNotificationSettings() {
    return await api.get('/api/users/me/notification-settings');
  },

  /**
   * Update notification settings
   */
  async updateNotificationSettings(data) {
    return await api.put('/api/users/me/notification-settings', data);
  },

  /**
   * Get recent searches
   */
  async getRecentSearches() {
    return await api.get('/api/users/me/recent-searches');
  },

  /**
   * Add recent search
   */
  async addRecentSearch(data) {
    return await api.post('/api/users/me/recent-searches', data);
  },

  /**
   * Clear recent searches
   */
  async clearRecentSearches() {
    return await api.delete('/api/users/me/recent-searches');
  },

  /**
   * Get favorite routes
   */
  async getFavoriteRoutes() {
    return await api.get('/api/users/me/favorite-routes');
  },

  /**
   * Add favorite route
   */
  async addFavoriteRoute(data) {
    return await api.post('/api/users/me/favorite-routes', data);
  },

  /**
   * Remove favorite route
   */
  async removeFavoriteRoute(routeId) {
    return await api.delete(`/api/users/me/favorite-routes/${routeId}`);
  },

  /**
   * Get user stats
   */
  async getStats() {
    return await api.get('/api/users/me/stats');
  }
};

// ============================================
// RIDE API FUNCTIONS
// ============================================

export const rideApi = {
  /**
   * Search rides
   */
  async search(filters = {}) {
    return await api.get('/api/rides', filters);
  },

  /**
   * Get ride by ID
   */
  async getById(rideId) {
    return await api.get(`/api/rides/${rideId}`);
  },

  /**
   * Create new ride
   */
  async create(data) {
    return await api.post('/api/rides', data);
  },

  /**
   * Update ride
   */
  async update(rideId, data) {
    return await api.put(`/api/rides/${rideId}`, data);
  },

  /**
   * Delete ride
   */
  async delete(rideId) {
    return await api.delete(`/api/rides/${rideId}`);
  },

  /**
   * Book a ride
   */
  async book(rideId, data) {
    return await api.post(`/api/rides/${rideId}/book`, data);
  },

  /**
   * Cancel booking
   */
  async cancelBooking(rideId) {
    return await api.post(`/api/rides/${rideId}/cancel-booking`);
  },

  /**
   * Cancel ride (driver)
   */
  async cancel(rideId) {
    return await api.post(`/api/rides/${rideId}/cancel`);
  },

  /**
   * Complete ride (driver)
   */
  async complete(rideId) {
    return await api.post(`/api/rides/${rideId}/complete`);
  },

  /**
   * Get ride status
   */
  async getStatus(rideId) {
    return await api.get(`/api/rides/${rideId}/status`);
  },

  /**
   * Update ride status
   */
  async updateStatus(rideId, status) {
    return await api.put(`/api/rides/${rideId}/status`, { status });
  },

  /**
   * Get user's rides
   */
  async getMyRides(filters = {}) {
    return await api.get('/api/users/me/rides', filters);
  },

  /**
   * Get offered rides
   */
  async getOfferedRides(filters = {}) {
    return await api.get('/api/users/me/rides/offered', filters);
  },

  /**
   * Get joined rides
   */
  async getJoinedRides(filters = {}) {
    return await api.get('/api/users/me/rides/joined', filters);
  }
};

// ============================================
// AUTH API FUNCTIONS
// ============================================

export const authApi = {
  /**
   * Request OTP
   */
  async requestOTP(phoneNumber, role = 'passenger') {
    return await api.post('/api/auth/request-otp', { phoneNumber, role });
  },

  /**
   * Verify OTP
   */
  async verifyOTP(phoneNumber, otpCode, name, role) {
    return await api.post('/api/auth/verify-otp', { phoneNumber, otpCode, name, role });
  },

  /**
   * Complete registration
   */
  async completeRegistration(phoneNumber, name, token) {
    return await api.post('/api/auth/complete-registration', { phoneNumber, name, token });
  },

  /**
   * Logout
   */
  async logout(phoneNumber) {
    const result = await api.post('/api/auth/logout', { phoneNumber });
    api.clearAuth();
    return result;
  },

  /**
   * Get current user
   */
  async getMe() {
    return await api.get('/api/auth/me');
  },

  /**
   * Check onboarding status
   */
  async checkOnboarding(phoneNumber) {
    return await api.get('/api/auth/check-onboarding', { phoneNumber });
  },

  /**
   * Resend OTP
   */
  async resendOTP(phoneNumber) {
    return await api.post('/api/auth/resend-otp', { phoneNumber });
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const utilsApi = {
  /**
   * Health check
   */
  async healthCheck() {
    return await api.get('/api/health');
  },

  /**
   * Ping database
   */
  async ping() {
    return await api.get('/api/ping');
  },

  /**
   * Get fare estimate
   */
  async getFare(pickup, destination, rideType) {
    return await api.get('/api/fare', { pickup, destination, rideType });
  },

  /**
   * Calculate route
   */
  async calculateRoute(pickup, destination, seats, adults, children) {
    return await api.get('/api/route', { pickup, destination, seats, adults, children });
  },

  /**
   * Location autocomplete
   */
  async autocomplete(query) {
    return await api.get('/api/autocomplete', { q: query });
  },

  /**
   * Reverse geocode
   */
  async reverseGeocode(lat, lon) {
    return await api.get('/api/reverse-geocode', { lat, lon });
  }
};

// ============================================
// LOCAL STORAGE SYNC
// ============================================

export const storageSync = {
  /**
   * Save user data to local storage
   */
  saveUser(user) {
    localStorage.setItem('userData', JSON.stringify(user));
  },

  /**
   * Get user data from local storage
   */
  getUser() {
    const data = localStorage.getItem('userData');
    return data ? JSON.parse(data) : null;
  },

  /**
   * Clear all stored data
   */
  clearAll() {
    localStorage.removeItem('userData');
    localStorage.removeItem('authToken');
    localStorage.removeItem('phoneNumber');
    localStorage.removeItem('recentSearches');
    localStorage.removeItem('favoriteRoutes');
  },

  /**
   * Save recent searches locally
   */
  saveRecentSearches(searches) {
    localStorage.setItem('recentSearches', JSON.stringify(searches));
  },

  /**
   * Get recent searches from local storage
   */
  getRecentSearches() {
    const data = localStorage.getItem('recentSearches');
    return data ? JSON.parse(data) : [];
  },

  /**
   * Save favorite routes locally
   */
  saveFavoriteRoutes(routes) {
    localStorage.setItem('favoriteRoutes', JSON.stringify(routes));
  },

  /**
   * Get favorite routes from local storage
   */
  getFavoriteRoutes() {
    const data = localStorage.getItem('favoriteRoutes');
    return data ? JSON.parse(data) : [];
  }
};

// ============================================
// EXPORTS
// ============================================

export default api;
export { ApiClient };

