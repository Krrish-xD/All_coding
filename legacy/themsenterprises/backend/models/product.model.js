const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    enum: {
      values: ['MS Enterprises', 'Jaksh'],
      message: 'Brand must be either MS Enterprises or Jaksh'
    }
  },
  images: [{
    type: String,
    required: [true, 'At least one product image is required']
  }],
  category: {
    type: String,
    required: [true, 'Product category is required'],
    trim: true
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  customizations: [
    {
      optionId: new mongoose.Schema({
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomizationOption' },
        name: String,
        type: String,
        priceModifier: {
          type: {
            type: String,
            enum: ['fixed', 'percentage'],
            default: 'fixed'
          },
          value: {
            type: Number,
            default: 0
          },
          operator: {
            type: String,
            enum: ['+', '-'],
            default: '+'
          }
        },
        options: [{
          value: String,
          priceModifier: {
            operator: {
              type: String,
              enum: ['+', '-'],
              default: '+'
            },
            value: {
              type: Number,
              default: 0
            }
          }
        }],
        isActive: Boolean
      }, { _id: false }),
      enabled: { type: Boolean, default: true }
    }
  ],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  sku: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true
  },
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative']
  },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
productSchema.index({ brand: 1, category: 1 });
productSchema.index({ name: 'text', description: 'text', category: 'text', brand: 'text', tags: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ createdAt: -1 });

// Virtual for average rating
productSchema.virtual('averageRating').get(function() {
  if (this.reviews && this.reviews.length > 0) {
    // This would be calculated from actual reviews
    return 4.5; // Placeholder - implement actual calculation
  }
  return 0;
});

// Virtual for total reviews count
productSchema.virtual('totalReviews').get(function() {
  return this.reviews ? this.reviews.length : 0;
});

// Instance method to check if product is in stock
productSchema.methods.isInStock = function(quantity = 1) {
  return this.stock >= quantity;
};

// Instance method to get product summary
productSchema.methods.getSummary = function() {
  return {
    id: this._id,
    name: this.name,
    price: this.price,
    brand: this.brand,
    category: this.category,
    image: this.images[0], // First image as primary
    stock: this.stock,
    isActive: this.isActive,
    isFeatured: this.isFeatured,
    averageRating: this.averageRating,
    totalReviews: this.totalReviews
  };
};

// Static method to find products by brand
productSchema.statics.findByBrand = function(brand) {
  return this.find({ brand, isActive: true });
};

// Static method to find featured products
productSchema.statics.findFeatured = function(limit = 10) {
  return this.find({ isFeatured: true, isActive: true })
    .limit(limit)
    .sort({ createdAt: -1 });
};

// Static method to search products
productSchema.statics.searchProducts = function(query, filters = {}) {
  const searchQuery = {
    isActive: true,
    ...filters
  };

  if (query) {
    searchQuery.$text = { $search: query };
  }

  return this.find(searchQuery);
};

module.exports = mongoose.model('Product', productSchema);
