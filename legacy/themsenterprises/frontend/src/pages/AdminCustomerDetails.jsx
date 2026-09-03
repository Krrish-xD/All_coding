import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import httpClient from '../services/httpClient';
import AdminLayout from '../components/AdminLayout';
import { PopupContext } from '../context/PopupContext';
import './AdminCustomerDetails.css';

const AdminCustomerDetails = () => {
  const { showPopup } = useContext(PopupContext);
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const fetchCustomerDetails = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin2009/customers/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch customer details');
      }

      const data = await response.json();
      setCustomer(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (window.confirm('Are you sure you want to deactivate this customer?')) {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE}/admin2009/customers/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to deactivate customer');
        }

        showPopup('Customer deactivated successfully', 'success');
        // Redirect to customers list
        window.location.href = '/admin2009/customers';
      } catch (err) {
        showPopup(err.message, 'error');
      }
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="loading">Loading customer details...</div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="error">Error: {error}</div>
      </AdminLayout>
    );
  }

  if (!customer) {
    return (
      <AdminLayout>
        <div className="error">Customer not found</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="customer-details">
        <div className="customer-header">
          <div className="customer-info">
            <h1>{customer.username}</h1>
            <p>{customer.email}</p>
          </div>
          <div className="customer-actions">
            <button onClick={handleDeactivate} className="deactivate-btn">
              Deactivate Customer
            </button>
          </div>
        </div>

        <div className="customer-sections">
          {/* Basic Info */}
          <section className="section">
            <h2>Basic Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Username:</label>
                <span>{customer.username}</span>
              </div>
              <div className="info-item">
                <label>Email:</label>
                <span>{customer.email}</span>
              </div>
              <div className="info-item">
                <label>Joined:</label>
                <span>{new Date(customer.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="info-item">
                <label>Admin:</label>
                <span>{customer.isAdmin ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </section>

          {/* Order History */}
          <section className="section">
            <h2>Order History</h2>
            <div className="orders-list">
              {customer.orders && customer.orders.length > 0 ? (
                customer.orders.map((order) => (
                  <div key={order._id} className="order-item">
                    <div className="order-info">
                      <span className="order-id">Order #{order._id.slice(-8)}</span>
                      <span className="order-date">{new Date(order.createdAt).toLocaleDateString()}</span>
                      <span className="order-status">{order.orderStatus}</span>
                      <span className="order-amount">₹{order.totalAmount}</span>
                    </div>
                    <Link to={`/admin2009/orders/${order._id}`} className="view-order-btn">
                      View Details
                    </Link>
                  </div>
                ))
              ) : (
                <p>No orders found</p>
              )}
            </div>
          </section>

          {/* Wishlist */}
          <section className="section">
            <h2>Wishlist</h2>
            <div className="wishlist-grid">
              {customer.wishlist && customer.wishlist.length > 0 ? (
                customer.wishlist.map((product) => (
                  <div key={product._id} className="wishlist-item">
                    {product.images && product.images.length > 0 ? (
                      <img src={product.images[0]} alt={product.name} />
                    ) : (
                      <div className="no-image">No Image</div>
                    )}
                    <div className="wishlist-info">
                      <h3>{product.name}</h3>
                      <p>₹{product.price}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p>No items in wishlist</p>
              )}
            </div>
          </section>

          {/* Addresses */}
          <section className="section">
            <h2>Addresses</h2>
            <div className="addresses-list">
              {customer.addresses && customer.addresses.length > 0 ? (
                customer.addresses.map((address, index) => (
                  <div key={index} className="address-item">
                    <h3>{address.type || 'Address'}</h3>
                    <p>{address.street}</p>
                    <p>{address.city}, {address.state} {address.zipCode}</p>
                    <p>{address.country}</p>
                  </div>
                ))
              ) : (
                <p>No addresses found</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCustomerDetails;
