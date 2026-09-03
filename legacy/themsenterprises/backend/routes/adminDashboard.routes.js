const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getAllProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getSalesReport,
  getTopProducts,
  getAdminSettings,
  updateAdminSettings,
  deleteOrder, // Added
} = require('../controllers/adminDashboard.controller');
const { adminAuth } = require('../middleware/adminAuth.middleware');

// All routes require admin auth
router.use(adminAuth);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Orders
router.get('/orders', getAllOrders);
router.get('/orders/:id', getOrderById);
router.patch('/orders/:id', updateOrderStatus);
router.delete('/orders/:id', deleteOrder); // Added

// Products
router.get('/products', getAllProducts);
router.post('/products', createProduct);
router.get('/products/:id', getProductById);
router.patch('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Customers
router.get('/customers', getAllCustomers);
router.get('/customers/:id', getCustomerById);
router.patch('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);

// Reports
router.get('/reports/sales', getSalesReport);
router.get('/reports/products', getTopProducts);

// Settings
router.get('/settings', getAdminSettings);
router.patch('/settings', updateAdminSettings);

module.exports = router;
