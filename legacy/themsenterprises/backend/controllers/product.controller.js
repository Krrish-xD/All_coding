const { Product, Review } = require('../models');
const { validationResult } = require('express-validator');

// @desc    Get all products with filtering, sorting, and pagination
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    // Build query
    let query = { isActive: true };

    // Filter by brand
    if (req.query.brand) {
      query.brand = req.query.brand;
    }

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by price range
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
    }

    // Filter by customization options
    if (req.query.allowsImageUpload) {
      query['customizationOptions.allowsImageUpload'] = req.query.allowsImageUpload === 'true';
    }

    // Search functionality
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Build sort options
    let sortOptions = {};
    if (req.query.sortBy) {
      const sortBy = req.query.sortBy;
      const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

      switch (sortBy) {
        case 'price':
          sortOptions.price = sortOrder;
          break;
        case 'name':
          sortOptions.name = sortOrder;
          break;
        case 'createdAt':
          sortOptions.createdAt = sortOrder;
          break;
        case 'rating':
          sortOptions.averageRating = sortOrder;
          break;
        default:
          sortOptions.createdAt = -1;
      }
    } else {
      sortOptions.createdAt = -1;
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    // Increase default limit to show all products when no limit is specified
    const limit = parseInt(req.query.limit, 10) || 1000;
    const startIndex = (page - 1) * limit;

    // Get total count with granular error handling
    let total;
    try {
      total = await Product.countDocuments(query);
    } catch (countError) {
      console.error('CountDocuments error:', {
        message: countError.message,
        stack: countError.stack,
        query
      });
      throw new Error(`Count failed: ${countError.message}`);
    }

    // Execute query without populate first
    let products;
    try {
      products = await Product.find(query).sort(sortOptions).limit(limit).skip(startIndex);
    } catch (findError) {
      console.error('Find error:', {
        message: findError.message,
        stack: findError.stack,
        query,
        sortOptions
      });
      throw new Error(`Find failed: ${findError.message}`);
    }

    // Populate reviews and customizations with granular error handling
    try {
      products = await Product.populate(products, { path: 'reviews', select: 'rating comment createdAt user' });
    } catch (populateError) {
      console.error('Populate reviews error:', {
        message: populateError.message,
        stack: populateError.stack,
        path: 'reviews'
      });
      // Continue without populated reviews if populate fails
      console.warn('Continuing without populated reviews');
    }

    // Populate customizations for products page
    try {
      products = await Product.populate(products, {
        path: 'customizations.optionId',
        model: 'CustomizationOption'
      });
    } catch (populateError) {
      console.error('Populate customizations error:', {
        message: populateError.message,
        stack: populateError.stack,
        path: 'customizations.optionId'
      });
      // Continue without populated customizations if populate fails
      console.warn('Continuing without populated customizations');
    }

    // Add customizationOptions to each product for frontend compatibility
    products = products.map(product => {
      const fullCustomizations = product.customizations.filter(c => c.enabled && c.optionId);
      // Add turnaround time to each customization if needed (optional)
      fullCustomizations.forEach(cust => {
        if (!cust.turnaroundTime) {
          cust.turnaroundTime = '3-5 days';
        }
      });
      return {
        ...product.toObject(),
        customizationOptions: fullCustomizations
      };
    });

    // Pagination result
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalProducts: total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    };

    res.status(200).json({
      success: true,
      count: products.length,
      pagination,
      products
    });
  } catch (error) {
    console.error('Get products error details:', {
      message: error.message,
      stack: error.stack,
      query,
      sortOptions,
      page,
      limit,
      startIndex
    });
    res.status(500).json({
      success: false,
      error: 'Server error getting products'
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({
        path: 'reviews',
        populate: { path: 'user', select: 'username' }
      })
      .populate({
        path: 'customizations.optionId'
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Get product statistics
    const stats = await Review.aggregate([
      { $match: { product: product._id } },
      {
        $group: {
          _id: '$product',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const productStats = stats[0] || { averageRating: 0, totalReviews: 0 };

    // Instead of building a limited customizationOptions object,
    // pass the full customizations array with populated optionId to frontend
    const fullCustomizations = product.customizations.filter(c => c.enabled && c.optionId);

    // Add turnaround time to each customization if needed (optional)
    fullCustomizations.forEach(cust => {
      if (!cust.turnaroundTime) {
        cust.turnaroundTime = '3-5 days';
      }
    });

    const customizationOptions = fullCustomizations;

    res.status(200).json({
      success: true,
      product: {
        ...product.toObject(),
        averageRating: Math.round(productStats.averageRating * 10) / 10,
        totalReviews: productStats.totalReviews,
        customizationOptions
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting product'
    });
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 8;

    const products = await Product.find({ isFeatured: true, isActive: true })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting featured products'
    });
  }
};

// @desc    Get products by brand
// @route   GET /api/products/brand/:brand
// @access  Public
const getProductsByBrand = async (req, res) => {
  try {
    const { brand } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const startIndex = (page - 1) * limit;

    const query = { brand, isActive: true };

    // Additional filters
    if (req.query.category) {
      query.category = req.query.category;
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    const total = await Product.countDocuments(query);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalProducts: total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    };

    res.status(200).json({
      success: true,
      count: products.length,
      pagination,
      products
    });
  } catch (error) {
    console.error('Get products by brand error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting products by brand'
    });
  }
};

// @desc    Get product categories
// @route   GET /api/products/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });

    res.status(200).json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting categories'
    });
  }
};

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
const searchProducts = async (req, res) => {
  try {
    const { q: searchQuery, brand, category, minPrice, maxPrice } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const regex = new RegExp(searchQuery, 'i');

    let baseQuery = { isActive: true };

    // Additional filters
    if (brand) baseQuery.brand = brand;
    if (category) baseQuery.category = category;
    if (minPrice || maxPrice) {
      baseQuery.price = {};
      if (minPrice) baseQuery.price.$gte = Number(minPrice);
      if (maxPrice) baseQuery.price.$lte = Number(maxPrice);
    }

    const searchQueryObj = {
      $or: [
        { name: regex },
        { description: regex },
        { category: regex },
        { brand: regex },
        { tags: regex }
      ],
      ...baseQuery
    };

    const products = await Product.find(searchQueryObj)
      .sort({ name: 1 })
      .limit(20);

    res.status(200).json({
      success: true,
      count: products.length,
      query: searchQuery,
      products
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error searching products'
    });
  }
};

// @desc    Get product statistics
// @route   GET /api/products/stats
// @access  Public
const getProductStats = async (req, res) => {
  try {
    const stats = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          brands: { $addToSet: '$brand' },
          categories: { $addToSet: '$category' }
        }
      }
    ]);

    const brandStats = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$brand',
          count: { $sum: 1 },
          averagePrice: { $avg: '$price' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: stats[0] || {
        totalProducts: 0,
        averagePrice: 0,
        minPrice: 0,
        maxPrice: 0,
        brands: [],
        categories: []
      },
      brandBreakdown: brandStats
    });
  } catch (error) {
    console.error('Get product stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting product statistics'
    });
  }
};

module.exports = {
  getProducts,
  getProduct,
  getFeaturedProducts,
  getProductsByBrand,
  getCategories,
  searchProducts,
  getProductStats
};
