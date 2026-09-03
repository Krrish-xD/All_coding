import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import httpClient from '../../services/httpClient';

// Using ConfirmModal's CSS as a base to avoid style conflicts
import './ConfirmModal.css'; 

const OrderStatusModal = ({ isOpen, onClose, order, onStatusUpdate }) => {
  const [selectedStatus, setSelectedStatus] = useState(order?.orderStatus || '');
  const [trackingLink, setTrackingLink] = useState(order?.trackingLink || '');

  useEffect(() => {
    if (order) {
      setSelectedStatus(order.orderStatus || '');
      setTrackingLink(order.trackingLink || '');
    }
  }, [order]);

  const handleUpdateStatus = async () => {
    try {
      const payload = { orderStatus: selectedStatus };
      if (selectedStatus === 'shipped') {
        payload.trackingLink = trackingLink;
      }
      await httpClient.put(`/orders/${order._id}/status`, payload);
      onStatusUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h3>Update Status for ORD-{order?._id.slice(-8).toUpperCase()}</h3>
        </div>
        <div className="confirm-modal-body">
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="status" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Order Status</label>
            <select 
              id="status" 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }}
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {selectedStatus === 'shipped' && (
            <div className="form-group">
              <label htmlFor="trackingLink" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Tracking Link</label>
              <input
                id="trackingLink"
                type="text"
                value={trackingLink}
                onChange={(e) => setTrackingLink(e.target.value)}
                placeholder="https://example.com/track/12345"
                style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }}
              />
            </div>
          )}
        </div>
        <div className="confirm-modal-footer">
          <button onClick={onClose} className="btn-cancel">Cancel</button>
          <button onClick={handleUpdateStatus} className="btn-confirm">Update Status</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default OrderStatusModal;
