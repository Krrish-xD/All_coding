import React, { createContext, useState, useEffect } from 'react';
import httpClient from '../services/httpClient';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await httpClient.get('/auth/me');
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (identifier, password) => {
    try {
      setError(null);
      const response = await httpClient.post('/auth/login', {
        identifier,
        password,
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);

      // Update last login
      try {
        await httpClient.put('/auth/me', { lastLogin: new Date() });
      } catch (updateError) {
        console.warn('Failed to update last login:', updateError);
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Login with token (for OAuth)
  const loginWithToken = async (token) => {
    try {
      setError(null);
      localStorage.setItem('token', token);

      // Get user data with the token
      const response = await httpClient.get('/auth/me');

      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Token authentication failed';
      setError(errorMessage);
      localStorage.removeItem('token');
      return { success: false, error: errorMessage };
    }
  };

  // Register function
  const register = async (username, email, password) => {
    try {
      setError(null);
      const response = await httpClient.post('/auth/register', {
        username,
        email,
        password,
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      return { success: true };
    } catch (error) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.error || 'Registration failed';
      const details = errorData?.details || [];
      setError(errorMessage);
      return { success: false, error: errorMessage, details };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setError(null);
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setError(null);
      const response = await httpClient.put('/auth/me', userData);

      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Profile update failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Add to wishlist
  const addToWishlist = async (input) => {
    try {
      setError(null);
      const productId =
        typeof input === 'string' ? input :
          (input && input._id ? input._id : null);

      if (!productId) {
        setError('Invalid product ID');
        return { success: false, error: 'Invalid product ID' };
      }

      console.log('Adding to wishlist, payload:', { productId });

      // Sending multiple keys to handle potential backend mismatches
      // CHANGED: Using POST instead of PUT for better reliability with bodies
      const response = await httpClient.post('/auth/wishlist', {
        productId,
        product_id: productId,
        id: productId
      });
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Failed to add to wishlist';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Remove from wishlist
  const removeFromWishlist = async (productId) => {
    try {
      setError(null);
      const response = await httpClient.delete(`/auth/wishlist/${productId}`);

      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Failed to remove from wishlist';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Get wishlist
  const getWishlist = async () => {
    try {
      const response = await httpClient.get('/auth/wishlist');

      return { success: true, wishlist: response.data.wishlist };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Failed to fetch wishlist';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Get user stats
  const getStats = async () => {
    try {
      const response = await httpClient.get('/auth/stats');

      return { success: true, ...response.data };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Failed to fetch stats';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Get user orders
  const getOrders = async () => {
    try {
      const response = await httpClient.get('/orders/me');

      return { success: true, orders: response.data.orders };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Failed to fetch orders';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Get single order
  const getOrder = async (orderId) => {
    try {
      const response = await httpClient.get(`/orders/${orderId}`);

      return { success: true, order: response.data.order };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Failed to fetch order';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);
      await httpClient.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      return { success: true };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Password change failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Add address
  const addAddress = async (addressData) => {
    try {
      setError(null);
      const response = await httpClient.post('/auth/addresses', addressData);

      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Address addition failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update address
  const updateAddress = async (addressId, addressData) => {
    try {
      setError(null);
      const response = await httpClient.put(`/auth/addresses/${addressId}`, addressData);

      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Address update failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Delete address
  const deleteAddress = async (addressId) => {
    try {
      setError(null);
      const response = await httpClient.delete(`/auth/addresses/${addressId}`);

      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Address deletion failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    loginWithToken,
    register,
    logout,
    updateProfile,
    changePassword,
    addAddress,
    updateAddress,
    deleteAddress,
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    getStats,
    getOrders,
    getOrder,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use AuthContext
const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext, AuthProvider, useAuth };
