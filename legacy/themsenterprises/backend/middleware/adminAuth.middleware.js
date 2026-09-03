const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Middleware to authenticate admin
const adminAuth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isAdmin) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.admin = { id: user._id, email: user.email };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = { adminAuth };
