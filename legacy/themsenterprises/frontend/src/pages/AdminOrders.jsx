import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import httpClient from '../services/httpClient';
import {
  FiEye, FiPackage, FiX, FiTrash2, FiUser, FiMapPin
} from 'react-icons/fi';
import AdminLayout from '../components/AdminLayout';
import ConfirmModal from '../components/common/ConfirmModal';
import OrderStatusModal from '../components/common/OrderStatusModal';
import '../components/common/ConfirmModal.css';
import './AdminOrders.css';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [orderToUpdate, setOrderToUpdate] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadOrders = async () => {
    try {
      const res = await httpClient.get('/admin2009/orders');
      setOrders(res.data.orders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    let filtered = [...orders];
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.orderStatus === statusFilter);
    }
    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [orders, statusFilter]);

  const viewOrderDetails = async (orderId) => {
    try {
      const res = await httpClient.get(`/admin2009/orders/${orderId}`);
      setSelectedOrder(res.data);
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Failed to load order details:', error);
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    await httpClient.delete(`/admin2009/orders/${orderToDelete}`);
    setOrders(orders.filter(order => order._id !== orderToDelete));
    setShowConfirmModal(false);
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'shipped':
        return 'status-shipped';
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  };

  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <AdminLayout>
      <div className="admin-orders-new">
        <h1 className="page-title">Orders</h1>
        <div className="orders-table-card">
          <div className="table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <button className="order-id-link" onClick={() => viewOrderDetails(order._id)}>
                        ORD-{order._id.slice(-8).toUpperCase()}
                      </button>
                    </td>
                    <td>{order.user?.username || 'N/A'}</td>
                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span 
                        className={`status-pill ${getStatusClass(order.orderStatus)}`}
                        onClick={() => { setOrderToUpdate(order); setShowStatusModal(true); }}
                      >
                        {order.orderStatus}
                      </span>
                    </td>
                    <td>{order.totalAmount.toLocaleString()}</td>
                    <td>
                      <div className="actions-cell-new">
                        <button className="action-btn" onClick={() => viewOrderDetails(order._id)}><FiEye /></button>
                        <button className="action-btn" onClick={() => { setOrderToDelete(order._id); setSelectedOrder(null); setShowConfirmModal(true); }}><FiTrash2 /></button>
                      </div>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="pagination-btn">Previous</button>
          <span>Page {currentPage} of {Math.ceil(filteredOrders.length / pageSize)}</span>
          <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredOrders.length / pageSize), p + 1))} disabled={currentPage >= Math.ceil(filteredOrders.length / pageSize)} className="pagination-btn">Next</button>
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={showConfirmModal}
        onClose={() => { setShowConfirmModal(false); setSelectedOrder(null); }}
        onConfirm={handleDeleteOrder}
        title={selectedOrder ? 'Order Details' : 'Confirm Deletion'}
        message={`Are you sure you want to permanently delete order ORD-${orderToDelete?.slice(-8).toUpperCase()}?`}
        order={selectedOrder}
      />

      <OrderStatusModal
        key={orderToUpdate?._id}
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        order={orderToUpdate}
        onStatusUpdate={() => {
          loadOrders();
          setShowStatusModal(false);
        }}
      />
    </AdminLayout>
  );
};

export default AdminOrders;
