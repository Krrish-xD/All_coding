import React, { useState, useEffect } from 'react';
import httpClient from '../services/httpClient';
import {
  FiSearch,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiEye,
  FiPackage,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiMoreVertical,
  FiX,
  FiImage
} from 'react-icons/fi';
import AdminLayout from '../components/AdminLayout';
import AdminProductForm from './AdminProductForm';
import './AdminProducts.css';

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

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [deletedProduct, setDeletedProduct] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, categoryFilter, groupFilter, stockFilter]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        const imagesToDelete = deletedProduct?.images;
        setShowToast(false);
        setDeletedProduct(null);
        // Delete images from S3 after undo period expires
        if (imagesToDelete && imagesToDelete.length > 0) {
          httpClient.delete('/admin/delete-images', {
            data: { imageUrls: imagesToDelete }
          }).catch(err => console.error('Failed to delete images from S3:', err));
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast, deletedProduct]);

  const loadProducts = async () => {
    try {
      const res = await httpClient.get('/admin2009/products');
      setProducts(res.data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleFormSave = async (formData) => {
    try {
      if (editingProduct) {
        await httpClient.patch(`/admin2009/products/${editingProduct._id}`, formData);
        setProducts(products.map(p => p._id === editingProduct._id ? { ...p, ...formData } : p));
      } else {
        const res = await httpClient.post('/admin2009/products', formData);
        setProducts([...products, res.data]);
      }
      setShowForm(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Failed to save product:', error);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    // Group filter
    if (groupFilter !== 'all') {
      filtered = filtered.filter(product => {
        if (groupFilter === 'ms') return product.brand === 'MS Enterprises';
        if (groupFilter === 'jaksh') return product.brand === 'Jaksh';
        return true;
      });
    }

    // Stock filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter(product => {
        const stock = product.stock || 0;
        if (stockFilter === 'in-stock') return stock > 10;
        if (stockFilter === 'low-stock') return stock <= 10 && stock > 0;
        if (stockFilter === 'out-of-stock') return stock === 0;
        return true;
      });
    }

    setFilteredProducts(filtered);
  };



  const getStockStatus = (stock) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'stock-out', icon: FiAlertCircle };
    if (stock <= 10) return { label: 'Low Stock', color: 'stock-low', icon: FiClock };
    return { label: 'In Stock', color: 'stock-in', icon: FiCheckCircle };
  };

  // Confirmation actions
  const openConfirmation = (action, productId = null) => {
    setConfirmAction(action);
    if (productId) setProductToDelete(productId);
    setShowConfirmModal(true);
  };

  const confirmHandler = async () => {
    if (confirmAction === 'delete' && productToDelete) {
      try {
        await httpClient.delete(`/admin2009/products/${productToDelete}`);
        const deleted = products.find(p => p._id === productToDelete);
        setDeletedProduct(deleted);
        setProducts(products.filter(p => p._id !== productToDelete));
        setShowToast(true);
      } catch (error) {
        console.error('Failed to delete product:', error);
      }
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
    setProductToDelete(null);
  };

  const cancelHandler = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
    setProductToDelete(null);
  };

  const undoDelete = async () => {
    if (deletedProduct) {
      try {
        const res = await httpClient.post('/admin2009/products', deletedProduct);
        setProducts([...products, res.data]);
        setShowToast(false);
        setDeletedProduct(null);
      } catch (error) {
        console.error('Failed to restore product:', error);
      }
    }
  };

  // Calculate summary stats
  const totalProducts = products.length;
  const msProducts = products.filter(p => p.brand === 'MS Enterprises').length;
  const jakshProducts = products.filter(p => p.brand === 'Jaksh').length;
  const lowStockProducts = products.filter(p => p.stock <= 10 && p.stock > 0).length;
  const outOfStockProducts = products.filter(p => p.stock === 0).length;

  // Get unique categories
  // const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  if (loading) {
    return (
      <AdminLayout>
        <div className="products-loading">
          <div className="loading-spinner"></div>
          <p>Loading products...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-products-new">
        {/* Header */}
        <div className="products-header-new">
          {!showForm && (
            <button
              onClick={handleAddNew}
              className="btn btn-primary"
            >
              <FiPlus />
              Add New Product
            </button>
          )}
        </div>

        {showForm ? (
          <AdminProductForm
            editingProduct={editingProduct}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
          />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="summary-cards-grid">
          <div className="summary-card">
            <div className="card-header">
              <h3 className="card-title">Total Products</h3>
            </div>
            <div className="card-body">
              <div className="card-value">{totalProducts}</div>
              <p className="card-subtitle">All products</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-header">
              <h3 className="card-title">MS Enterprises</h3>
            </div>
            <div className="card-body">
              <div className="card-value">{msProducts}</div>
              <p className="card-subtitle">Bulk products</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-header">
              <h3 className="card-title">Jaksh Collection</h3>
            </div>
            <div className="card-body">
              <div className="card-value">{jakshProducts}</div>
              <p className="card-subtitle">Custom products</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-header">
              <h3 className="card-title">Low Stock</h3>
            </div>
            <div className="card-body">
              <div className="card-value text-warning">{lowStockProducts}</div>
              <p className="card-subtitle text-warning">≤ 10 items</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-header">
              <h3 className="card-title">Out of Stock</h3>
            </div>
            <div className="card-body">
              <div className="card-value text-danger">{outOfStockProducts}</div>
              <p className="card-subtitle text-danger">Needs restocking</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-card">
          <div className="filters-header">
            <h3>Filter Products</h3>
          </div>
          <div className="filters-content">
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Removed category and group filters */}

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Stock Levels</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="products-table-card">
          <div className="table-header">
            <h3>Products ({filteredProducts.length})</h3>
            <p>Manage product details, pricing, and inventory</p>
          </div>
          <div className="table-wrapper">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Group</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.stock || 0);
                  const StockIcon = stockStatus.icon;
                  
                  return (
                    <tr key={product._id}>
                      <td>
                        <div className="product-cell">
                          <div className="product-image-thumb">
                            {product.images && product.images.length > 0 ? (
                              <img src={product.images[0]} alt={product.name} />
                            ) : (
                              <div className="no-image-thumb">
                                <FiImage />
                              </div>
                            )}
                          </div>
                          <div className="product-details">
                            <div className="product-name">{product.name}</div>
                            <div className="product-description">
                              {product.description?.substring(0, 50)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {product.category || 'Uncategorized'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: product.brand === 'MS Enterprises' ? '#dc2626' : '#ef4444',
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {product.brand}
                        </span>
                      </td>
                      <td className="price-cell">₹{product.price}</td>
                      <td>
                        <div className="stock-info">
                          <span className="stock-number">{product.stock || 0}</span>
                          <span className="stock-unit">units</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${stockStatus.color}`}>
                          <StockIcon className="status-icon" />
                          {stockStatus.label}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => window.open(`/product/${product._id}`, '_blank')}
                          >
                            <FiEye /> View
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary me-1"
                            onClick={() => handleEdit(product)}
                          >
                            <FiEdit /> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => openConfirmation('delete', product._id)}
                          >
                            <FiTrash2 /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}

        {/* Confirm Modal */}
        <ConfirmModal
          show={showConfirmModal}
          onConfirm={confirmHandler}
          onCancel={cancelHandler}
          message="Are you sure you want to delete this product? This action cannot be undone."
        />

        {/* Undo Toast */}
        {showToast && (
          <div className="undo-toast">
            <div className="toast-content">
              <span>Product deleted</span>
              <button className="undo-btn" onClick={undoDelete}>Undo</button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminProducts;
