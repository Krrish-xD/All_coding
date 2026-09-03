import React, { createContext, useState, useEffect, useContext } from 'react';
import httpClient from '../services/httpClient';

const AdminContext = createContext();

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      loadAdminProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const loadAdminProfile = async () => {
    try {
      const res = await httpClient.get('/admin2009/profile');
      setAdmin(res.data.admin);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Failed to load admin profile');
      localStorage.removeItem('adminToken');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
  try {
    const res = await httpClient.post('/admin2009/login', { email, password });
    const { token, admin: adminData } = res.data;

    // Save token first so future protected requests include Authorization header
    localStorage.setItem('adminToken', token);

    // Update state from login response
    setAdmin(adminData);
    setIsAuthenticated(true);

    // 🔑 Auto fetch profile from backend to ensure data is consistent/fresh
    await loadAdminProfile();

    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || 'Login failed'
    };
  }
};

  const logout = async () => {
    try {
      await httpClient.post('/admin2009/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('adminToken');
    setAdmin(null);
    setIsAuthenticated(false);
  };

  const value = {
    admin,
    loading,
    isAuthenticated,
    login,
    logout,
    loadAdminProfile,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};
