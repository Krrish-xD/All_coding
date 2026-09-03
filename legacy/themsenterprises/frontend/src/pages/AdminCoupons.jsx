import React, { useState, useEffect, useContext } from 'react';
import httpClient from '../services/httpClient';
import AdminLayout from '../components/AdminLayout';
import { PopupContext } from '../context/PopupContext';
import { FiPlus, FiEdit, FiTrash2, FiToggleRight, FiToggleLeft } from 'react-icons/fi';
import './AdminCoupons.css';

const AdminCoupons = () => {
  const { showPopup } = useContext(PopupContext);
  const [coupons, setCoupons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minPurchase: '',
    expiryDate: '',
    isActive: true,
  });

  const apiBase = '/admin2009/coupons';

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setIsLoading(true);
      const response = await httpClient.get(apiBase);
      if (response.data.success) {
        setCoupons(response.data.coupons);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch coupons.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openModalForCreate = () => {
    setIsEditing(false);
    setFormData({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minPurchase: '0',
      expiryDate: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openModalForEdit = (coupon) => {
    setIsEditing(true);
    setCurrentCoupon(coupon);
    setFormData({
      ...coupon,
      expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentCoupon(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = { ...formData };
    if (payload.discountType === 'free_shipping') {
      payload.discountValue = 0;
    }

    const url = isEditing ? `${apiBase}/${currentCoupon._id}` : apiBase;
    const method = isEditing ? 'put' : 'post';

    try {
      const response = await httpClient[method](url, payload);
      if (response.data.success) {
        fetchCoupons();
        closeModal();
        showPopup(isEditing ? 'Coupon updated successfully!' : 'Coupon created successfully!', 'success');
      } else {
        showPopup(response.data.message || 'An unexpected error occurred.', 'error');
      }
    } catch (err) {
      showPopup(err.message || 'An error occurred.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this coupon?')) {
      try {
        const response = await httpClient.delete(`${apiBase}/${id}`);
        if (response.data.success) {
          fetchCoupons();
        } else {
          showPopup(response.data.message, 'error');
        }
      } catch (err) {
        showPopup(err.message || 'An error occurred.', 'error');
      }
    }
  };

  return (
    <AdminLayout>
      <div className="admin-coupons-page">
        <div className="admin-page-header">
          <h1>Coupon Management</h1>
          <button className="btn-primary" onClick={openModalForCreate}>
            <FiPlus /> Create Coupon
          </button>
        </div>

        {isLoading && <p>Loading coupons...</p>}
        {error && <p className="error-message">{error}</p>}

        {!isLoading && !error && (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Discount</th>
                  <th>Min Purchase</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon._id}>
                    <td>{coupon.code}</td>
                    <td>{coupon.description}</td>
                    <td>
                      {coupon.discountType === 'percentage' 
                        ? `${coupon.discountValue}%` 
                        : coupon.discountType === 'fixed'
                          ? `₹${coupon.discountValue}`
                          : 'Free Shipping'}
                    </td>
                    <td>₹{coupon.minPurchase}</td>
                    <td>{new Date(coupon.expiryDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge ${coupon.isActive ? 'status-active' : 'status-inactive'}`}>
                        {coupon.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="action-cell">
                      <button className="action-btn" onClick={() => openModalForEdit(coupon)}><FiEdit /></button>
                      <button className="action-btn danger" onClick={() => handleDelete(coupon._id)}><FiTrash2 /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>{isEditing ? 'Edit Coupon' : 'Create Coupon'}</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Code</label>
                  <input type="text" name="code" value={formData.code} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input type="text" name="description" value={formData.description} onChange={handleInputChange} required />
                </div>
                <div className="form-group-row">
                    <div className="form-group">
                        <label>Discount Type</label>
                        <select name="discountType" value={formData.discountType} onChange={handleInputChange}>
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed Amount</option>
                            <option value="free_shipping">Free Shipping</option>
                        </select>
                    </div>
                    {formData.discountType !== 'free_shipping' && (
                      <div className="form-group">
                          <label>Discount Value</label>
                          <input type="number" name="discountValue" value={formData.discountValue} onChange={handleInputChange} required min="0" />
                      </div>
                    )}
                </div>
                <div className="form-group-row">
                    <div className="form-group">
                        <label>Minimum Purchase</label>
                        <input type="number" name="minPurchase" value={formData.minPurchase} onChange={handleInputChange} min="0" />
                    </div>
                    <div className="form-group">
                        <label>Expiry Date</label>
                        <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange} required />
                    </div>
                </div>
                <div className="form-group form-group-toggle">
                  <label>Is Active?</label>
                  <button type="button" onClick={() => setFormData(prev => ({...prev, isActive: !prev.isActive}))} className={`toggle-btn ${formData.isActive ? 'active' : ''}`}>
                    {formData.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                  </button>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-primary">{isEditing ? 'Save Changes' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCoupons;