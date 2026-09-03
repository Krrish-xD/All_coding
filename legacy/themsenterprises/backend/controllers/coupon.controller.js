const Coupon = require('../models/coupon.model');

exports.validateCoupon = async (req, res) => {
  const { code, subtotal } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: 'Coupon code is required.' });
  }

  try {
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found or is inactive.' });
    }

    if (coupon.expiryDate && coupon.expiryDate < new Date()) {
      return res.status(400).json({ success: false, message: 'Coupon has expired.' });
    }

    if (coupon.minPurchase && subtotal < coupon.minPurchase) {
      return res.status(400).json({ success: false, message: `A minimum purchase of ₹${coupon.minPurchase} is required for this coupon.` });
    }

    res.status(200).json({ success: true, coupon });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error while validating coupon.', error: error.message });
  }
};