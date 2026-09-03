const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    minlength: [10, 'Comment must be at least 10 characters long']
  },
  isVerified: {
    type: Boolean,
    default: false // Only verified if user actually purchased the product
  },
  helpful: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  images: [{
    type: String // URLs to review images
  }],
  pros: [{
    type: String,
    trim: true,
    maxlength: [100, 'Each pro cannot exceed 100 characters']
  }],
  cons: [{
    type: String,
    trim: true,
    maxlength: [100, 'Each con cannot exceed 100 characters']
  }]
}, {
  timestamps: true
});

// Compound index to ensure one review per user per product
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

// Indexes for better query performance
reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ isVerified: 1 });
reviewSchema.index({ createdAt: -1 });

// Instance method to check if user can review
reviewSchema.methods.canUserReview = function(userId) {
  return this.user.toString() === userId.toString();
};

// Instance method to add helpful vote
reviewSchema.methods.addHelpfulVote = function(userId) {
  if (!this.helpful.includes(userId)) {
    this.helpful.push(userId);
    return true;
  }
  return false;
};

// Instance method to remove helpful vote
reviewSchema.methods.removeHelpfulVote = function(userId) {
  const index = this.helpful.indexOf(userId);
  if (index > -1) {
    this.helpful.splice(index, 1);
    return true;
  }
  return false;
};

// Static method to find reviews by product
reviewSchema.statics.findByProduct = function(productId, options = {}) {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  return this.find({ product: productId })
    .populate('user', 'username')
    .sort(sortOptions)
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

// Static method to find reviews by user
reviewSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId })
    .populate('product', 'name images brand')
    .sort({ createdAt: -1 });
};

// Static method to get review statistics for a product
reviewSchema.statics.getProductReviewStats = async function(productId) {
  const stats = await this.aggregate([
    { $match: { product: mongoose.Types.ObjectId(productId) } },
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
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  const stat = stats[0];
  const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  stat.ratingBreakdown.forEach(rating => {
    ratingBreakdown[rating]++;
  });

  return {
    averageRating: Math.round(stat.averageRating * 10) / 10,
    totalReviews: stat.totalReviews,
    ratingBreakdown
  };
};

// Static method to get verified reviews only
reviewSchema.statics.findVerifiedReviews = function(productId, options = {}) {
  const query = { product: productId, isVerified: true };
  return this.find(query, null, options)
    .populate('user', 'username')
    .sort({ createdAt: -1 });
};

// Pre-save middleware to validate review
reviewSchema.pre('save', function(next) {
  if (this.isModified('comment')) {
    // Trim whitespace and validate
    this.comment = this.comment.trim();
    if (this.comment.length < 10) {
      return next(new Error('Comment must be at least 10 characters long'));
    }
  }
  next();
});

// Virtual for helpful count
reviewSchema.virtual('helpfulCount').get(function() {
  return this.helpful ? this.helpful.length : 0;
});

// Virtual for formatted date
reviewSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

module.exports = mongoose.model('Review', reviewSchema);
