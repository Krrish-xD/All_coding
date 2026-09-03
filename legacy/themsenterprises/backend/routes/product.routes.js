const express = require('express');
const {
  getProducts,
  getProduct,
  getFeaturedProducts,
  getProductsByBrand,
  getCategories,
  searchProducts,
  getProductStats
} = require('../controllers/product.controller');

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/brand/:brand', getProductsByBrand);
router.get('/categories', getCategories);
router.get('/search', searchProducts);
router.get('/stats', getProductStats);
router.get('/:id', getProduct);

module.exports = router;
