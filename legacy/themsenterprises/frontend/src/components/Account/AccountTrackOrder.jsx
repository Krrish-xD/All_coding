import React from 'react';
import { FiCalendar } from 'react-icons/fi';
import './AccountTrackOrder.css';

const AccountTrackOrder = ({ trackOrderId, setTrackOrderId, trackedOrder, handleTrackOrder, setActiveSection }) => {
  return (
    <div className="account-section">
      <h2>Track Your Order</h2>
      <div className="track-order-form">
        <div className="form-group">
          <label>Enter Order ID</label>
          <input
            type="text"
            value={trackOrderId}
            onChange={(e) => setTrackOrderId(e.target.value)}
            placeholder="e.g., 507f1f77bcf86cd799439011"
          />
        </div>
        <button onClick={handleTrackOrder} className="track-btn">
          Track Order
        </button>
      </div>
      {trackedOrder && (
        <div className="order-tracking">
          <h3>Order #{trackedOrder._id.slice(-8)}</h3>
          <div className="tracking-timeline">
            {['Processing', 'Shipped', 'Delivered'].map((status, index) => (
              <div key={status} className={`timeline-step ${trackedOrder.orderStatus === status ? 'active' : ''}`}>
                <div className="step-circle"></div>
                <div className="step-content">
                  <h4>{status}</h4>
                  {trackedOrder.orderStatus === status && (
                    <p>{new Date(trackedOrder.updatedAt).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="tracking-details">
            <p><strong>Status:</strong> {trackedOrder.orderStatus}</p>
            <p><strong>Total:</strong> ₹{trackedOrder.totalAmount.toFixed(2)}</p>
            {trackedOrder.trackingNumber && (
              <p><strong>Tracking Number:</strong> {trackedOrder.trackingNumber}</p>
            )}
            <p><strong>Estimated Delivery:</strong> {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountTrackOrder;
