const express = require('express');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount,
  getSavedForLater,
  saveForLater,
  moveToCart,
  removeFromSaved
} = require('../controllers/cart.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Cart routes
router.get('/', getCart);
router.post('/', addToCart);
router.put('/:itemId', updateCartItem);
router.delete('/:itemId', removeFromCart);
router.delete('/', clearCart);
router.get('/count', getCartCount);

// Saved for later routes
router.get('/saved', getSavedForLater);
router.post('/save-for-later/:itemId', saveForLater);
router.post('/move-to-cart/:itemId', moveToCart);
router.delete('/saved/:itemId', removeFromSaved);

module.exports = router;
