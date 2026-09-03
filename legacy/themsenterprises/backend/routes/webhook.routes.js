const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminAuth.middleware');
const {
  handleRazorpayWebhook,
  getWebhookLogs
} = require('../controllers/webhook.controller');

// @route   POST /api/webhooks/razorpay
// @desc    Handle Razorpay webhook events
// @access  Public (with signature verification)
router.post('/razorpay', handleRazorpayWebhook);

// @route   GET /api/webhooks/logs
// @desc    Get webhook logs (Admin only)
// @access  Private (Admin)
router.get('/logs', adminAuth, getWebhookLogs);

module.exports = router;