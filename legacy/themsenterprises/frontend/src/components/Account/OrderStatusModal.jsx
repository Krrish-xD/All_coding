import React from 'react';
import { FiX, FiPackage } from 'react-icons/fi';
import './OrderStatusModal.css';

const OrderStatusModal = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null;

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { text: 'Your order is pending confirmation.', color: '#6c757d' };
      case 'processing':
        return { text: 'Your order is being processed.', color: '#ffa500' };
      case 'shipped':
        return { text: 'Your order has been shipped.', color: '#007bff' };
      case 'delivered':
        return { text: 'Your order has been delivered.', color: '#28a745' };
      case 'cancelled':
        return { text: 'Your order has been cancelled.', color: '#dc3545' };
      default:
        return { text: 'Status unknown.', color: '#6c757d' };
    }
  };

  const statusInfo = getStatusInfo(order.orderStatus);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="order-status-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><FiPackage /> Order Status</h3>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="close-btn"><FiX /></button>
        </div>
        <div className="modal-body">
          <p className="order-id">Order ID: #{order._id.slice(-8)}</p>
          <div className="status-display" style={{ borderColor: statusInfo.color }}>
            <p style={{ color: statusInfo.color }}>{order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}</p>
            <span>{statusInfo.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusModal;
