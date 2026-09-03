const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// @desc    Admin login
// @route   POST /api/admin2009/login
// @access  Public
const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.isAdmin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const payload = {
      id: user._id,
      isAdmin: user.isAdmin,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      token,
      admin: { email: user.email, id: user._id },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Admin logout
// @route   POST /api/admin2009/logout
// @access  Private
const adminLogout = (req, res) => {
  res.json({ message: 'Admin logged out successfully' });
};

// @desc    Get admin profile
// @route   GET /api/admin2009/profile
// @access  Private
const getAdminProfile = (req, res) => {
  res.json({
    admin: {
      email: req.admin.email,
    },
  });
};

module.exports = {
  adminLogin,
  adminLogout,
  getAdminProfile,
};
