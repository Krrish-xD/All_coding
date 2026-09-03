const express = require('express');
const { body } = require('express-validator');
const {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderPayment,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
  getAllOrders,
} = require('../controllers/order.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Validation Rules
const createOrderValidation = [
  body('products').isArray({ min: 1 }),
  body('shippingAddress').notEmpty(),
  body('paymentDetails').notEmpty(),
];
const updateStatusValidation = [
  body('orderStatus').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
];

// === USER ROUTES (Requires login) ===
router.use(protect);

router.post('/', createOrderValidation, createOrder);
router.get('/me', getMyOrders);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);
router.put('/:id', updateOrderPayment); // General purpose update, e.g., for payment


// === ADMIN ROUTES (Requires admin privileges) ===

// Note: The route for getting ALL orders is GET '/'. 
// It's different from the user getting their own order by ID.
router.get('/', authorize('admin'), getAllOrders);
router.get('/stats', authorize('admin'), getOrderStats);
router.put('/:id/status', authorize('admin'), updateStatusValidation, updateOrderStatus);

module.exports = router;