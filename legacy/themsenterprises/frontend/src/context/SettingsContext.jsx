import React, { createContext, useState, useEffect, useContext } from 'react';
import httpClient from '../services/httpClient';

// Create the context
const SettingsContext = createContext();

// Custom hook to use the settings context
export const useSettings = () => useContext(SettingsContext);

// Create the provider component
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Make a request to a public endpoint for settings
        const response = await httpClient.get('/settings'); 
        console.log('SETTINGS API RESPONSE:', response.data); // DEBUGGING
        setSettings(response.data);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        // Set default or empty settings on failure
        setSettings({}); 
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const value = { settings, loading };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};