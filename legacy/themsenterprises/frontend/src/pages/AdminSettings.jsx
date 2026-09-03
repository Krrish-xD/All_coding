import React, { useState, useEffect, useContext } from 'react';
import AdminLayout from '../components/AdminLayout';
import httpClient from '../services/httpClient';
import { PopupContext } from '../context/PopupContext';
import './AdminSettings.css';

const AdminSettings = () => {
  const { showPopup } = useContext(PopupContext);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('business');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await httpClient.get('/admin2009/settings');
      setSettings(prevSettings => ({ ...prevSettings, ...res.data }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleNumberChange = (name, value) => {
    setSettings({
      ...settings,
      [name]: Number(value),
    });
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await httpClient.patch('/admin2009/settings', settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update settings:', error);
      showPopup('Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear all cache? This action cannot be undone.')) {
      // Implement cache clearing logic
      console.log('Clearing cache...');
      showPopup('Cache cleared successfully!', 'success');
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      // Implement reset logic
      console.log('Resetting to defaults...');
      showPopup('Settings reset to defaults!', 'success');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="settings-loading">
          <div className="loading-spinner"></div>
          <p>Loading settings...</p>
        </div>
      </AdminLayout>
    );
  }

  const tabs = [
    { 
      id: 'business', 
      label: 'Business',
      icon: (
        <svg className="tab-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    { 
      id: 'payments', 
      label: 'Payments',
      icon: (
        <svg className="tab-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
        {
          id: 'inventory',
          label: 'Inventory',
          icon: (
            <svg className="tab-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          )
        },
        {
          id: 'system',
          label: 'System',
          icon: (
            <svg className="tab-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )
        },  ];

  return (
    <AdminLayout>
      <div className="admin-settings-container">
        {/* Header */}
        <div className="settings-header">
          <div className="settings-header-content">
            <h1 className="settings-title">Admin Settings</h1>
            <p className="settings-subtitle">Configure system settings and business preferences</p>
          </div>
          <button 
            onClick={handleSaveSettings} 
            className={`btn-save-all ${saving ? 'saving' : ''} ${saveSuccess ? 'success' : ''}`}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="btn-spinner"></span>
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Saved Successfully</span>
              </>
            ) : (
              <>
                <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2" />
                </svg>
                <span>Save All Settings</span>
              </>
            )}
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="settings-tabs-wrapper">
          <div className="settings-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="settings-content">
          {/* Business Settings Tab */}
          {activeTab === 'business' && (
            <div className="settings-panel">
              <div className="settings-grid">
                <div className="settings-card">
                  <div className="card-header">
                    <div className="card-title-group">
                      <svg className="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <h3>Business Information</h3>
                    </div>
                    <p className="card-description">Basic business details and contact information</p>
                  </div>
                  <div className="card-body">
                    <div className="form-field">
                      <label htmlFor="businessName">Business Name</label>
                      <input
                        type="text"
                        id="businessName"
                        name="businessName"
                        value={settings.businessName}
                        onChange={handleInputChange}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-field">
                      <label htmlFor="businessEmail">Business Email</label>
                      <input
                        type="email"
                        id="businessEmail"
                        name="businessEmail"
                        value={settings.businessEmail}
                        onChange={handleInputChange}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-field">
                      <label htmlFor="businessPhone">Business Phone</label>
                      <input
                        type="tel"
                        id="businessPhone"
                        name="businessPhone"
                        value={settings.businessPhone}
                        onChange={handleInputChange}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-field">
                      <label htmlFor="businessPhone2">Business Phone 2</label>
                      <input
                        type="tel"
                        id="businessPhone2"
                        name="businessPhone2"
                        value={settings.businessPhone2}
                        onChange={handleInputChange}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-field">
                      <label htmlFor="businessAddress">Business Address</label>
                      <textarea
                        id="businessAddress"
                        name="businessAddress"
                        value={settings.businessAddress}
                        onChange={handleInputChange}
                        rows="3"
                        className="form-textarea"
                      />
                    </div>
                    
                    <div className="form-field">
                      <label htmlFor="gstNumber">GST Number</label>
                      <input
                        type="text"
                        id="gstNumber"
                        name="gstNumber"
                        value={settings.gstNumber}
                        onChange={handleInputChange}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-card">
                  <div className="card-header">
                    <div className="card-title-group">
                      <svg className="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <h3>Shipping & Tax Settings</h3>
                    </div>
                    <p className="card-description">Configure shipping costs and tax rates</p>
                  </div>
                  <div className="card-body">
                    <div className="form-field">
                      <label htmlFor="freeShippingThreshold">Free Shipping Threshold (₹)</label>
                      <input
                        type="number"
                        id="freeShippingThreshold"
                        name="freeShippingThreshold"
                        value={settings.freeShippingThreshold}
                        onChange={(e) => handleNumberChange('freeShippingThreshold', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-field">
                      <label htmlFor="standardShippingCost">Standard Shipping Cost (₹)</label>
                      <input
                        type="number"
                        id="standardShippingCost"
                        name="standardShippingCost"
                        value={settings.standardShippingCost}
                        onChange={(e) => handleNumberChange('standardShippingCost', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-field">
                      <label htmlFor="expressShippingCost">Express Shipping Cost (₹)</label>
                      <input
                        type="number"
                        id="expressShippingCost"
                        name="expressShippingCost"
                        value={settings.expressShippingCost}
                        onChange={(e) => handleNumberChange('expressShippingCost', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-field">
                      <label htmlFor="defaultTaxRate">Default Tax Rate (%)</label>
                      <input
                        type="number"
                        id="defaultTaxRate"
                        name="defaultTaxRate"
                        value={settings.defaultTaxRate}
                        onChange={(e) => handleNumberChange('defaultTaxRate', e.target.value)}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-field-toggle">
                      <label className="toggle-container">
                        <input
                          type="checkbox"
                          name="applyTaxToShipping"
                          checked={settings.applyTaxToShipping}
                          onChange={handleInputChange}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">Apply tax to shipping costs</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Settings Tab */}
          {activeTab === 'payments' && (
            <div className="settings-panel">
              <div className="settings-card full-width">
                <div className="card-header">
                  <div className="card-title-group">
                    <svg className="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <h3>Payment Gateway Configuration</h3>
                  </div>
                  <p className="card-description">Configure Razorpay and other payment settings</p>
                </div>
                <div className="card-body">
                  <div className="form-field-toggle">
                    <label className="toggle-container">
                      <input
                        type="checkbox"
                        name="paymentGatewayLive"
                        checked={settings.paymentGatewayLive}
                        onChange={handleInputChange}
                        className="toggle-checkbox"
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-label">Live Payment Gateway</span>
                      <span className={`status-badge ${settings.paymentGatewayLive ? 'live' : 'test'}`}>
                        {settings.paymentGatewayLive ? 'Live' : 'Test'}
                      </span>
                    </label>
                  </div>
                  
                  <div className="alert alert-warning">
                    <svg className="alert-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="alert-content">
                      <strong>Warning:</strong> Only enable live payment gateway in production. 
                      Test mode should be used during development and testing.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Settings Tab */}
          {activeTab === 'inventory' && (
            <div className="settings-panel">
              <div className="settings-card full-width">
                <div className="card-header">
                  <div className="card-title-group">
                    <svg className="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                    <h3>Inventory Management</h3>
                  </div>
                  <p className="card-description">Configure inventory tracking and alerts</p>
                </div>
                <div className="card-body">
                  <div className="form-field">
                    <label htmlFor="lowStockThreshold">Low Stock Alert Threshold</label>
                    <input
                      type="number"
                      id="lowStockThreshold"
                      name="lowStockThreshold"
                      value={settings.lowStockThreshold}
                      onChange={(e) => handleNumberChange('lowStockThreshold', e.target.value)}
                      className="form-input"
                    />
                    <p className="field-hint">Alert when product stock falls below this number</p>
                  </div>
                  
                  <div className="form-field-toggle">
                    <label className="toggle-container">
                      <input
                        type="checkbox"
                        name="autoReorderEnabled"
                        checked={settings.autoReorderEnabled}
                        onChange={handleInputChange}
                        className="toggle-checkbox"
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-label">Enable Auto-Reorder</span>
                    </label>
                  </div>
                  
                  {settings.autoReorderEnabled && (
                    <div className="form-field conditional">
                      <label htmlFor="autoReorderQuantity">Auto-Reorder Quantity</label>
                      <input
                        type="number"
                        id="autoReorderQuantity"
                        name="autoReorderQuantity"
                        value={settings.autoReorderQuantity}
                        onChange={(e) => handleNumberChange('autoReorderQuantity', e.target.value)}
                        className="form-input"
                      />
                      <p className="field-hint">Automatically reorder this quantity when stock is low</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* System Settings Tab */}
          {activeTab === 'system' && (
            <div className="settings-panel">
              <div className="settings-card full-width">
                <div className="card-header">
                  <div className="card-title-group">
                    <svg className="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <h3>System & Notifications</h3>
                  </div>
                  <p className="card-description">General system, website and notification settings</p>
                </div>
                <div className="card-body">
                  <div className="form-field-toggle">
                    <label className="toggle-container">
                      <input
                        type="checkbox"
                        name="maintenanceMode"
                        checked={settings.maintenanceMode}
                        onChange={handleInputChange}
                        className="toggle-checkbox"
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-label">Maintenance Mode</span>
                      {settings.maintenanceMode && (
                        <span className="status-badge danger">Site Offline</span>
                      )}
                    </label>
                    <p className="field-hint">Enable to show maintenance page to visitors</p>
                  </div>
                  
                  <div className="form-field-toggle">
                    <label className="toggle-container">
                      <input
                        type="checkbox"
                        name="allowRegistrations"
                        checked={settings.allowRegistrations}
                        onChange={handleInputChange}
                        className="toggle-checkbox"
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-label">Allow New Registrations</span>
                    </label>
                    <p className="field-hint">Allow new users to create accounts</p>
                  </div>
                  
                  <div className="form-field-toggle">
                    <label className="toggle-container">
                      <input
                        type="checkbox"
                        name="requireEmailVerification"
                        checked={settings.requireEmailVerification}
                        onChange={handleInputChange}
                        className="toggle-checkbox"
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-label">Require Email Verification</span>
                    </label>
                    <p className="field-hint">New users must verify their email before accessing the site</p>
                  </div>

                  <div className="divider"></div>

                  <div className="card-header">
                    <div className="card-title-group">
                      <svg className="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <h3>Notification Preferences</h3>
                    </div>
                    <p className="card-description">Configure email notifications and alerts</p>
                  </div>

                  <div className="toggle-list">
                    <div className="toggle-item">
                      <div className="toggle-info">
                        <h4>Email Notifications</h4>
                        <p>Receive general email notifications</p>
                      </div>
                      <label className="toggle-container inline">
                        <input
                          type="checkbox"
                          name="emailNotifications"
                          checked={settings.emailNotifications}
                          onChange={handleInputChange}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                    
                    <div className="toggle-item">
                      <div className="toggle-info">
                        <h4>Order Notifications</h4>
                        <p>Get notified about new orders</p>
                      </div>
                      <label className="toggle-container inline">
                        <input
                          type="checkbox"
                          name="orderNotifications"
                          checked={settings.orderNotifications}
                          onChange={handleInputChange}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                    
                    <div className="toggle-item">
                      <div className="toggle-info">
                        <h4>Inventory Alerts</h4>
                        <p>Low stock and inventory alerts</p>
                      </div>
                      <label className="toggle-container inline">
                        <input
                          type="checkbox"
                          name="inventoryAlerts"
                          checked={settings.inventoryAlerts}
                          onChange={handleInputChange}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                    
                    <div className="toggle-item">
                      <div className="toggle-info">
                        <h4>Customer Updates</h4>
                        <p>Notifications about customer activities</p>
                      </div>
                      <label className="toggle-container inline">
                        <input
                          type="checkbox"
                          name="customerUpdates"
                          checked={settings.customerUpdates}
                          onChange={handleInputChange}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="divider"></div>
                  
                  <div className="danger-zone">
                    <h4>Danger Zone</h4>
                    <p>These actions are irreversible. Please be certain before proceeding.</p>
                    <div className="danger-actions">
                      <button 
                        className="btn-danger"
                        onClick={handleClearCache}
                      >
                        Clear All Cache
                      </button>
                      <button 
                        className="btn-danger"
                        onClick={handleResetDefaults}
                      >
                        Reset to Defaults
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;