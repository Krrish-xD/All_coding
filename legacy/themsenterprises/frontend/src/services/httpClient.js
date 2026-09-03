import axios from 'axios';
import eventService from './eventService';

// Get API base URL from environment or use production default
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.themsenterprises.com';

// Create axios instance with base configuration
const httpClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000, // 30 seconds for Lambda cold starts
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // CRITICAL: Required for CORS with credentials
});

// Request interceptor to add authorization token
httpClient.interceptors.request.use(
  (config) => {
    // Get tokens from localStorage
    const adminToken = localStorage.getItem('adminToken');
    const userToken = localStorage.getItem('token');

    const isAdminSection = window.location.pathname.startsWith('/admin');

    if (isAdminSection) {
      // If in admin section, use admin token
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
      }
    } else {
      // If on the public site, use user token
      if (userToken) {
        config.headers.Authorization = `Bearer ${userToken}`;
      }
    }

    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        headers: config.headers,
      });
    }

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
httpClient.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Response from ${response.config.url}:`, response.data);
    }
    return response;
  },
  (error) => {
    // Log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Response error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }

    // Handle different error scenarios
    if (error.response) {
      const { status, data } = error.response;
      const currentPath = window.location.pathname;

      switch (status) {
        case 401:
          // Unauthorized - token expired or invalid
          const isAdminRoute = currentPath.includes('/admin');
          const isLoginPage = currentPath === '/login';
          const isCartOperation = error.config?.url?.includes('/cart');

          // Don't redirect for cart operations (allow guest users)
          if (!isCartOperation) {
            // Clear appropriate tokens
            if (isAdminRoute) {
              localStorage.removeItem('adminToken');
              if (!currentPath.includes('/admin/login')) {
                window.location.href = '/admin/login?session=expired';
              }
            } else {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              if (!isLoginPage) {
                window.location.href = '/login?session=expired';
              }
            }
          }
          break;

        case 403:
          // Forbidden - insufficient permissions
          console.error('Access forbidden:', data.message);
          if (!currentPath.includes('/403')) {
            window.location.href = '/403';
          }
          break;

        case 404:
          // Not found
          console.error('Resource not found:', data.message);
          break;

        case 429:
          // Too many requests
          console.error('Rate limit exceeded:', data.message);
          eventService.emit('show-popup', { message: 'Too many requests. Please wait a moment and try again.', type: 'error' });
          break;

        case 500:
        case 502:
        case 503:
          // Server errors
          console.error('Server error:', data.message);
          eventService.emit('show-popup', { message: 'Server error. Please try again later.', type: 'error' });
          break;

        default:
          console.error(`HTTP ${status} error:`, data.message);
      }

      // Return structured error
      return Promise.reject({
        success: false,
        status,
        message: data.message || data.error || 'An error occurred',
        errors: data.errors || data.details,
        ...data,
      });
    } else if (error.request) {
      // Network error - no response received
      console.error('Network error - no response received:', error.message);
      
      // Check if offline
      if (!navigator.onLine) {
        eventService.emit('show-popup', { message: 'You appear to be offline. Please check your internet connection.', type: 'error' });
      } else {
        eventService.emit('show-popup', { message: 'Unable to connect to server. Please check your internet connection and try again.', type: 'error' });
      }

      return Promise.reject({
        success: false,
        message: 'Network error. Please check your connection.',
        error: 'NETWORK_ERROR',
      });
    } else {
      // Request setup error
      console.error('Request error:', error.message);
      return Promise.reject({
        success: false,
        message: error.message || 'Request failed',
        error: 'REQUEST_ERROR',
      });
    }
  }
);

// Export configured client
export default httpClient;

// Export base URL for direct use
export const API_URL = API_BASE_URL;