const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');

// @route   POST /api/coupons/validate
// @desc    Validate a coupon code
// @access  Public
router.post('/validate', couponController.validateCoupon);

module.exports = router;