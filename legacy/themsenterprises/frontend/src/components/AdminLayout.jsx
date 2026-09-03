import React, { useState, useEffect, createContext, useContext } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import './AdminLayout.css';

import NewSpinner from './common/NewSpinner';

// Context for form dirty state
const FormDirtyContext = createContext();
export const useFormDirty = () => useContext(FormDirtyContext);

// ============== CONFIRM MODAL COMPONENT ==============
const ConfirmModal = ({ show, onConfirm, onCancel, message }) => {
  if (!show) return null;
  return (
    <div className="confirm-overlay">
      <div className="confirm-modal">
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-confirm" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

// ============== MAIN ADMIN LAYOUT ==============
const AdminLayout = ({ children }) => {
  const { admin, logout, loading } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Form dirty state
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Actions
  const handleLogout = async () => {
    await logout();
    navigate('/admin2009/login');
  };

  const handleBackToSite = () => {
    navigate('/');
  };

  const openConfirmation = (action) => {
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const confirmHandler = () => {
    if (confirmAction === 'logout') handleLogout();
    if (confirmAction === 'back') handleBackToSite();
    if (confirmAction === 'navigate') {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const cancelHandler = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
    setPendingNavigation(null);
  };

  // Navigation with dirty check
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const handleNavigation = (path) => {
    if (isFormDirty) {
      setPendingNavigation(path);
      setConfirmAction('navigate');
      setShowConfirmModal(true);
    } else {
      navigate(path);
    }
  };

  // Menu items
  const menuItems = [
    {
      path: '/admin2009/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      path: '/admin2009/orders',
      label: 'Orders',
      icon: (
        <svg className="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    },
    {
      path: '/admin2009/products',
      label: 'Products',
      icon: (
        <svg className="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      path: '/admin2009/customers',
      label: 'Customers',
      icon: (
        <svg className="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      path: '/admin2009/reports',
      label: 'Reports',
      icon: (
        <svg className="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      path: '/admin2009/coupons',
      label: 'Coupons',
      icon: (
        <svg className="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      )
    },
    {
      path: '/admin2009/settings',
      label: 'Settings',
      icon: (
        <svg className="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
  ];

  // Close mobile sidebar when route changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Check authentication
  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin2009/login');
    }
  }, [admin, loading, navigate]);

  if (loading || !admin) {
    return (
      <div className="admin-loading">
        <NewSpinner />
        <p>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <FormDirtyContext.Provider value={{ isFormDirty, setIsFormDirty }}>
      <div className="admin-layout-modern">
      {/* Confirm Modal */}
      <ConfirmModal
        show={showConfirmModal}
        onConfirm={confirmHandler}
        onCancel={cancelHandler}
        message={
          confirmAction === 'logout' ? "Are you sure you want to sign out?" :
          confirmAction === 'back' ? "Leave admin panel and go back to the site?" :
          "Please ensure that you have no unsaved changes."
        }
      />

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar-modern ${sidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header-modern">
          <div className="sidebar-logo">
            <div className="logo-icon"><span>MS</span></div>
            {!sidebarCollapsed && (
              <div className="logo-text">
                <h3>MS Enterprises</h3>
                <span>Admin Panel</span>
              </div>
            )}
          </div>
          <button className="sidebar-toggle desktop-only"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={sidebarCollapsed ? "M13 5l7 7-7 7" : "M11 19l-7-7 7-7"} />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <div className="sidebar-section">
          {!sidebarCollapsed && <div className="section-label">NAVIGATION</div>}
          <nav className="sidebar-nav-modern">
            {menuItems.map(item => (
              <button key={item.path} onClick={() => handleNavigation(item.path)}
                className={`nav-item-modern ${location.pathname === item.path ? 'active' : ''}`}
                title={sidebarCollapsed ? item.label : ''}>
                {item.icon}
                {!sidebarCollapsed && <span className="nav-label-modern">{item.label}</span>}
                {!sidebarCollapsed && location.pathname === item.path && (
                  <span className="active-indicator"></span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Quick Actions */}
        <div className="sidebar-section">
          {!sidebarCollapsed && <div className="section-label">QUICK ACTIONS</div>}
          <div className="quick-actions">
            <button onClick={() => openConfirmation('back')}
              className="action-item" title={sidebarCollapsed ? 'Back to Site' : ''}>
              <svg className="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {!sidebarCollapsed && <span>Back to Site</span>}
            </button>
            <button onClick={() => openConfirmation('logout')}
              className="action-item logout" title={sidebarCollapsed ? 'Sign Out' : ''}>
              <svg className="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>

        {/* Admin Info Footer (RESTORED) */}
        <div className="sidebar-footer-modern">
          <div className="admin-card">
            <div className="admin-avatar-small">
              <span>{admin?.email?.charAt(0).toUpperCase()}</span>
            </div>
            {!sidebarCollapsed && (
              <div className="admin-info-small">
                <div className="admin-role">Signed in as Admin</div>
                <div className="admin-email-small">{admin?.email}</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-main-modern">
        <header className="admin-header-modern">
          <div className="header-left-modern">
            <button className="mobile-menu-toggle"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="breadcrumb">
              <span className="breadcrumb-item">Admin Panel</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">
                {menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="header-right-modern">
            <div className="welcome-message">
              Welcome back, <span className="admin-name-highlight">Admin</span>
            </div>
            <button onClick={() => openConfirmation('back')} className="back-to-site-btn">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Back to Site
            </button>
          </div>
        </header>
        <main className="admin-content-modern">{children || <Outlet />}</main>
      </div>
      </div>
    </FormDirtyContext.Provider>
  );
};

export default AdminLayout;