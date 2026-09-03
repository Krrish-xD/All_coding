const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const passport = require('passport');
const { User, Product, Order } = require('../models');

// If the above import doesn't work, use this instead:
// const User = require('../models/user.model');
// const Product = require('../models/product.model');
// const Order = require('../models/order.model');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User with this email or username already exists' });
    }

    const user = await User.create({ username, email: email.toLowerCase(), password });
    const token = generateToken(user._id);

    res.status(201).json({ success: true, message: 'User registered successfully', token, user: user.getPublicProfile() });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Server error during registration' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const { identifier, password } = req.body;
    
    // Check if body is empty
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Email/username and password are required' });
    }

    const user = await User.findByEmailOrUsername(identifier).select('+password');
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const token = generateToken(user._id);
    res.status(200).json({ success: true, message: 'Login successful', token, user: user.getPublicProfile() });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error during login' });
  }
};

// @desc    Google OAuth
// @route   GET /api/auth/google
// @access  Public
const googleAuth = (req, res, next) => {
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })(req, res, next);
};

// @desc    Google OAuth callback
// @route   GET /api/auth/google/callback
// @access  Public
const googleAuthCallback = (req, res, next) => {
  passport.authenticate('google', { 
    session: false 
  }, async (err, user) => {
    if (err || !user) {
      console.error('Google OAuth error:', err);
      const frontendURL = process.env.FRONTEND_URL || 'https://app.themsenterprises.com';
      return res.redirect(`${frontendURL}/login?error=google_auth_failed`);
    }

    try {
      const token = generateToken(user._id);
      const frontendURL = process.env.FRONTEND_URL || 'https://app.themsenterprises.com';
      // Redirect with token
      return res.redirect(`${frontendURL}/auth/google/callback?token=${token}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      const frontendURL = process.env.FRONTEND_URL || 'https://app.themsenterprises.com';
      return res.redirect(`${frontendURL}/login?error=google_auth_failed`);
    }
  })(req, res, next);
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');

    const validWishlist = user.wishlist.filter(p => p !== null && p !== undefined);
    if (user.wishlist.length !== validWishlist.length) {
      user.wishlist = validWishlist.map(p => p._id);
      await user.save();
    }

    res.status(200).json({ success: true, user: user.getPublicProfile() });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, error: 'Server error getting user profile' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
const updateMe = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const { username, email } = req.body;

    if (username || email) {
      const existingUser = await User.findOne({
        $or: [
          username ? { username, _id: { $ne: req.user._id } } : {},
          email ? { email: email.toLowerCase(), _id: { $ne: req.user._id } } : {}
        ].filter(o => Object.keys(o).length > 0)
      });

      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Username or email already taken' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { ...(username && { username }), ...(email && { email: email.toLowerCase() }) },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: 'Profile updated successfully', user: updatedUser.getPublicProfile() });
  } catch (error) {
    console.error('Update me error:', error);
    res.status(500).json({ success: false, error: 'Server error updating profile' });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Server error changing password' });
  }
};

  // @desc    Add address
  // @route   POST /api/auth/addresses
  // @access  Private
  const addAddress = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const addressData = req.body;

      if (addressData.isDefault) {
        await User.updateMany({ _id: req.user._id }, { $set: { 'addresses.$[].isDefault': false } });
      }

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $push: { addresses: addressData } },
        { new: true }
      );

      res.status(201).json({ success: true, message: 'Address added successfully', user: user.getPublicProfile() });
    } catch (error) {
      console.error('Add address error:', error);
      res.status(500).json({ success: false, error: error.message || 'Server error adding address' });
    }
  };

// @desc    Update address
// @route   PUT /api/auth/addresses/:id
// @access  Private
const updateAddress = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const { id } = req.params;
    const addressData = req.body;

    if (addressData.isDefault) {
      await User.updateMany({ _id: req.user._id }, { $set: { 'addresses.$[].isDefault': false } });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.user._id, 'addresses._id': id },
      {
        $set: {
          'addresses.$.name': addressData.name,
          'addresses.$.phone': addressData.phone,
          'addresses.$.street': addressData.street,
          'addresses.$.city': addressData.city,
          'addresses.$.state': addressData.state,
          'addresses.$.pinCode': addressData.pinCode,
          'addresses.$.country': addressData.country,
          'addresses.$.isDefault': addressData.isDefault
        }
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ success: false, error: 'Address not found' });

    res.status(200).json({ success: true, message: 'Address updated successfully', user: user.getPublicProfile() });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ success: false, error: 'Server error updating address' });
  }
};

// @desc    Delete address
// @route   DELETE /api/auth/addresses/:id
// @access  Private
const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { addresses: { _id: id } } },
      { new: true }
    );

    if (!user) return res.status(404).json({ success: false, error: 'Address not found' });

    res.status(200).json({ success: true, message: 'Address deleted successfully', user: user.getPublicProfile() });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ success: false, error: 'Server error deleting address' });
  }
};

// @desc    Add to wishlist
// @route   PUT /api/auth/wishlist
// @access  Private
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      console.error('Product not found for wishlist:', productId);
      return res.status(404).json({ 
        success: false, 
        error: 'Product not found' 
      });
    }

    const user = await User.findById(req.user._id);
    
    // Check if already in wishlist
    const wishlistStr = user.wishlist.map(id => id.toString());
    if (!wishlistStr.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }

    res.status(200).json({ 
      success: true, 
      message: 'Product added to wishlist', 
      user: user.getPublicProfile() 
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Server error adding to wishlist' 
    });
  }
};

// @desc    Remove from wishlist
// @route   DELETE /api/auth/wishlist/:productId
// @access  Private
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { wishlist: productId } },
      { new: true }
    );

    res.status(200).json({ success: true, message: 'Product removed from wishlist', user: user.getPublicProfile() });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ success: false, error: 'Server error removing from wishlist' });
  }
};

// @desc    Get user stats
// @route   GET /api/auth/stats
// @access  Private
const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const orders = await Order.find({ user: userId });
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const deliveredOrders = orders.filter(order => order.orderStatus === 'Delivered').length;

    const user = await User.findById(userId).populate('wishlist');
    const validWishlist = user.wishlist.filter(p => p !== null && p !== undefined);
    const wishlistCount = validWishlist.length;

    if (user.wishlist.length !== validWishlist.length) {
      user.wishlist = validWishlist.map(p => p._id);
      await user.save();
    }

    const recentOrders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('products.product', 'name price images')
      .select('totalAmount orderStatus createdAt');

    res.status(200).json({
      success: true,
      stats: { totalOrders, totalSpent, deliveredOrders, wishlistCount },
      recentOrders
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ success: false, error: 'Server error getting stats' });
  }
};

// @desc    Get populated wishlist
// @route   GET /api/auth/wishlist
// @access  Private
const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      'wishlist',
      'name description price brand images category stock'
    );

    res.status(200).json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ success: false, error: 'Server error getting wishlist' });
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  googleAuthCallback,
  getMe,
  updateMe,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  addToWishlist,
  removeFromWishlist,
  getUserStats,
  getWishlist
};