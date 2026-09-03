const express = require('express');
const { body } = require('express-validator');
const {
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
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('username').trim().isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
];

const loginValidation = [
  body('identifier').notEmpty().withMessage('Email or username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const updateProfileValidation = [
  body('username').optional().trim().isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email')
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
];

const addressValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
  body('phone').trim().matches(/^\d{10}$/).withMessage('Phone number must be exactly 10 digits'),
  body('street').trim().notEmpty().withMessage('Street address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('pinCode').trim().matches(/^\d{6}$/).withMessage('Pin code must be exactly 6 digits')
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Google OAuth routes (controller sets session: false)
router.get('/google', googleAuth);
router.get('/google/callback', googleAuthCallback);

// Protected routes
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfileValidation, updateMe);
router.put('/change-password', protect, changePasswordValidation, changePassword);

// Address routes
router.post('/addresses', protect, addressValidation, addAddress);
router.put('/addresses/:id', protect, addressValidation, updateAddress);
router.delete('/addresses/:id', protect, deleteAddress);

// Wishlist routes
router.get('/wishlist', protect, getWishlist);
router.post('/wishlist', protect, [
  body('productId').notEmpty().withMessage('Product ID is required')
], addToWishlist);
router.delete('/wishlist/:productId', protect, removeFromWishlist);

// Stats route
router.get('/stats', protect, getUserStats);

module.exports = router;