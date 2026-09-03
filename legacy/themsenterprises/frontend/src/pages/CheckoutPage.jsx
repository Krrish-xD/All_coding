import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import httpClient from '../services/httpClient';
import './CheckoutPage.css';

import ConfirmModal from '../components/common/ConfirmModal';
import AddressModal from '../components/Account/AddressModal';
import { indianStates, allCities, citiesByState, cityToStateMap } from '../constants/addressConstants';
import { FiTrash2 } from 'react-icons/fi';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, addAddress, loading: authLoading } = useAuth();
  const { cart, getTotalPrice } = useCart();
  const { settings, loading: settingsLoading } = useSettings();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [addressForm, setAddressForm] = useState({ name: '', phone: '', street: '', city: '', state: '', pinCode: '', country: 'India', isDefault: false });
  const [editingAddress, setEditingAddress] = useState(null); // Checkout page typically only adds, not edits
  const [filteredCities, setFilteredCities] = useState([]);

  const subtotal = getTotalPrice();

  useEffect(() => {
    const cityInput = addressForm.city.toLowerCase();
    if (cityInput === '') {
      setFilteredCities(allCities);
    } else {
      const filtered = allCities.filter(city =>
        city.toLowerCase().includes(cityInput)
      );
      setFilteredCities(filtered);
    }
  }, [addressForm.city]);

  const handleAddressFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setAddressForm(prev => {
      const updated = { ...prev, [name]: newValue };

      if (name === 'state') {
        const stateCities = citiesByState[value] || [];
        setFilteredCities(stateCities);
      } else if (name === 'city') {
        if (cityToStateMap[value]) {
          updated.state = cityToStateMap[value];
          setFilteredCities(citiesByState[cityToStateMap[value]]);
        }
      }

      return updated;
    });
  };

  useEffect(() => {
    const couponFromCart = location.state?.appliedCoupon;
    if (couponFromCart) {
      const validate = async () => {
        try {
          const response = await httpClient.post('/coupons/validate', { code: couponFromCart.code, subtotal });
          if (response.data.success) {
            setAppliedCoupon(response.data.coupon);
          } else {
            setAppliedCoupon(null);
          }
        } catch (err) {
          setAppliedCoupon(null);
        }
      };
      validate();
    }
  }, [location.state, subtotal]);

  useEffect(() => {
    if (user?.addresses) {
      setAddresses(user.addresses);
      const defaultAddress = user.addresses.find(a => a.isDefault);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress._id);
      } else if (user.addresses.length > 0) {
        setSelectedAddressId(user.addresses[0]._id);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?redirect=/checkout');
    if (!settingsLoading && cart.length === 0) navigate('/cart');
  }, [user, authLoading, cart, navigate, settingsLoading]);

  const handleAddShippingAddress = async (e) => {
    e.preventDefault();
    try {
      await addAddress(addressForm);
      setShowAddressForm(false);
      setAddressForm({ name: '', phone: '', street: '', city: '', state: '', pinCode: '', country: 'India', isDefault: false });
    } catch (err) {
      setError(err.message || 'Failed to save address.');
    }
  };

  const handleUpdateAddress = () => {
    // Not supported on checkout page, but AddressModal expects it
    console.log('Address update not supported on Checkout page.');
  };

  const openDeleteModal = (id) => {
    setAddressToDelete(id);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setAddressToDelete(null);
    setDeleteModalOpen(false);
  };

  const handleDeleteAddress = async () => {
    if (!addressToDelete) return;
    try {
      await httpClient.delete(`/auth/addresses/${addressToDelete}`);
      setAddresses(prev => prev.filter(a => a._id !== addressToDelete));
      // If the deleted address was the selected one, reset selection
      if (selectedAddressId === addressToDelete) {
        setSelectedAddressId(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete address.');
    } finally {
      closeDeleteModal();
    }
  };

  const [totals, setTotals] = useState({ subtotal: 0, discount: 0, shipping: 0, tax: 0, roundOff: 0, total: 0 });

  useEffect(() => {
    if (settingsLoading) return;

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
    const shippingCost = isFreeShipping ? 0 : (subtotalAfterDiscount >= (settings.freeShippingThreshold || 9999) ? 0 : (settings.standardShippingCost || 99));
    const taxAmount = (subtotalAfterDiscount + (settings.applyTaxToShipping ? shippingCost : 0)) * ((settings.defaultTaxRate || 0) / 100);
    
    const trueTotal = subtotalAfterDiscount + shippingCost + taxAmount;
    const finalTotal = Math.floor(trueTotal);
    const roundOffAmount = trueTotal - finalTotal;

    setTotals({ subtotal, discount: discountAmount, shipping: shippingCost, tax: taxAmount, roundOff: roundOffAmount, total: finalTotal });

  }, [subtotal, appliedCoupon, settings, settingsLoading]);

  const handleProceedToPayment = async () => {
    if (!selectedAddressId) {
      setError('Please select a shipping address.');
      return;
    }

    const selectedAddress = addresses.find(a => a._id === selectedAddressId);
    if (!selectedAddress) {
      setError('Selected address not found.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const response = await httpClient.post('/orders', {
        products: cart.map(item => ({ product: item.product._id, quantity: item.quantity, customization: item.customization })),
        shippingAddress: { name: selectedAddress.name, phone: selectedAddress.phone, street: selectedAddress.street, city: selectedAddress.city, state: selectedAddress.state, pinCode: selectedAddress.pinCode, country: selectedAddress.country },
        coupon: appliedCoupon ? appliedCoupon.code : null,
        paymentDetails: { status: 'pending', paymentMethod: 'Razorpay' },
      });

      if (response.data.success) {
        navigate(`/payment?order_id=${response.data.order._id}`);
      } else {
        setError(response.data.message || 'Failed to create order.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading || settingsLoading) return <div>Loading...</div>;

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-header"><h1>Checkout</h1></div>
        {error && <div className="error-banner">{error}</div>}
        <div className="checkout-grid">
          <main className="checkout-main">
            <section className="checkout-card">
              <div className="checkout-card-header"><h2>Shipping Address</h2></div>
              <div className="checkout-card-body">
                <div className="address-list">
                  {addresses.map(addr => (
                    <label key={addr._id} className={`address-item ${selectedAddressId === addr._id ? 'selected' : ''}`}>
                      <input type="radio" name="address" value={addr._id} checked={selectedAddressId === addr._id} onChange={(e) => setSelectedAddressId(e.target.value)} />
                      <div className="address-details">
                        <strong>{addr.name}</strong>
                        <p>{addr.street}, {addr.city}, {addr.state} - {addr.pinCode}</p>
                        <p>{addr.phone}</p>
                      </div>
                      <button type="button" onClick={() => openDeleteModal(addr._id)} className="delete-address-btn">
                        <FiTrash2 />
                      </button>
                    </label>
                  ))}
                </div>
                <div className="add-address-btn-container">
                  <button onClick={() => setShowAddressForm(true)} className="add-address-btn">+ Add New Address</button>
                </div>
              </div>
            </section>
            <section className="checkout-card">
              <div className="checkout-card-header"><h2>Payment Method</h2></div>
              <div className="checkout-card-body"><p>Secure online payment will be processed on the next screen.</p></div>
            </section>
          </main>
          <aside className="checkout-sidebar">
            <div className="checkout-card">
              <div className="checkout-card-header"><h2>Order Summary</h2></div>
              <div className="checkout-card-body">
                <div className="price-breakdown">
                  <div className="price-row"><span>Subtotal</span><span>₹{totals.subtotal.toFixed(2)}</span></div>
                  {totals.discount > 0 && <div className="price-row discount-row"><span>Discount</span><span>-₹{totals.discount.toFixed(2)}</span></div>}
                  <div className="price-row"><span>Shipping</span><span>{totals.shipping === 0 ? 'FREE' : `₹${totals.shipping.toFixed(2)}`}</span></div>
                  <div className="price-row"><span>Tax</span><span>₹{totals.tax.toFixed(2)}</span></div>
                  {totals.roundOff > 0 && <div className="price-row discount-row"><span>Round Off</span><span>-₹{totals.roundOff.toFixed(2)}</span></div>}
                  <div className="price-row total"><span>Total</span><span>₹{totals.total.toFixed(2)}</span></div>
                </div>
                <button onClick={handleProceedToPayment} disabled={isProcessing || !selectedAddressId} className="checkout-btn">
                  {isProcessing ? 'Processing...' : `Proceed to Pay ₹${totals.total.toFixed(2)}`}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
      {showAddressForm && (
        <AddressModal
          showForm={showAddressForm}
          setShowForm={setShowAddressForm}
          addressForm={addressForm}
          setAddressForm={setAddressForm}
          editingAddress={editingAddress}
          setEditingAddress={setEditingAddress}
          handleAddAddress={handleAddShippingAddress}
          handleUpdateAddress={handleUpdateAddress}
          filteredCities={filteredCities}
          handleAddressFormChange={handleAddressFormChange}
          indianStates={indianStates}
        />
      )}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteAddress}
        title="Delete Address"
        message="Are you sure you want to delete this address? This action cannot be undone."
      />
    </div>
  );
};

export default CheckoutPage;
