const express = require('express');
const router = express.Router();
const {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} = require('../controllers/adminCoupon.controller');
const { adminAuth } = require('../middleware/adminAuth.middleware');

router.route('/').get(adminAuth, getCoupons).post(adminAuth, createCoupon);
router
  .route('/:id')
  .put(adminAuth, updateCoupon)
  .delete(adminAuth, deleteCoupon);

module.exports = router;