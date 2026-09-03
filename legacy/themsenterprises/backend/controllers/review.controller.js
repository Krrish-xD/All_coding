const { Review, Product, Order } = require('../models');
const { validationResult } = require('express-validator');

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;

    const reviews = await Review.find({ product: productId })
      .populate('user', 'username')
      .sort(sortOptions)
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Review.countDocuments({ product: productId });

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalReviews: total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    };

    res.status(200).json({
      success: true,
      count: reviews.length,
      pagination,
      reviews
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting reviews'
    });
  }
};

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { product, rating, comment, pros, cons, images } = req.body;

    // Check if product exists
    const productDoc = await Product.findById(product);
    if (!productDoc) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      user: req.user._id,
      product: product
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: 'You have already reviewed this product'
      });
    }

    // Check if user has purchased this product (for verified reviews)
    const hasPurchased = await Order.exists({
      user: req.user._id,
      'products.product': product,
      orderStatus: 'Delivered'
    });

    // Create review
    const review = await Review.create({
      user: req.user._id,
      product,
      rating,
      comment,
      pros: pros || [],
      cons: cons || [],
      images: images || [],
      isVerified: !!hasPurchased
    });

    // Add review to product
    await Product.findByIdAndUpdate(product, {
      $push: { reviews: review._id }
    });

    // Populate the created review
    const populatedReview = await Review.findById(review._id)
      .populate('user', 'username');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      review: populatedReview
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error creating review'
    });
  }
};

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { rating, comment, pros, cons, images } = req.body;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    // Check if user owns the review
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this review'
      });
    }

    // Update review
    review.rating = rating;
    review.comment = comment;
    review.pros = pros || [];
    review.cons = cons || [];
    review.images = images || [];

    await review.save();

    // Populate the updated review
    const updatedReview = await Review.findById(review._id)
      .populate('user', 'username');

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      review: updatedReview
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error updating review'
    });
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    // Check if user owns the review or is admin
    if (review.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this review'
      });
    }

    // Remove review from product
    await Product.findByIdAndUpdate(review.product, {
      $pull: { reviews: review._id }
    });

    // Delete review
    await Review.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error deleting review'
    });
  }
};

// @desc    Add helpful vote to review
// @route   POST /api/reviews/:id/helpful
// @access  Private
const addHelpfulVote = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    // Check if user already voted
    if (review.helpful.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        error: 'You have already marked this review as helpful'
      });
    }

    // Add vote
    review.helpful.push(req.user._id);
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review marked as helpful',
      helpfulCount: review.helpful.length
    });
  } catch (error) {
    console.error('Add helpful vote error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error adding helpful vote'
    });
  }
};

// @desc    Remove helpful vote from review
// @route   DELETE /api/reviews/:id/helpful
// @access  Private
const removeHelpfulVote = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    // Check if user has voted
    if (!review.helpful.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        error: 'You have not marked this review as helpful'
      });
    }

    // Remove vote
    review.helpful = review.helpful.filter(
      userId => userId.toString() !== req.user._id.toString()
    );
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Helpful vote removed',
      helpfulCount: review.helpful.length
    });
  } catch (error) {
    console.error('Remove helpful vote error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error removing helpful vote'
    });
  }
};

// @desc    Get user's reviews
// @route   GET /api/reviews/me
// @access  Private
const getMyReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const reviews = await Review.find({ user: req.user._id })
      .populate('product', 'name images brand')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    const total = await Review.countDocuments({ user: req.user._id });

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalReviews: total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    };

    res.status(200).json({
      success: true,
      count: reviews.length,
      pagination,
      reviews
    });
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting reviews'
    });
  }
};

// @desc    Get review statistics for a product
// @route   GET /api/reviews/product/:productId/stats
// @access  Public
const getProductReviewStats = async (req, res) => {
  try {
    const { productId } = req.params;

    const stats = await Review.aggregate([
      { $match: { product: require('mongoose').Types.ObjectId(productId) } },
      {
        $group: {
          _id: '$product',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingBreakdown: {
            $push: '$rating'
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.status(200).json({
        success: true,
        stats: {
          averageRating: 0,
          totalReviews: 0,
          ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }
      });
    }

    const stat = stats[0];
    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    stat.ratingBreakdown.forEach(rating => {
      ratingBreakdown[rating]++;
    });

    res.status(200).json({
      success: true,
      stats: {
        averageRating: Math.round(stat.averageRating * 10) / 10,
        totalReviews: stat.totalReviews,
        ratingBreakdown
      }
    });
  } catch (error) {
    console.error('Get product review stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting review statistics'
    });
  }
};

// @desc    Admin create review (creates user if needed)
// @route   POST /api/reviews/admin
// @access  Private/Admin
const User = require('../models/user.model');
// ADMIN: create review (creates user if missing, links to product)
const adminCreateReview = async (req, res) => {
  try {
    const { productId, reviewerName, reviewerEmail, reviewerPassword, rating, comment } = req.body;

    if (!productId || !reviewerEmail || !reviewerPassword || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'productId, reviewerEmail, reviewerPassword, rating, and comment are required' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Find or create user
    let user = await User.findOne({ email: reviewerEmail.toLowerCase() }).select('+password');
    if (!user) {
      user = new User({
        username: reviewerName || reviewerEmail.split('@')[0],
        email: reviewerEmail.toLowerCase(),
        password: reviewerPassword, // hashed by pre-save hook
        isAdmin: false
      });
      await user.save();
    }

    // If the same user already reviewed this product, update it instead of duplicate
    let review = await Review.findOne({ user: user._id, product: product._id });
    if (review) {
      review.rating = rating;
      review.comment = comment;
      await review.save();
    } else {
      review = new Review({
        user: user._id,
        product: product._id,
        rating,
        comment
      });
      await review.save();

      // Link to product
      product.reviews.push(review._id);
      await product.save();
    }

    res.status(201).json({ success: true, review });
  } catch (err) {
    console.error('adminCreateReview error:', err);
    res.status(500).json({ success: false, message: 'Server error creating admin review' });
  }
};

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  addHelpfulVote,
  removeHelpfulVote,
  getMyReviews,
  getProductReviewStats,
  adminCreateReview // <- add this export
};
