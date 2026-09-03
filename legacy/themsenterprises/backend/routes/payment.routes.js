const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth.middleware');
const { adminAuth } = require('../middleware/adminAuth.middleware');

const {
  createPaymentOrder,
  verifyPayment,
  handlePaymentWebhook,
  getPaymentStatus,
  processRefund,
} = require('../controllers/payment.controller');

// Validation rules
const createPaymentOrderValidation = [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .optional()
    .isIn(['INR', 'USD', 'EUR'])
    .withMessage('Invalid currency'),
  body('receipt')
    .optional()
    .isString()
    .withMessage('Receipt must be a string'),
];

const verifyPaymentValidation = [
  body('razorpay_order_id')
    .notEmpty()
    .withMessage('Razorpay order ID is required'),
  body('razorpay_payment_id')
    .notEmpty()
    .withMessage('Razorpay payment ID is required'),
  body('razorpay_signature')
    .notEmpty()
    .withMessage('Razorpay signature is required'),
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required'),
];

const refundPaymentValidation = [
  body('paymentId')
    .notEmpty()
    .withMessage('Payment ID is required'),
  body('amount')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Refund amount must be a positive number'),
];

// Routes

// @route   POST /api/payments/create-order
// @desc    Create a new Razorpay order
// @access  Private
router.post(
  '/create-order',
  protect,
  ...createPaymentOrderValidation,
  createPaymentOrder
);

// @route   GET /api/payments/config
// @desc    Get Razorpay public key
// @access  Public
router.get('/config', async (req, res) => {
  try {
    const { getRazorpayKeyId } = require('../services/paymentService');
    const keyId = await getRazorpayKeyId();
    res.json({ keyId });
  } catch (error) {
    console.error('Error getting Razorpay key:', error);
    res.status(500).json({ error: 'Failed to get payment configuration' });
  }
});

// @route   POST /api/payments/verify
// @desc    Verify payment signature and update order status
// @access  Public (signature verified) - NO PROTECT MIDDLEWARE
router.post(
  '/verify',
  ...verifyPaymentValidation,
  verifyPayment
);

// @route   POST /api/payments/webhook
// @desc    Handle Razorpay webhook for payment events
// @access  Public (webhook)
router.post('/webhook', handlePaymentWebhook);

// @route   GET /api/payments/status/:paymentId
// @desc    Get payment status
// @access  Private
router.get('/status/:paymentId', protect, getPaymentStatus);

// @route   POST /api/payments/refund
// @desc    Refund a payment
// @access  Private (Admin only)
router.post(
  '/refund',
  adminAuth,
  ...refundPaymentValidation,
  processRefund
);

module.exports = router;