const express = require('express');
const { body } = require('express-validator');
const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  addHelpfulVote,
  removeHelpfulVote,
  getMyReviews,
  getProductReviewStats,
  adminCreateReview
} = require('../controllers/review.controller');
const { protect } = require('../middleware/auth.middleware');
const { adminAuth } = require('../middleware/adminAuth.middleware');

const router = express.Router();

// Public routes
router.get('/product/:productId', getProductReviews);
router.get('/product/:productId/stats', getProductReviewStats);

// Admin route to create reviews
router.post('/admin', adminAuth, adminCreateReview);

// Protected user routes
router.use(protect);
router.post('/', [
  body('product').isMongoId().withMessage('Valid product ID is required'),
  body('rating').isInt({ min:1, max:5 }).withMessage('Rating must be 1-5'),
  body('comment').trim().isLength({ min: 10, max: 1000 }).withMessage('Comment must be 10–1000 chars')
], createReview);
router.get('/me', getMyReviews);
router.put('/:id', [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('comment').trim().isLength({ min:10, max:1000 }).withMessage('Comment must be 10–1000 chars')
], updateReview);
router.delete('/:id', deleteReview);
router.post('/:id/helpful', addHelpfulVote);
router.delete('/:id/helpful', removeHelpfulVote);

module.exports = router;