import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import httpClient from '../services/httpClient';
import {
  FiSearch,
  FiEye,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiShoppingBag,
  FiUser,
  FiUsers,
  FiDollarSign,
  FiStar,
  FiTrendingUp,
  FiUserX,
  FiX
} from 'react-icons/fi';
import AdminLayout from '../components/AdminLayout';
import './AdminCustomers.css';

// ============== CONFIRM MODAL COMPONENT ==============
const ConfirmModal = ({ show, onConfirm, onCancel, message }) => {
  if (!show) return null;
  return (
    <div className="confirm-overlay">
      <div className="confirm-modal">
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-confirm" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [deletedCustomer, setDeletedCustomer] = useState(null);

  const statusConfig = {
    active: { label: 'Active', color: 'status-active' },
    inactive: { label: 'Inactive', color: 'status-inactive' },
    vip: { label: 'VIP', color: 'status-vip' }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, typeFilter, statusFilter]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
        setDeletedCustomer(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const loadCustomers = async () => {
    try {
      const res = await httpClient.get('/admin2009/customers');
      // Enhance customer data with calculated fields
      const enhancedCustomers = res.data.map(customer => ({
        ...customer,
        totalOrders: customer.orders?.length || 0,
        totalSpent: customer.totalSpent || calculateTotalSpent(customer.orders),
        type: determineCustomerType(customer),
        status: determineCustomerStatus(customer),
        lastOrderDate: getLastOrderDate(customer.orders)
      }));
      setCustomers(enhancedCustomers);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalSpent = (orders) => {
    if (!orders || orders.length === 0) return 0;
    return orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  };

  const determineCustomerType = (customer) => {
    // Determine if business or individual based on available data
    // You can adjust this logic based on your actual data structure
    return customer.companyName ? 'business' : 'individual';
  };

  const determineCustomerStatus = (customer) => {
    const totalSpent = customer.totalSpent || 0;
    const orderCount = customer.orders?.length || 0;
    
    // VIP if high spender
    if (totalSpent > 100000 || orderCount > 20) return 'vip';
    
    // Inactive if no recent orders
    const lastOrder = getLastOrderDate(customer.orders);
    if (lastOrder) {
      const daysSinceLastOrder = Math.floor((new Date() - new Date(lastOrder)) / (1000 * 60 * 60 * 24));
      if (daysSinceLastOrder > 90) return 'inactive';
    }
    
    return 'active';
  };

  const getLastOrderDate = (orders) => {
    if (!orders || orders.length === 0) return null;
    const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sortedOrders[0]?.createdAt;
  };

  const filterCustomers = () => {
    let filtered = [...customers];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(customer => 
        customer.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm) ||
        customer.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(customer => customer.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(customer => customer.status === statusFilter);
    }

    setFilteredCustomers(filtered);
  };

  // Confirmation actions
  const openConfirmation = (action, customerId = null) => {
    setConfirmAction(action);
    if (customerId) setCustomerToDelete(customerId);
    setShowConfirmModal(true);
  };

  const confirmHandler = async () => {
    if (confirmAction === 'delete' && customerToDelete) {
      try {
        await httpClient.delete(`/admin2009/customers/${customerToDelete}`);
        const deleted = customers.find(c => c._id === customerToDelete);
        setDeletedCustomer(deleted);
        setCustomers(customers.filter(c => c._id !== customerToDelete));
        setShowToast(true);
      } catch (error) {
        console.error('Failed to delete customer:', error);
      }
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
    setCustomerToDelete(null);
  };

  const cancelHandler = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
    setCustomerToDelete(null);
  };

  const undoDelete = () => {
    if (deletedCustomer) {
      setCustomers([...customers, deletedCustomer]);
      setShowToast(false);
      setDeletedCustomer(null);
    }
  };

  const handleDelete = async (customerId) => {
    openConfirmation('delete', customerId);
  };

  const viewCustomerDetails = async (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(true);
  };

  const sendEmail = (email) => {
    window.location.href = `mailto:${email}`;
  };

  const callPhone = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Calculate summary stats
  const totalCustomers = customers.length;
  const businessCustomers = customers.filter(c => c.type === 'business').length;
  const individualCustomers = customers.filter(c => c.type === 'individual').length;
  const vipCustomers = customers.filter(c => c.status === 'vip').length;
  const totalRevenue = customers.reduce((sum, customer) => sum + (customer.totalSpent || 0), 0);

  if (loading) {
    return (
      <AdminLayout>
        <div className="customers-loading">
          <div className="loading-spinner"></div>
          <p>Loading customers...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-customers-new">
        {/* Header */}
        <div className="customers-header">
          <div className="header-content">
            <h1 className="page-title">Customers Management</h1>
            <p className="page-subtitle">Manage customer relationships and track purchase history</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards-grid">
          <div className="summary-card">
            <div className="card-header">
              <h3 className="card-title">Total Customers</h3>
            </div>
            <div className="card-body">
              <div className="card-value">{totalCustomers}</div>
              <p className="card-change positive">+8% this month</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-header">
              <h3 className="card-title">Business</h3>
            </div>
            <div className="card-body">
              <div className="card-value">{businessCustomers}</div>
              <p className="card-subtitle">Corporate clients</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-header">
              <h3 className="card-title">Individual</h3>
            </div>
            <div className="card-body">
              <div className="card-value">{individualCustomers}</div>
              <p className="card-subtitle">Personal customers</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-header">
              <h3 className="card-title">VIP Customers</h3>
            </div>
            <div className="card-body">
              <div className="card-value text-purple">{vipCustomers}</div>
              <p className="card-subtitle text-purple">High value</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-header">
              <h3 className="card-title">Total Revenue</h3>
            </div>
            <div className="card-body">
              <div className="card-value">
                ₹{totalRevenue >= 100000 
                  ? `${(totalRevenue / 100000).toFixed(1)}L` 
                  : totalRevenue.toLocaleString()}
              </div>
              <p className="card-change positive">From all customers</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-card">
          <div className="filters-header">
            <h3>Filter Customers</h3>
          </div>
          <div className="filters-content">
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search customers by name, email, phone, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="business">Business</option>
              <option value="individual">Individual</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="vip">VIP</option>
            </select>
          </div>
        </div>

        {/* Customers Table */}
        <div className="customers-table-card">
          <div className="table-header">
            <h3>Customers ({filteredCustomers.length})</h3>
            <p>View and manage customer information and purchase history</p>
          </div>
          <div className="table-wrapper">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Last Order</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer._id}>
                    <td>
                      <div className="customer-cell">
                        <div className="customer-avatar">
                          <span>{getInitials(customer.username)}</span>
                        </div>
                        <div className="customer-details">
                          <div className="customer-name">{customer.username || 'Unknown'}</div>
                          <div className="customer-email">{customer.email}</div>
                          {customer.companyName && (
                            <div className="customer-company">{customer.companyName}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`type-badge ${customer.type === 'business' ? 'type-business' : 'type-individual'}`}>
                        {customer.type === 'business' ? 'Business' : 'Individual'}
                      </span>
                    </td>
                    <td>
                      <div className="location-cell">
                        <FiMapPin className="location-icon" />
                        {customer.city || 'Not specified'}
                      </div>
                    </td>
                    <td>
                      <div className="orders-cell">
                        <FiShoppingBag className="orders-icon" />
                        <span className="orders-count">{customer.totalOrders}</span>
                      </div>
                    </td>
                    <td className="amount-cell">
                      ₹{(customer.totalSpent || 0).toLocaleString()}
                    </td>
                    <td>
                      <div className="date-cell">
                        {customer.lastOrderDate 
                          ? new Date(customer.lastOrderDate).toLocaleDateString()
                          : 'No orders yet'}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${statusConfig[customer.status]?.color || 'status-active'}`}>
                        {statusConfig[customer.status]?.label || 'Active'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="action-btn"
                          onClick={() => viewCustomerDetails(customer)}
                          title="View Details"
                        >
                          <FiEye />
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => sendEmail(customer.email)}
                          title="Send Email"
                        >
                          <FiMail />
                        </button>
                        {customer.phone && (
                          <button
                            className="action-btn"
                            onClick={() => callPhone(customer.phone)}
                            title="Call"
                          >
                            <FiPhone />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Details Modal */}
        {showCustomerModal && selectedCustomer && (
          <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Customer Details</h2>
                <button 
                  className="modal-close"
                  onClick={() => setShowCustomerModal(false)}
                >
                  <FiX />
                </button>
              </div>

              <div className="modal-body">
                {/* Customer Profile */}
                <div className="customer-profile">
                  <div className="profile-avatar">
                    <span>{getInitials(selectedCustomer.username)}</span>
                  </div>
                  <div className="profile-info">
                    <h3>{selectedCustomer.username}</h3>
                    <p>{selectedCustomer.email}</p>
                    {selectedCustomer.phone && <p>{selectedCustomer.phone}</p>}
                    {selectedCustomer.companyName && <p>{selectedCustomer.companyName}</p>}
                  </div>
                </div>

                <div className="detail-grid">
                  {/* Account Information */}
                  <div className="detail-section">
                    <h3>Account Information</h3>
                    <div className="detail-row">
                      <span className="detail-label">Customer ID:</span>
                      <span className="detail-value">{selectedCustomer._id}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Type:</span>
                      <span className="detail-value">{selectedCustomer.type}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Status:</span>
                      <span className={`status-badge ${statusConfig[selectedCustomer.status]?.color}`}>
                        {statusConfig[selectedCustomer.status]?.label}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Joined:</span>
                      <span className="detail-value">
                        {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Purchase Summary */}
                  <div className="detail-section">
                    <h3>Purchase Summary</h3>
                    <div className="detail-row">
                      <span className="detail-label">Total Orders:</span>
                      <span className="detail-value">{selectedCustomer.totalOrders}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Total Spent:</span>
                      <span className="detail-value">
                        ₹{(selectedCustomer.totalSpent || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Wishlist Items:</span>
                      <span className="detail-value">{selectedCustomer.wishlist?.length || 0}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Last Order:</span>
                      <span className="detail-value">
                        {selectedCustomer.lastOrderDate 
                          ? new Date(selectedCustomer.lastOrderDate).toLocaleDateString()
                          : 'No orders yet'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Orders */}
                {selectedCustomer.orders && selectedCustomer.orders.length > 0 && (
                  <div className="recent-orders-section">
                    <h3>Recent Orders</h3>
                    <div className="orders-list">
                      {selectedCustomer.orders.slice(0, 5).map((order, index) => (
                        <div key={index} className="order-item">
                          <div className="order-info">
                            <span className="order-id">Order #{order._id?.slice(-8)}</span>
                            <span className="order-date">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="order-amount">
                            ₹{order.totalAmount?.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      openConfirmation('delete', selectedCustomer._id);
                      setShowCustomerModal(false);
                    }}
                  >
                    <FiUserX />
                    Delete Customer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        show={showConfirmModal}
        onConfirm={confirmHandler}
        onCancel={cancelHandler}
        message="Are you sure you want to delete this customer? This action cannot be undone."
      />

      {/* Undo Toast */}
      {showToast && deletedCustomer && (
        <div className="undo-toast">
          <div className="toast-content">
            <span>Customer "{deletedCustomer.username}" deleted</span>
            <button className="undo-btn" onClick={undoDelete}>Undo</button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCustomers;