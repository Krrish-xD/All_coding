import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { PopupContext } from '../context/PopupContext';
import { CartContext } from '../context/CartContext';
import httpClient from '../services/httpClient';
import AccountPageWrapper from '../components/Account/AccountPageWrapper';
import AccountOverview from '../components/Account/AccountOverview';
import AccountOrders from '../components/Account/AccountOrders';
import AccountWishlist from '../components/Account/AccountWishlist';
import AccountAddresses from '../components/Account/AccountAddresses';
import AddressModal from '../components/Account/AddressModal';
import AccountFAQs from '../components/Account/AccountFAQs';
import AccountSettings from '../components/Account/AccountSettings';
import AccountManagement from '../components/Account/AccountManagement';
import OrderStatusModal from '../components/Account/OrderStatusModal';
import './MyAccountPage.css';
import { indianStates, allCities, citiesByState, cityToStateMap } from '../constants/addressConstants';

const MyAccountPage = () => {
  const location = useLocation();
  const { user, token, logout, addAddress, updateAddress, deleteAddress } = useContext(AuthContext);
  const { showPopup, showConfirm } = useContext(PopupContext);
  const { moveWishlistToCart, addToCart } = useContext(CartContext);

  // #region Data Fetching and Actions
  const getOrders = useCallback(async () => {
    try {
      const response = await httpClient.get('/orders/me');
      return { success: true, orders: response.data.orders };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const getWishlist = useCallback(async () => {
    try {
      const response = await httpClient.get('/auth/wishlist');
      return { success: true, wishlist: response.data.wishlist };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const updateProfile = async (profileData) => {
    try {
      const response = await httpClient.put('/auth/me', profileData);
      return { success: true, user: response.data.user };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to update profile' };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await httpClient.put('/auth/change-password', { currentPassword, newPassword });
      return { success: true, message: response.data.message };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to change password' };
    }
  };



  const removeFromWishlist = async (productId) => {
    try {
      const response = await httpClient.delete(`/auth/wishlist/${productId}`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to remove from wishlist' };
    }
  };
  // #endregion

  const [activeSection, setActiveSection] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (location.state?.section) {
      setActiveSection(location.state.section);
    }
  }, [location.state]);

  // Forms state
  const [profileForm, setProfileForm] = useState({ username: '', email: '', phone: '', profilePic: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [addressForm, setAddressForm] = useState({ name: '', phone: '', street: '', city: '', state: '', pinCode: '', country: 'India', isDefault: false });
  const [editingAddress, setEditingAddress] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filteredCities, setFilteredCities] = useState([]);
  const [orderToTrack, setOrderToTrack] = useState(null);

  // Filter cities based on input - FIXED: removed allCities from dependency array
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
    if (user) {
      setProfileForm({
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        profilePic: user.profilePic || ''
      });
    }
  }, [user]);

  // Wrap loadSectionData in useCallback to prevent unnecessary re-renders
  const loadSectionData = useCallback(async (section) => {
    setLoading(true);
    setError(null);
    try {
      switch (section) {
        case 'orders':
          const ordersResult = await getOrders();
          if (ordersResult.success) {
            setOrders(ordersResult.orders);
          }
          break;
        case 'wishlist':
          const wishlistResult = await getWishlist();
          if (wishlistResult.success) {
            setWishlist(wishlistResult.wishlist);
          }
          break;
        default:
          break;
      }
    } catch (err) {
      setError('Failed to load data');
    }
    setLoading(false);
  }, [getOrders, getWishlist]);

  useEffect(() => {
    loadSectionData(activeSection);
  }, [activeSection, loadSectionData]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const result = await updateProfile(profileForm);
      showPopup(result.error, 'error');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return showPopup('Passwords do not match', 'error');
    }
    const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
    if (result.success) {
      showPopup('Password changed successfully', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      showPopup(result.error, 'error');
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    const result = await addAddress(addressForm);
    if (result.success) {
      showPopup('Address added successfully', 'success');
      setShowForm(false);
      setAddressForm({ name: '', phone: '', street: '', city: '', state: '', pinCode: '', country: 'India', isDefault: false });
    } else {
      showPopup(result.error, 'error');
    }
  };

  const handleUpdateAddress = async (e) => {
    e.preventDefault();
    const result = await updateAddress(editingAddress._id, addressForm);
    if (result.success) {
      showPopup('Address updated successfully', 'success');
      setShowForm(false);
      setEditingAddress(null);
      setAddressForm({ name: '', phone: '', street: '', city: '', state: '', pinCode: '', country: 'India', isDefault: false });
    } else {
      showPopup(result.error, 'error');
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      const result = await deleteAddress(addressId);
      if (result.success) {
        showPopup('Address deleted successfully', 'success');
      } else {
        showPopup(result.error, 'error');
      }
    }
  };

  const handleReorder = async (order) => {
    // Add products to cart
    for (const item of order.products) {
      await addToCart(item.product, item.quantity, item.customization);
    }
    showPopup('Items added to cart', 'success');
  };

  const handleRemoveFromWishlist = async (productId) => {
    const result = await removeFromWishlist(productId);
    if (result.success) {
      setWishlist(wishlist.filter(item => item._id !== productId));
    } else {
      showPopup(result.error, 'error');
    }
  };

  const handleMoveToCart = async (product) => {
    await addToCart(product, 1, {});
    await handleRemoveFromWishlist(product._id);
    showPopup('Product moved to cart', 'success');
  };

  const handleLogout = () => {
    showConfirm('Are you sure you want to logout?', () => {
      logout();
      showPopup('You have been logged out successfully', 'success');
      window.location.href = '/';
    });
  };

  const handleDeleteAccount = () => {
    showConfirm('Are you sure? This action cannot be undone.', () => {
      showPopup('Account deletion not implemented yet', 'info');
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Processing': return '#ffa500';
      case 'Shipped': return '#007bff';
      case 'Delivered': return '#28a745';
      case 'Cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const handleShowTrackModal = (order) => {
    setOrderToTrack(order);
  };

  const renderContent = () => {
    return (
      <>
        {activeSection === 'overview' && <AccountOverview user={user} setActiveSection={setActiveSection} handleLogout={handleLogout} />}
        {activeSection === 'orders' && <AccountOrders orders={orders} loading={loading} error={error} handleReorder={handleReorder} handleShowTrackModal={handleShowTrackModal} />}
        {activeSection === 'wishlist' && <AccountWishlist wishlist={wishlist} loading={loading} error={error} handleRemoveFromWishlist={handleRemoveFromWishlist} handleMoveToCart={handleMoveToCart} />}
        {activeSection === 'addresses' && <AccountAddresses user={user} showForm={showForm} setShowForm={setShowForm} addressForm={addressForm} setAddressForm={setAddressForm} editingAddress={editingAddress} setEditingAddress={setEditingAddress} handleAddAddress={handleAddAddress} handleUpdateAddress={handleUpdateAddress} handleDeleteAddress={handleDeleteAddress} filteredCities={filteredCities} handleAddressFormChange={handleAddressFormChange} allCities={allCities} citiesByState={citiesByState} />}
        {activeSection === 'faqs' && <AccountFAQs />}
        {activeSection === 'settings' && <AccountSettings profileForm={profileForm} setProfileForm={setProfileForm} passwordForm={passwordForm} setPasswordForm={setPasswordForm} handleProfileUpdate={handleProfileUpdate} handlePasswordChange={handlePasswordChange} handleLogout={handleLogout} handleDeleteAccount={handleDeleteAccount} />}
        {activeSection === 'account' && <AccountManagement handleLogout={handleLogout} handleDeleteAccount={handleDeleteAccount} />}
      </>
    );
  };

  return (
    <AccountPageWrapper activeSection={activeSection} setActiveSection={setActiveSection}>
      {renderContent()}
      <AddressModal showForm={showForm} setShowForm={setShowForm} addressForm={addressForm} setAddressForm={setAddressForm} editingAddress={editingAddress} setEditingAddress={setEditingAddress} handleAddAddress={handleAddAddress} handleUpdateAddress={handleUpdateAddress} filteredCities={filteredCities} handleAddressFormChange={handleAddressFormChange} indianStates={indianStates} />
      <OrderStatusModal isOpen={!!orderToTrack} onClose={() => setOrderToTrack(null)} order={orderToTrack} />
    </AccountPageWrapper>
  );
};

export default MyAccountPage;