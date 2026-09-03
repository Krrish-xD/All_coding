const Coupon = require('../models/coupon.model');

// @desc    Get all coupons
// @route   GET /api/admin2009/coupons
// @access  Private/Admin
exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create a coupon
// @route   POST /api/admin2009/coupons
// @access  Private/Admin
exports.createCoupon = async (req, res) => {
  const { code, description, discountType, discountValue, minPurchase, expiryDate, isActive } = req.body;

  try {
    const newCoupon = new Coupon({
      code,
      description,
      discountType,
      discountValue,
      minPurchase,
      expiryDate,
      isActive,
    });

    const coupon = await newCoupon.save();
    res.status(201).json({ success: true, coupon });
  } catch (error) {
    // DEBUG: Log the full error
    console.error('*** ERROR SAVING COUPON TO DB ***:', error);
    if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'Coupon code must be unique.' });
    }
    res.status(400).json({ success: false, message: 'Error creating coupon', error: error.message });
  }
};

// @desc    Update a coupon
// @route   PUT /api/admin2009/coupons/:id
// @access  Private/Admin
exports.updateCoupon = async (req, res) => {
  const { id } = req.params;
  const { code, description, discountType, discountValue, minPurchase, expiryDate, isActive } = req.body;

  try {
    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    coupon.code = code || coupon.code;
    coupon.description = description || coupon.description;
    coupon.discountType = discountType || coupon.discountType;
    coupon.discountValue = discountValue || coupon.discountValue;
    coupon.minPurchase = minPurchase || coupon.minPurchase;
    coupon.expiryDate = expiryDate || coupon.expiryDate;
    coupon.isActive = isActive !== undefined ? isActive : coupon.isActive;

    const updatedCoupon = await coupon.save();
    res.json({ success: true, coupon: updatedCoupon });
  } catch (error) {
    if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'Coupon code must be unique.' });
    }
    res.status(400).json({ success: false, message: 'Error updating coupon', error: error.message });
  }
};

// @desc    Delete a coupon
// @route   DELETE /api/admin2009/coupons/:id
// @access  Private/Admin
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (coupon) {
      await coupon.remove();
      res.json({ success: true, message: 'Coupon removed' });
    } else {
      res.status(404).json({ success: false, message: 'Coupon not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
