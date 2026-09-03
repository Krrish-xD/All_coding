import React, { useState, useEffect, useCallback } from 'react';
import { FiShoppingBag, FiHeart, FiTruck, FiStar, FiDollarSign } from 'react-icons/fi';
import httpClient from '../../services/httpClient';
import './AccountShared.css';
import './AccountOverview.css';

const AccountOverview = ({ user, setActiveSection }) => {
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getOverviewData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch both orders and wishlist data concurrently
      const [ordersResponse, wishlistResponse] = await Promise.all([
        httpClient.get('/orders/me'),
        httpClient.get('/auth/wishlist')
      ]);
      setOrders(ordersResponse.data.orders || []);
      setWishlist(wishlistResponse.data.wishlist || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getOverviewData();
  }, [getOverviewData]);

  // Frontend-calculated stats
  const safeTotalOrders = orders?.length ?? 0;
  const safeTotalSpent = orders?.reduce((acc, order) => acc + order.totalAmount, 0) ?? 0;
  const safeDelivered = orders?.filter(order => order.orderStatus === 'Delivered').length ?? 0;
  const safeWishlist = wishlist?.length ?? 0;
  const recentOrders = orders?.slice(0, 3) ?? [];

  const getStatusColor = (status) => {
    const colors = {
      'Processing': { bg: '#fff3cd', color: '#856404', border: '#ffeeba' },
      'Shipped': { bg: '#cce5ff', color: '#004085', border: '#b8daff' },
      'Delivered': { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },
      'Cancelled': { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
      'default': { bg: '#e2e3e5', color: '#383d41', border: '#d6d8db' }
    };
    return colors[status] || colors.default;
  };

  const initial = (user?.username || user?.email || 'U')?.charAt(0)?.toUpperCase();





  return (
    <div className="ao-container">
      {/* Header Section */}
      <div className="ao-header-section">
        <h1 className="ao-page-title">Account Overview</h1>
        <p className="ao-page-subtitle">Manage your account and track your orders</p>
      </div>

      {/* Profile Card */}
      <div className="ao-profile-card">
        <div className="ao-profile-avatar">
          <span>{initial}</span>
        </div>
        <div className="ao-profile-info">
          <h2 className="ao-profile-name">Welcome back, {user?.username}!</h2>
          <div className="ao-profile-details">
            <span className="ao-profile-email">{user?.email}</span>
            {user?.phone && (
              <>
                <span className="ao-detail-separator">•</span>
                <span className="ao-profile-phone">{user.phone}</span>
              </>
            )}
          </div>
        </div>
        {safeTotalSpent > 5000 && (
          <div className="ao-loyalty-badge">
            <FiStar className="badge-icon" />
            <span className="badge-text">Premium Member</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="ao-stats-section">
        <h3 className="ao-section-title">Quick Stats</h3>
        <div className="ao-stats-grid">
          <button
            type="button"
            className="ao-stat-card stat-orders"
            onClick={() => setActiveSection('orders')}
            aria-label="View all orders"
          >
            <div className="stat-header">
              <div className="stat-icon-wrapper">
                <FiShoppingBag className="stat-icon" />
              </div>
              <div className="stat-hover-indicator">→</div>
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Orders</span>
              <span className="stat-value">{safeTotalOrders}</span>
            </div>
          </button>

          <div className="ao-stat-card stat-spent">
            <div className="stat-header">
              <div className="stat-icon-wrapper">
                <FiDollarSign className="stat-icon" />
              </div>
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Spent</span>
              <span className="stat-value">₹{safeTotalSpent.toFixed(2)}</span>
            </div>
          </div>

          <div className="ao-stat-card stat-delivered">
            <div className="stat-header">
              <div className="stat-icon-wrapper">
                <FiTruck className="stat-icon" />
              </div>
            </div>
            <div className="stat-content">
              <span className="stat-label">Delivered</span>
              <span className="stat-value">{safeDelivered}</span>
            </div>
          </div>

          <button
            type="button"
            className="ao-stat-card stat-wishlist"
            onClick={() => setActiveSection('wishlist')}
            aria-label="View wishlist"
          >
            <div className="stat-header">
              <div className="stat-icon-wrapper">
                <FiHeart className="stat-icon" />
              </div>
              <div className="stat-hover-indicator">→</div>
            </div>
            <div className="stat-content">
              <span className="stat-label">Wishlist</span>
              <span className="stat-value">{safeWishlist}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="ao-orders-section">
          <div className="ao-section-header">
            <h3 className="ao-section-title">Recent Orders</h3>
            <button
              onClick={() => setActiveSection('orders')}
              className="ao-view-all-btn"
            >
              View All
            </button>
          </div>
          
          <div className="ao-orders-table">
            <div className="ao-table-header">
              <span>Order ID</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Action</span>
            </div>
            
            {recentOrders.map((order) => {
              const statusStyle = getStatusColor(order.orderStatus);
              return (
                <div key={order._id} className="ao-table-row">
                  <div className="ao-order-id">
                    <span className="order-hash">#{order._id?.slice(-8)}</span>
                  </div>
                  
                  <div className="ao-order-amount">
                    <span className="amount-value">₹{Number(order.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  
                  <div className="ao-order-status">
                    <span 
                      className="status-badge"
                      style={{
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.color,
                        borderColor: statusStyle.border
                      }}
                    >
                      {order.orderStatus}
                    </span>
                  </div>
                  
                  <div className="ao-order-action">
                    <button
                      onClick={() => setActiveSection('orders')}
                      className="ao-details-btn"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountOverview;