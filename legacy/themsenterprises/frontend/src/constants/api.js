// ============================================================================
// API CONFIGURATION
// ============================================================================

// Get API base URL from environment variables
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.themsenterprises.com';
export const API_BASE = `${API_BASE_URL}/api`;

// Website configuration
export const WEBSITE_URL = process.env.REACT_APP_WEBSITE_URL || 'https://themsenterprises.com';
export const WEBSITE_NAME = process.env.REACT_APP_WEBSITE_NAME || 'MS Enterprises & Jaksh';

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const API_ENDPOINTS = {
  // ===== AUTH ENDPOINTS =====
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    PROFILE: '/auth/profile',
    UPDATE_PROFILE: '/auth/update-profile',
    CHANGE_PASSWORD: '/auth/change-password',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    
    // Google OAuth
    GOOGLE_AUTH: '/auth/google',
    GOOGLE_CALLBACK: '/auth/google/callback',
  },

  // ===== PRODUCT ENDPOINTS =====
  PRODUCTS: {
    LIST: '/products',
    DETAIL: (id) => `/products/${id}`,
    SEARCH: '/products/search',
    CATEGORIES: '/products/categories',
    FEATURED: '/products/featured',
    BESTSELLERS: '/products/bestsellers',
    NEW_ARRIVALS: '/products/new-arrivals',
  },

  // ===== CART ENDPOINTS =====
  CART: {
    GET: '/cart',
    ADD: '/cart',
    UPDATE: (id) => `/cart/${id}`,
    REMOVE: (id) => `/cart/${id}`,
    CLEAR: '/cart/clear',
    COUNT: '/cart/count',
  },

  // ===== ORDER ENDPOINTS =====
  ORDERS: {
    LIST: '/orders',
    CREATE: '/orders',
    DETAIL: (id) => `/orders/${id}`,
    CANCEL: (id) => `/orders/${id}/cancel`,
    TRACK: (id) => `/orders/${id}/track`,
  },

  // ===== PAYMENT ENDPOINTS =====
  PAYMENTS: {
    CREATE_ORDER: '/payments/create-order',
    VERIFY: '/payments/verify',
    WEBHOOK: '/payments/webhook',
  },

  // ===== REVIEW ENDPOINTS =====
  REVIEWS: {
    LIST: (productId) => `/products/${productId}/reviews`,
    CREATE: '/reviews',
    UPDATE: (id) => `/reviews/${id}`,
    DELETE: (id) => `/reviews/${id}`,
    ADMIN_ALL: '/reviews/admin',
    ADMIN_APPROVE: (id) => `/reviews/${id}/approve`,
    ADMIN_REJECT: (id) => `/reviews/${id}/reject`,
  },

  // ===== CUSTOMIZATION ENDPOINTS =====
  CUSTOMIZATIONS: {
    LIST: '/customizations',
    DETAIL: (id) => `/customizations/${id}`,
  },

  // ===== ADMIN ENDPOINTS =====
  ADMIN: {
    // Auth
    LOGIN: '/admin2009/login',
    ME: '/admin2009/me',
    LOGOUT: '/admin2009/logout',
    
    // Dashboard
    STATS: '/admin2009/stats',
    RECENT_ORDERS: '/admin2009/recent-orders',
    
    // Products
    PRODUCTS: '/admin/products',
    PRODUCT_CREATE: '/admin/products',
    PRODUCT_UPDATE: (id) => `/admin/products/${id}`,
    PRODUCT_DELETE: (id) => `/admin/products/${id}`,
    
    // Orders
    ORDERS: '/admin/orders',
    ORDER_UPDATE: (id) => `/admin/orders/${id}`,
    ORDER_UPDATE_STATUS: (id) => `/admin/orders/${id}/status`,
    
    // Users
    USERS: '/admin/users',
    USER_UPDATE: (id) => `/admin/users/${id}`,
    USER_DELETE: (id) => `/admin/users/${id}`,
    
    // Reviews
    REVIEWS: '/admin/reviews',
    REVIEW_APPROVE: (id) => `/admin/reviews/${id}/approve`,
    REVIEW_REJECT: (id) => `/admin/reviews/${id}/reject`,
    REVIEW_DELETE: (id) => `/admin/reviews/${id}`,
  },
};

// ============================================================================
// EXTERNAL SERVICES
// ============================================================================

// Razorpay
export const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID;

// Google OAuth
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// AWS S3 (if needed for direct access)
export const S3_BUCKET_URL = process.env.REACT_APP_S3_BUCKET_URL || 
  'https://themsenterprises-product-images.s3.ap-south-1.amazonaws.com';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build full API URL
 * @param {string} endpoint - API endpoint
 * @returns {string} Full API URL
 */
export const buildApiUrl = (endpoint) => {
  return `${API_BASE}${endpoint}`;
};

/**
 * Build image URL from S3 or API
 * @param {string} imagePath - Image path
 * @returns {string} Full image URL
 */
export const buildImageUrl = (imagePath) => {
  if (!imagePath) return '/placeholder.png';
  
  // If already a full URL, return as is
  if (imagePath.startsWith('http')) return imagePath;
  
  // If S3 path, use S3 bucket URL
  if (imagePath.startsWith('products/')) {
    return `${S3_BUCKET_URL}/${imagePath}`;
  }
  
  // Otherwise, use API base URL
  return `${API_BASE_URL}${imagePath}`;
};

/**
 * Check if running in production
 * @returns {boolean}
 */
export const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Check if running in development
 * @returns {boolean}
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};