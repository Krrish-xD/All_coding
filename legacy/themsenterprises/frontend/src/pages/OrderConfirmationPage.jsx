import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE } from '../constants/api';
import Spinner from '../components/common/Spinner';
import './OrderConfirmationPage.css';
import { FiCheckCircle, FiPackage, FiDownload, FiMail, FiTruck, FiHome, FiMapPin, FiPhone, FiShoppingBag, FiClock } from 'react-icons/fi';

const OrderConfirmationPage = () => {
  const { user } = useAuth();
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchOrder();
  }, [user, orderId, navigate]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setOrder(response.data.order);
        setShowSuccess(true);
      } else {
        setError('Order not found');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Order not found');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view this order');
      } else {
        setError('Failed to load order details');
      }
      console.error('Fetch order error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getOrderStatusStep = (status) => {
    const statusMap = {
      'pending': 0,
      'processing': 1,
      'shipped': 2,
      'delivered': 3,
      'cancelled': -1,
      'Payment Failed': -1
    };
    return statusMap[status] || 0;
  };

  if (loading) {
    return (
      <div className="confirmation-page-gradient">
        <div className="confirmation-container">
          <div className="loading-state">
            <Spinner />
            <p>Loading your order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="confirmation-page-gradient">
        <div className="confirmation-container">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h2>Oops! Something went wrong</h2>
            <p className="error-message">{error}</p>
            <div className="error-actions">
              <Link to="/account/orders" className="btn btn-primary">
                View My Orders
              </Link>
              <Link to="/products" className="btn btn-outline">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const currentStep = getOrderStatusStep(order.orderStatus);
  const isPaymentFailed = order.orderStatus === 'Payment Failed' || order.orderStatus === 'cancelled';

  return (
    <div className="confirmation-page-gradient">
      <div className="confirmation-container">
        
        {/* Success Header */}
        <div className={`confirmation-hero ${showSuccess ? 'animate-in' : ''}`}>
          <div className="success-icon-wrapper">
            <FiCheckCircle className="success-icon" />
          </div>
          <h1 className="confirmation-title">
            {isPaymentFailed ? 'Order Created' : 'Order Confirmed!'}
          </h1>
          <p className="confirmation-subtitle">
            {isPaymentFailed 
              ? 'Your order has been created, but payment verification is pending.'
              : 'Thank you for your purchase! Your order has been placed successfully.'}
          </p>
          <div className="order-number">
            <span className="order-label">Order Number:</span>
            <span className="order-id">#{order._id.slice(-8).toUpperCase()}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-bar">
          <Link to={`/account/orders`} className="action-btn action-primary">
            <FiPackage />
            <span>Track Order</span>
          </Link>
          <button onClick={handlePrint} className="action-btn">
            <FiDownload />
            <span>Download Invoice</span>
          </button>
          <a href="mailto:support@themsenterprises.com" className="action-btn">
            <FiMail />
            <span>Contact Support</span>
          </a>
        </div>

        {/* Order Timeline */}
        {!isPaymentFailed && (
          <div className="order-timeline-card">
            <h3 className="timeline-title">Order Status</h3>
            <div className="timeline">
              <div className={`timeline-step ${currentStep >= 0 ? 'completed' : ''}`}>
                <div className="timeline-icon">
                  <FiCheckCircle />
                </div>
                <div className="timeline-content">
                  <div className="timeline-label">Order Placed</div>
                  <div className="timeline-date">{new Date(order.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
              
              <div className={`timeline-connector ${currentStep >= 1 ? 'active' : ''}`}></div>
              
              <div className={`timeline-step ${currentStep >= 1 ? 'completed' : currentStep === 0 ? 'current' : ''}`}>
                <div className="timeline-icon">
                  <FiPackage />
                </div>
                <div className="timeline-content">
                  <div className="timeline-label">Processing</div>
                  <div className="timeline-date">1-2 business days</div>
                </div>
              </div>
              
              <div className={`timeline-connector ${currentStep >= 2 ? 'active' : ''}`}></div>
              
              <div className={`timeline-step ${currentStep >= 2 ? 'completed' : currentStep === 1 ? 'current' : ''}`}>
                <div className="timeline-icon">
                  <FiTruck />
                </div>
                <div className="timeline-content">
                  <div className="timeline-label">Shipped</div>
                  <div className="timeline-date">3-5 business days</div>
                </div>
              </div>
              
              <div className={`timeline-connector ${currentStep >= 3 ? 'active' : ''}`}></div>
              
              <div className={`timeline-step ${currentStep >= 3 ? 'completed' : currentStep === 2 ? 'current' : ''}`}>
                <div className="timeline-icon">
                  <FiHome />
                </div>
                <div className="timeline-content">
                  <div className="timeline-label">Delivered</div>
                  <div className="timeline-date">{order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : '5-7 business days'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="confirmation-grid">
          
          {/* Left Column - Order Items */}
          <div className="confirmation-main">
            
            {/* Order Items */}
            <div className="confirmation-card">
              <div className="card-header">
                <h2>Order Items</h2>
                <span className="item-count">{order.products.length} {order.products.length === 1 ? 'item' : 'items'}</span>
              </div>
              <div className="card-content">
                <div className="order-items-list">
                  {order.products.map((item, index) => {
                    const hasVisibleCustomizations = item.customization && (
                      (item.customization.dynamicCustomizations && Object.keys(item.customization.dynamicCustomizations).length > 0) ||
                      (item.customization.uploadedFiles && item.customization.uploadedFiles.length > 0) ||
                      (item.customization.comments && item.customization.comments.trim() !== '') ||
                      Object.keys(item.customization).some(key => 
                        !['dynamicCustomizations', 'uploadedFiles', 'comments'].includes(key) && 
                        item.customization[key]
                      )
                    );

                    return (
                      <div key={index} className="order-item-card">
                        <div className="order-item-image">
                          <img 
                            src={item.product.images?.[0] || item.product.image || '/logo.png'} 
                            alt={item.product.name}
                            onError={(e) => { e.target.src = '/logo.png'; }}
                          />
                        </div>
                        <div className="order-item-details">
                          <h4 className="item-name">{item.product.name}</h4>
                          <div className="item-meta-row">
                            <span className="item-brand">{item.product.brand}</span>
                            {item.product.category && (
                              <span className="item-category">{item.product.category}</span>
                            )}
                          </div>
                          
                          {/* Customizations - Matching Cart Display */}
                          {hasVisibleCustomizations && (
                            <div className="item-customizations">
                              {Object.entries(item.customization).map(([key, value]) => {
                                if (key === 'dynamicCustomizations') {
                                  return Object.entries(value).map(([id, obj]) => (
                                    <div key={id} className="customization-item">
                                      <span className="customization-key">{obj.name}:</span>
                                      <span className="customization-value">
                                        {Array.isArray(obj.value) ? obj.value.join(', ') : obj.value?.toString()}
                                      </span>
                                    </div>
                                  ));
                                } else if (key === 'uploadedFiles') {
                                  return (
                                    <div key={key} className="customization-item">
                                      <span className="customization-key">Files:</span>
                                      <span className="customization-value">{value.length} uploaded</span>
                                    </div>
                                  );
                                } else if (key === 'comments') {
                                  return (
                                    <div key={key} className="customization-item">
                                      <span className="customization-key">Comments:</span>
                                      <span className="customization-value">{value}</span>
                                    </div>
                                  );
                                }
                                return (
                                  <div key={key} className="customization-item">
                                    <span className="customization-key">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
                                    <span className="customization-value">
                                      {typeof value === 'object' ? (value?.name || 'Uploaded file') : value}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="item-quantity-price">
                            <span className="item-quantity">Qty: {item.quantity}</span>
                            <span className="item-price">₹{item.price.toFixed(2)} each</span>
                          </div>
                        </div>
                        <div className="order-item-total">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="confirmation-card">
              <div className="card-header">
                <h2>
                  <FiMapPin className="header-icon" />
                  Delivery Address
                </h2>
              </div>
              <div className="card-content">
                <div className="address-display">
                  {order.shippingAddress.name && (
                    <div className="address-name">{order.shippingAddress.name}</div>
                  )}
                  <div className="address-line">{order.shippingAddress.address || order.shippingAddress.street}</div>
                  <div className="address-line">
                    {order.shippingAddress.city}
                    {order.shippingAddress.state && `, ${order.shippingAddress.state}`}
                    {' - '}
                    {order.shippingAddress.postalCode || order.shippingAddress.zip}
                  </div>
                  <div className="address-line">{order.shippingAddress.country || 'India'}</div>
                  {order.shippingAddress.phone && (
                    <div className="address-phone">
                      <FiPhone className="phone-icon" />
                      {order.shippingAddress.phone}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column - Order Summary & Help */}
          <div className="confirmation-sidebar">

            {/* Order Summary */}
            <div className="confirmation-card">
              <div className="card-header">
                <h2>Order Summary</h2>
              </div>
              <div className="card-content">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>₹{order.products.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>FREE</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="summary-row coupon-row">
                    <span>Coupon Discount</span>
                    <span>-₹{order.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="summary-divider"></div>
                <div className="summary-row total-row">
                  <span>Total</span>
                  <span>₹{order.totalAmount.toFixed(2)}</span>
                </div>

                {order.paymentDetails?.paymentMethod && (
                  <>
                    <div className="summary-divider"></div>
                    <div className="payment-method-display">
                      <span className="payment-label">Payment Method:</span>
                      <span className="payment-method">{order.paymentDetails.paymentMethod}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Help Card */}
            <div className="help-card">
              <h3>Need Help?</h3>
              <p>Our customer support team is here to help you.</p>
              <div className="help-actions">
                <a href="mailto:support@themsenterprises.com" className="help-link">
                  <FiMail />
                  <span>Email Support</span>
                </a>
                <a href="tel:+919034283036" className="help-link">
                  <FiPhone />
                  <span>Call Us</span>
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* Email Confirmation Notice */}
        <div className="email-notice">
          <div className="notice-icon">
            <FiMail />
          </div>
          <div className="notice-content">
            <p><strong>Confirmation email sent!</strong></p>
            <p>We've sent a detailed order confirmation to <strong>{user?.email}</strong></p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="confirmation-footer">
          <Link to="/products" className="btn btn-primary btn-lg">
            <FiShoppingBag />
            Continue Shopping
          </Link>
          <Link to="/account/orders" className="btn btn-outline btn-lg">
            <FiClock />
            View All Orders
          </Link>
        </div>

      </div>
    </div>
  );
};

export default OrderConfirmationPage;