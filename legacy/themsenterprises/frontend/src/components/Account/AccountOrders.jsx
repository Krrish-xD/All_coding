import React from 'react';
import { FiShoppingBag } from 'react-icons/fi';
import './AccountOrders.css';

const AccountOrders = ({ orders, loading, error, handleReorder, handleShowTrackModal }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Processing': return '#ffa500';
      case 'Shipped': return '#007bff';
      case 'Delivered': return '#28a745';
      case 'Cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="account-section">
        <h2>Order History</h2>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="account-section">
        <h2>Order History</h2>
        <div className="error">{error}</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="account-section">
        <h2>Order History</h2>
        <div className="empty-state">
          <FiShoppingBag />
          <h3>No orders yet</h3>
          <p>Start shopping to see your orders here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-section">
      <h2>Order History</h2>
      <div className="orders-list">
        {orders.map(order => (
          <div key={order._id} className="order-card">
            <div className="order-header">
              <div>
                <h4>Order #{order._id.slice(-8)}</h4>
                <p>{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="order-status">
                <span style={{ color: getStatusColor(order.orderStatus) }}>
                  {order.orderStatus}
                </span>
                <p>₹{order.totalAmount.toFixed(2)}</p>
              </div>
            </div>
            <div className="order-products">
              {order.products.slice(0, 3).map((item, index) => (
                <div key={index} className="product-preview">
                  <img src={item.product.images[0]} alt={item.product.name} />
                  <div>
                    <p>{item.product.name}</p>
                    <p>Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
              {order.products.length > 3 && <p>+{order.products.length - 3} more items</p>}
            </div>
            <div className="order-actions">
              <button onClick={() => handleReorder(order)} className="reorder-btn">
                Reorder
              </button>
              <button 
                onClick={() => order.trackingLink && window.open(order.trackingLink, '_blank')}
                className="track-btn"
                disabled={!order.trackingLink}
              >
                Track Order
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccountOrders;
