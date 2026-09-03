import { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { PopupContext } from '../context/PopupContext';
import { AuthContext } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext'; // Import useSettings
import { useMediaQuery } from '../hooks/useMediaQuery'; // Import useMediaQuery
import ReactConfetti from 'react-confetti';
import { 
  FiShoppingBag, 
  FiTrash2, 
  FiPlus, 
  FiMinus, 
  FiArrowLeft,
  FiShoppingCart,
  FiAlertTriangle,
  FiPhone,
  FiTag,
  FiX
} from 'react-icons/fi';
import Spinner from '../components/common/Spinner';import './CartPage.css';

const CartPage = () => {
  const { showPopup } = useContext(PopupContext);
  const { user } = useContext(AuthContext);
  const { settings, loading: settingsLoading } = useSettings(); // Use settings context
  const {
    cart,
    updateQuantity,
    removeFromCart,
    getTotalPrice,
    getTotalItems,
    clearCart,
    calculateItemPrice,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    setCart, // Added
  } = useCart();

  const [promoCode, setPromoCode] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState(0);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const isMobile = useMediaQuery('(max-width: 480px)');

  const drawShape = (ctx) => {
    const rand = Math.random();
    ctx.beginPath();
    if (rand < 0.33) { // Draw a rectangle
      ctx.rect(-8, -8, 16, 16);
    } else if (rand < 0.66) { // Draw a circle
      ctx.arc(0, 0, 8, 0, 2 * Math.PI);
    } else { // Draw a pentagon
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * 12, -Math.sin((18 + i * 72) * Math.PI / 180) * 12);
      }
    }
    ctx.closePath();
    ctx.fill();
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // State for calculated totals
  const [totals, setTotals] = useState({
    subtotal: 0,
    discount: 0,
    shipping: 0,
    tax: 0,
    roundOff: 0,
    total: 0,
  });

  const subtotal = getTotalPrice();

  const amountToFreeDelivery = useMemo(() => {
    if (settingsLoading || !settings || settings.freeShippingThreshold === 0) return 0;
    const remaining = settings.freeShippingThreshold - subtotal;
    return remaining > 0 ? remaining : 0;
  }, [settingsLoading, settings, subtotal]);

  useEffect(() => {
    // Set initial promo code if a coupon is already applied
    if (appliedCoupon) {
      setPromoCode(appliedCoupon.code);
    }
  }, [appliedCoupon]);

  useEffect(() => {
    if (!settingsLoading && settings) {
      let discountAmount = 0;
      let isFreeShipping = false;

      if (appliedCoupon) {
        if (appliedCoupon.discountType === 'percentage') {
          discountAmount = subtotal * (appliedCoupon.discountValue / 100);
        } else if (appliedCoupon.discountType === 'fixed') {
          discountAmount = Math.min(appliedCoupon.discountValue, subtotal);
        } else if (appliedCoupon.discountType === 'free_shipping') {
          isFreeShipping = true;
        }
      }

      const subtotalAfterDiscount = subtotal - discountAmount;

      const shippingThreshold = settings.freeShippingThreshold || 999999;
      const standardShipping = settings.standardShippingCost || 99;
      const shippingCost = isFreeShipping ? 0 : (subtotalAfterDiscount >= shippingThreshold ? 0 : standardShipping);

      const applyTaxToShipping = settings.applyTaxToShipping || false;
      const taxRate = settings.defaultTaxRate || 0;
      const taxBase = applyTaxToShipping 
        ? subtotalAfterDiscount + shippingCost 
        : subtotalAfterDiscount;
      const taxAmount = taxBase * (taxRate / 100);

      const trueTotal = subtotalAfterDiscount + shippingCost + taxAmount;
      const finalTotal = Math.floor(trueTotal);
      const roundOffAmount = trueTotal - finalTotal;

      setTotals({
        subtotal,
        discount: discountAmount,
        shipping: shippingCost,
        tax: taxAmount,
        roundOff: roundOffAmount,
        total: finalTotal,
      });
    }
  }, [subtotal, appliedCoupon, settings, settingsLoading]);

  // Check for bulk orders
  const hasHighQuantityItem = cart.some(item => item.quantity >= 50);
  const totalItemsInCart = getTotalItems();
  const shouldShowBulkNotification = hasHighQuantityItem || totalItemsInCart >= 50;

  const debounceTimers = useRef({});

  const handleQuantityChange = (productId, customization, newQuantity) => {
    // 1. Update UI instantly
    const updatedCart = cart.map(item => 
      item.product._id === productId && JSON.stringify(item.customization || {}) === JSON.stringify(customization || {})
        ? { ...item, quantity: Math.max(1, newQuantity) } 
        : item
    );
    setCart(updatedCart.filter(item => item.quantity > 0)); // Also filter out items if quantity becomes 0

    // 2. Debounce backend update
    const itemKey = `${productId}-${JSON.stringify(customization || {})}`;

    // Clear previous timer for this specific item
    if (debounceTimers.current[itemKey]) {
      clearTimeout(debounceTimers.current[itemKey]);
    }

    // Set a new timer
    debounceTimers.current[itemKey] = setTimeout(() => {
      if (newQuantity <= 0) {
        removeFromCart(productId, customization); // This function already calls the backend
      } else {
        updateQuantity(productId, customization, newQuantity); // This function calls the backend
      }
    }, 4000);
  };

  const handleRemoveItem = async (productId, customization) => {
    await removeFromCart(productId, customization);
  };

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) return;
    const result = await applyCoupon(promoCode, subtotal);
    if (result.success) {
      setShowConfetti(true);
      setConfettiPieces(1000);
      setTimeout(() => setConfettiPieces(0), 2000); // Stop generating new pieces after 2 seconds
      setTimeout(() => setShowConfetti(false), 7000); // Stop the component after 7 seconds
    } else {
      showPopup(result.message, result.success ? 'success' : 'error');
    }
  };

  if (settingsLoading) {
    return (
        <div class="cart-page-gradient">
            <div class="cart-container">
                <div class="cart-loading">
                    <Spinner />
                    <p>Loading cart...</p>
                </div>
            </div>
        </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="cart-page-gradient">
        <div className="cart-container">
          <div className="cart-empty">
            <div className="empty-cart-icon-wrapper">
              <FiShoppingBag className="empty-cart-icon" />
            </div>
            <h2>Your cart is empty</h2>
            <p>Looks like you haven't added any items to your cart yet.</p>
            <div className="empty-cart-actions">
              <Link to="/products" className="btn btn-primary">
                Browse All Products
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

  return (
    <div className="cart-page-gradient">
      {showConfetti && (
        <div className="confetti">
          <ReactConfetti
            key="left-cannon"
            width={windowSize.width}
            height={windowSize.height}
            run={showConfetti}
            recycle={false}
            numberOfPieces={confettiPieces}
            colors={['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722']}
            confettiSource={{ x: 0, y: windowSize.height / 2 - 200, w: 0, h: 400 }}
            initialVelocityX={30}
            initialVelocityY={{ min: -30, max: -10 }}
            drawShape={drawShape}
            gravity={0.4}
          />
          <ReactConfetti
            key="right-cannon"
            width={windowSize.width}
            height={windowSize.height}
            run={showConfetti}
            recycle={false}
            numberOfPieces={confettiPieces}
            colors={['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722']}
            confettiSource={{ x: windowSize.width, y: windowSize.height / 2 - 200, w: 0, h: 400 }}
            initialVelocityX={-30}
            initialVelocityY={{ min: -30, max: -10 }}
            drawShape={drawShape}
            gravity={0.4}
          />
        </div>
      )}
      <div className="cart-container">
        {/* Header */}
        <div className="cart-header-new">
          <div className="cart-title-section">
            <div class="cart-title-container">
              <FiShoppingCart className="cart-title-icon" />
              <h1>Your Cart</h1>
            </div>
          </div>
        </div>

        {/* Bulk Order Notification */}
        {shouldShowBulkNotification && (
          <div className="bulk-alert">
            <FiAlertTriangle className="alert-icon" />
            <div className="alert-content">
              <div>
                <strong>Bulk Order:</strong> For high quantity orders, we recommend contacting our sales team for better pricing and personalised service.
              </div>
              <button 
                className="btn btn-outline-amber"
                onClick={() => {
                  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }}
              >
                <FiPhone className="icon-sm" />
                Contact Sales
              </button>
            </div>
          </div>
        )}

        <div className="cart-content-grid">
          {/* Cart Items */}
          <div className="cart-items-section">
            {cart.map((item, index) => {
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
                <div key={`${item.product._id}-${index}`} className="cart-item-card">
                  <div className="cart-item-content">
                    {isMobile ? (
                      // Mobile Layout
                      <>
                        <div className="mobile-card-header">
                          <Link to={`/product/${item.product._id}`} className="item-image-link">
                            <img src={item.product.images?.[0] || '/logo.png'} alt={item.product.name} />
                          </Link>
                          <div className="item-details-new">
                            <div className="item-info-col">
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                  <Link to={`/product/${item.product._id}`} className="item-name">
                                    {item.product.name}
                                  </Link>
                                  <div className="item-meta">
                                    <span className="item-brand-badge">{item.product.brand}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveItem(item.product._id, item.customization)}
                                  className="btn btn-ghost-danger"
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        {hasVisibleCustomizations && (
                          <div className="item-customization-new">
                            {Object.entries(item.customization).map(([key, value]) => {
                              if (key === 'dynamicCustomizations') {
                                return Object.entries(value).map(([id, obj]) => (
                                  <div key={id} className="customization-item">
                                    <span className="customization-key">{obj.name}:</span>
                                    <span className="customization-value">
                                      {obj.value?.url ? (
                                        <img src={obj.value.url} alt={obj.value.name || 'Uploaded image'} style={{maxWidth: '100px', maxHeight: '100px'}} />
                                      ) : Array.isArray(obj.value) ? obj.value.join(', ') : obj.value?.toString()}
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
                        <div className="item-footer-mobile">
                          <div className="quantity-controls-new">
                            <button onClick={() => handleQuantityChange(item.product._id, item.customization, item.quantity - 1)} className="icon-btn btn-quantity-style" disabled={item.quantity <= 1}><FiMinus /></button>
                            <input type="number" value={item.quantity} onChange={(e) => handleQuantityChange(item.product._id, item.customization, parseInt(e.target.value) || 1)} min="1" className="quantity-input" />
                            <button onClick={() => handleQuantityChange(item.product._id, item.customization, item.quantity + 1)} className="icon-btn btn-quantity-style"><FiPlus /></button>
                          </div>
                          <div className="item-price-section">
                            <div className="item-total-price">₹{(calculateItemPrice(item.product, item.customization) * item.quantity).toFixed(2)}</div>
                            <div className="item-unit-price">₹{calculateItemPrice(item.product, item.customization).toFixed(2)} each</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      // Desktop/Tablet Layout
                      <>
                        <Link to={`/product/${item.product._id}`} className="item-image-link">
                          <img src={item.product.images?.[0] || '/logo.png'} alt={item.product.name} />
                        </Link>
                        <div className="item-details-new">
                          <div className="item-info-col">
                            <div>
                              <Link to={`/product/${item.product._id}`} className="item-name">
                                {item.product.name}
                              </Link>
                              <div className="item-meta">
                                <span className="item-brand-badge">{item.product.brand}</span>
                                <span className="item-category">{item.product.category || 'General'}</span>
                              </div>
                              {hasVisibleCustomizations && (
                                <div className="item-customization-new">
                                  {Object.entries(item.customization).map(([key, value]) => {
                                    if (key === 'dynamicCustomizations') {
                                      return Object.entries(value).map(([id, obj]) => (
                                        <div key={id} className="customization-item">
                                          <span className="customization-key">{obj.name}:</span>
                                          <span className="customization-value">
                                            {obj.value?.url ? (
                                              <img src={obj.value.url} alt={obj.value.name || 'Uploaded image'} style={{maxWidth: '100px', maxHeight: '100px'}} />
                                            ) : Array.isArray(obj.value) ? obj.value.join(', ') : obj.value?.toString()}
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
                            </div>
                          </div>
                          <div className="item-actions-col">
                            <button
                              onClick={() => handleRemoveItem(item.product._id, item.customization)}
                              className="btn btn-ghost-danger"
                            >
                              <FiTrash2 />
                            </button>
                            <div className="item-actions-row">
                              <div className="quantity-controls-new">
                              <button onClick={() => handleQuantityChange(item.product._id, item.customization, item.quantity - 1)} className="icon-btn btn-quantity-style" disabled={item.quantity <= 1}><FiMinus /></button>
                              <input type="number" value={item.quantity} onChange={(e) => handleQuantityChange(item.product._id, item.customization, parseInt(e.target.value) || 1)} min="1" className="quantity-input" />
                              <button onClick={() => handleQuantityChange(item.product._id, item.customization, item.quantity + 1)} className="icon-btn btn-quantity-style"><FiPlus /></button>
                            </div>
                              <div className="item-price-section">
                                <div className="item-total-price">₹{(calculateItemPrice(item.product, item.customization) * item.quantity).toFixed(2)}</div>
                                <div className="item-unit-price">₹{calculateItemPrice(item.product, item.customization).toFixed(2)} each</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })} 
          </div>

          {/* Order Summary */}
          <div className="order-summary-section">
            <div className="summary-card-new">
              <div className="summary-header">
                <h3>Order Summary</h3>
              </div>
              <div className="summary-content">
                {/* Promo Code */}
                <div className="promo-section">
                  <label className="promo-label">Promo Code</label>
                  {appliedCoupon ? (
                    <div className="coupon-applied-badge">
                      <FiTag />
                      <span>
                        <b>{appliedCoupon.code}</b> applied: 
                        {appliedCoupon.discountType === 'percentage' && ` ${appliedCoupon.discountValue}% off`}
                        {appliedCoupon.discountType === 'fixed' && ` ₹${appliedCoupon.discountValue} off`}
                        {appliedCoupon.discountType === 'free_shipping' && ` Free Shipping`}
                      </span>
                      <button onClick={removeCoupon} className="remove-coupon-btn"><FiX /></button>
                    </div>
                  ) : (
                    <div className="promo-input-group">
                      <input
                        type="text"
                        placeholder="Enter code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="promo-input"
                      />
                      <button 
                        className="btn btn-outline"
                        onClick={handleApplyPromoCode}
                        disabled={!promoCode.trim()}
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>

                {/* Free Shipping Progress */}
                {amountToFreeDelivery > 0 && (
                  <div className="free-shipping-progress">
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill"
                        style={{ width: `${(subtotal / settings.freeShippingThreshold) * 100}%` }}
                      ></div>
                    </div>
                    <p className="progress-text">
                      Add ₹{amountToFreeDelivery.toLocaleString()} more to get FREE Delivery!
                    </p>
                  </div>
                )}

                <div className="summary-divider" />

                {/* Price Breakdown */}
                <div className="price-breakdown">
                  <div className="price-row">
                    <span>Subtotal</span>
                    <span>₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.discount > 0 && (
                    <div className="price-row discount-row">
                      <span>Discount</span>
                      <span>-₹{totals.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="price-row">
                    <span>Shipping</span>
                    <span>{totals.shipping === 0 ? 'Free' : `₹${totals.shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="price-row">
                    <span>Tax ({(settings?.defaultTaxRate || 0)}%)</span>
                    <span>₹{totals.tax.toFixed(2)}</span>
                  </div>
                  {totals.roundOff > 0 && (
                    <div className="price-row discount-row">
                      <span>Round Off</span>
                      <span>-₹{totals.roundOff.toFixed(2)}</span>
                    </div>
                  )}
                  {totals.shipping === 0 && (
                    <div className="free-shipping-note">
                      Free shipping on orders over ₹{(settings?.freeShippingThreshold || 0).toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="summary-divider" />

                <div className="price-row price-total">
                  <span>Total</span>
                  <span>₹{totals.total.toFixed(2)}</span>
                </div>

                {user ? (
                  <Link 
                    to="/checkout" 
                    state={{ appliedCoupon }}
                    className="btn btn-primary btn-lg btn-block"
                  >
                    Proceed to Checkout
                  </Link>
                ) : (
                  <Link to="/login" className="btn btn-primary btn-lg btn-block">
                    Login to Checkout
                  </Link>
                )}

                <div className="security-note">Secure checkout</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
