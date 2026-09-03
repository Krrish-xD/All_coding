const express = require('express');
const { body } = require('express-validator');
const {
  getDashboardStats,
  getProducts,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  createProduct,
  updateProduct,
  deleteProduct,
  createCoupon,
  getCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  getSettings,
  updateSettings
} = require('../controllers/admin.controller');
const { uploadImages, deleteImages, testS3Config } = require('../controllers/image.controller');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Test route without auth for debugging
router.get('/test-s3', testS3Config);

// Image management routes (temporarily without auth for testing)
router.post('/upload-images', upload.array('images', 10), uploadImages);
router.delete('/delete-images', deleteImages);

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Validation rules
const updateUserValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('isAdmin')
    .optional()
    .isBoolean()
    .withMessage('isAdmin must be a boolean')
];

const createProductValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ max: 100 })
    .withMessage('Product name cannot exceed 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Product description is required')
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('price')
    .isNumeric()
    .withMessage('Price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Price cannot be negative'),
  body('brand')
    .isIn(['MS Enterprises', 'Jaksh'])
    .withMessage('Brand must be either MS Enterprises or Jaksh'),
  body('images')
    .isArray({ min: 1 })
    .withMessage('At least one product image is required'),
  body('group')
    .isIn(['ms', 'jaksh'])
    .withMessage('Group must be either "ms" or "jaksh"'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Product category is required'),
  body('stock')
    .isNumeric()
    .withMessage('Stock must be a number')
    .isInt({ min: 0 })
    .withMessage('Stock cannot be negative'),
  body('sku')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('SKU must be between 3 and 20 characters')
];

const updateProductValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Product name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Product name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Product description cannot be empty')
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('price')
    .optional()
    .isNumeric()
    .withMessage('Price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Price cannot be negative'),
  body('brand')
    .optional()
    .isIn(['MS Enterprises', 'Jaksh'])
    .withMessage('Brand must be either MS Enterprises or Jaksh'),
  body('images')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one product image is required'),
  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Product category cannot be empty'),
  body('stock')
    .optional()
    .isNumeric()
    .withMessage('Stock must be a number')
    .isInt({ min: 0 })
    .withMessage('Stock cannot be negative')
];

const couponValidation = [
  body('code').trim().notEmpty().withMessage('Coupon code is required'),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
  body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be a positive number'),
  body('expiryDate').isISO8601().toDate().withMessage('Invalid expiry date')
];

// Dashboard routes
router.get('/dashboard', getDashboardStats);

// User management routes
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUserValidation, updateUser);
router.delete('/users/:id', deleteUser);

// Product management routes
router.get('/products', getProducts);
router.post('/products', createProductValidation, createProduct);
// product update routes
router.put('/products/:id', upload.none(), updateProductValidation, updateProduct);
router.patch('/products/:id', upload.none(), updateProductValidation, updateProduct);
router.delete('/products/:id', deleteProduct);
router.get('/products', getProducts);

// Coupon management routes
router.post('/coupons', couponValidation, createCoupon);
router.get('/coupons', getCoupons);
router.get('/coupons/:id', getCoupon);
router.put('/coupons/:id', couponValidation, updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

// Settings management routes
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;


