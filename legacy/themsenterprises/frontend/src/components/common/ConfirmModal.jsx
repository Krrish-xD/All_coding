import React from 'react';
import { FiUser, FiMapPin, FiPackage, FiX } from 'react-icons/fi';
import './ConfirmModal.css';

// This is the final, correct, self-contained component that renders customizations.
const FinalCustomizationDisplay = ({ item }) => {
  if (!item || !item.customization?.dynamicCustomizations) {
    return null;
  }

  const dynamicCustomizations = item.customization.dynamicCustomizations;

  return (
    <div className="item-customization-new">
      {Object.values(dynamicCustomizations).map(cust => (
        <div key={cust.name} className="customization-item">
          <span className="customization-key">{cust.name}:</span>
          <span className="customization-value">
            {typeof cust.value === 'object' && cust.value.url ? (
              <a href={cust.value.url} target="_blank" rel="noopener noreferrer">
                <img src={cust.value.url} alt={cust.value.name || 'customization'} style={{ maxWidth: '100px', maxHeight: '100px' }} />
              </a>
            ) : (
              cust.value?.toString()
            )}
          </span>
        </div>
      ))}
    </div>
  );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, order }) => {
  if (!isOpen) return null;

  // If an order object is passed, display order details.
  if (order) {
    return (
      <div className="confirm-modal-overlay" onClick={onClose}>
        <div className="confirm-modal-content details-view" onClick={(e) => e.stopPropagation()}>
          <div className="confirm-modal-header">
            <h2><FiPackage /> {title}</h2>
            <button className="modal-close" onClick={onClose}><FiX /></button>
          </div>
          <div className="confirm-modal-body">
            {/* Customer & Shipping Details */}
            <div className="modal-details-grid">
              <div className="info-card">
                <h3 className="info-card-header"><FiUser /> Customer Details</h3>
                <div className="info-card-body">
                  <p><strong>Name:</strong> {order.user?.username || 'N/A'}</p>
                  <p><strong>Email:</strong> {order.user?.email || 'N/A'}</p>
                </div>
              </div>
              <div className="info-card">
                <h3 className="info-card-header"><FiMapPin /> Shipping Information</h3>
                <div className="info-card-body">
                  <p><strong>Name:</strong> {order.shippingAddress?.name}</p>
                  <p><strong>Address:</strong> {order.shippingAddress?.address}</p>
                  <p><strong>City:</strong> {order.shippingAddress?.city}, {order.shippingAddress?.postalCode}</p>
                  <p><strong>Country:</strong> {order.shippingAddress?.country}</p>
                  <p><strong>Phone:</strong> {order.shippingAddress?.phone}</p>
                </div>
              </div>
            </div>

            {/* Tracking Link Card */}
            {order.trackingLink && (
              <div className="info-card">
                <h3 className="info-card-header">Tracking Information</h3>
                <div className="info-card-body">
                  <p><strong>Tracking Link:</strong> <a href={order.trackingLink} target="_blank" rel="noopener noreferrer">{order.trackingLink}</a></p>
                </div>
              </div>
            )}

            {/* Products Card */}
            <div className="info-card">
              <h3 className="info-card-header">Products</h3>
              <div className="info-card-body">
                {order.products.map((item, index) => {
                  if (!item.product) {
                    return <div key={index} className="cart-item-card"><p>Error: Product data missing.</p></div>;
                  }
                  return (
                    <div key={`${item.product._id}-${index}`} className="cart-item-card">
                      <div className="cart-item-content">
                        <div className="item-image-link">
                          <img src={item.product.images?.[0] || '/logo.png'} alt={item.product.name} />
                        </div>
                        <div className="item-details-new">
                          <div className="item-name">{item.product.name} (x{item.quantity})</div>
                          <FinalCustomizationDisplay item={item} />
                          <div className="item-price-section">Total: ₹{(item.price * item.quantity).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default behavior: show confirmation dialog.
  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <h3>{title}</h3>
        </div>
        <div className="confirm-modal-body">
          <p>{message}</p>
        </div>
        <div className="confirm-modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
