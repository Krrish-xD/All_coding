const { User, Product, Order, Coupon, Setting, Review, CustomizationOption } = require('../models');
const { validationResult } = require('express-validator');
const AWS = require('aws-sdk');
const bucketName = process.env.S3_BUCKET_NAME || 'themsenterprises-product-images';
const s3 = new AWS.S3();

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
const getDashboardStats = async (req, res) => {
  try {
    // Get total counts
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalOrders = await Order.countDocuments();
    const totalReviews = await Review.countDocuments();

    // Get recent orders
    const recentOrders = await Order.find()
      .populate('user', 'username email')
      .populate('products.product', 'name price')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get order status breakdown
    const orderStats = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get monthly revenue for the last 6 months
    const monthlyRevenue = await Order.aggregate([
      { $match: { 'paymentDetails.status': 'completed' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 }
    ]);

    // Get top products by orders
    const topProducts = await Order.aggregate([
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.product',
          totalOrdered: { $sum: '$products.quantity' },
          totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
        }
      },
      { $sort: { totalOrdered: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    // Get user registration stats for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const userRegistrationStats = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalReviews,
        recentOrders,
        orderStats,
        monthlyRevenue,
        topProducts,
        userRegistrationStats
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting dashboard statistics'
    });
  }
};

// @desc    Get all products for admin
// @route   GET /api/admin/products
// @access  Private (Admin only)
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({})
      .populate({
        path: 'customizations.optionId'
      })
      .sort({ createdAt: -1 });

    res.status(200).json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting products'
    });
  }
};

// @desc    Get all users with pagination
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const startIndex = (page - 1) * limit;

    // Build query
    let query = {};
    if (search) {
      query = {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    const total = await User.countDocuments(query);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    };

    res.status(200).json({
      success: true,
      count: users.length,
      pagination,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting users'
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin only)
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('wishlist', 'name images price brand');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting user'
    });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private (Admin only)
const updateUser = async (req, res) => {
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

    const { username, email, isAdmin } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, isAdmin },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error updating user'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error deleting user'
    });
  }
};

// @desc    Create product
// @route   POST /api/admin/products
// @access  Private (Admin only)
const createProduct = async (req, res) => {
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

    const productData = req.body;

    // Restore customizations handling
    if (!productData.customizations) {
      // Fetch all active customizations
      const allCustomizations = await CustomizationOption.find({ isActive: true });
      // Set default customizations with enabled true
      productData.customizations = allCustomizations.map(c => ({
        optionId: {
          _id: c._id,
          name: c.name,
          type: c.type,
          priceModifier: c.priceModifier,
          options: c.options,
          isActive: c.isActive
        },
        enabled: c.isDefault || false
      }));
    } else {
      // Assume customizations are provided as { optionId: "id", enabled: true }
      // Fetch and embed full customization details
      const customizationIds = productData.customizations.map(c => c.optionId).filter(id => id);
      const customizations = await CustomizationOption.find({ _id: { $in: customizationIds } });
      const customizationMap = customizations.reduce((map, c) => {
        map[c._id.toString()] = c;
        return map;
      }, {});
      productData.customizations = productData.customizations.map(c => {
        const cust = customizationMap[c.optionId];
        return {
          optionId: cust ? {
            _id: cust._id,
            name: cust.name,
            type: cust.type,
            priceModifier: cust.priceModifier,
            options: cust.options,
            isActive: cust.isActive
          } : c.optionId, // fallback if not found
          enabled: c.enabled
        };
      });
    }

    // Generate SKU if not provided
    if (!productData.sku) {
      const count = await Product.countDocuments();
      productData.sku = `MS${(count + 1).toString().padStart(4, '0')}`;
    }

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error creating product'
    });
  }
};

// @desc    Update product and handle image deletions
// @route   PUT /api/admin/products/:id
// @access  Private (Admin only)
const updateProduct = async (req, res) => {
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

    // Get the current product to compare images
    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Find images that were removed
    const newImages = req.body.images || [];
    const removedImages = currentProduct.images.filter(img => !newImages.includes(img));

    // Delete removed images from S3
    if (removedImages.length > 0) {
      const deleteParams = {
        Bucket: bucketName,
        Delete: {
          Objects: removedImages.map(url => {
            const urlParts = url.split('/');
            const key = urlParts.slice(-2).join('/'); // products/uuid.ext
            return { Key: key };
          }),
          Quiet: false
        }
      };

      try {
        await s3.deleteObjects(deleteParams).promise();
      } catch (err) {
        console.error('Failed to delete removed images from S3:', err);
        // Continue with product update even if image deletion fails
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error updating product'
    });
  }
};

 // @desc    Delete product and associated images from S3
// @route   DELETE /api/admin/products/:id
// @access  Private (Admin only)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Note: Images are now deleted from S3 after the undo period in the frontend
    // to allow for product restoration without losing images.
    /*
    // Delete images from S3
    if (product.images && product.images.length > 0) {
      console.log('Deleting images from S3 for product:', product._id);
      console.log('Image URLs:', product.images);

      const deleteParams = {
        Bucket: bucketName,
        Delete: {
          Objects: product.images.map(url => {
            const urlParts = url.split('/');
            const key = urlParts.slice(-2).join('/'); // products/uuid.ext
            console.log('URL:', url, 'Key:', key);
            return { Key: key };
          }),
          Quiet: false
        }
      };

      console.log('Delete params:', JSON.stringify(deleteParams, null, 2));

      try {
        const result = await s3.deleteObjects(deleteParams).promise();
        console.log('S3 delete result:', result);
      } catch (err) {
        console.error('Failed to delete product images from S3:', err);
        // Continue with product deletion even if image deletion fails
      }
    }
    */

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product and associated images deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error deleting product'
    });
  }
};



// @desc    Create a new coupon
// @route   POST /api/admin/coupons
// @access  Private (Admin only)
const createCoupon = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const coupon = await Coupon.create(req.body);
    res.status(201).json({ success: true, message: 'Coupon created successfully', coupon });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ success: false, error: 'Server error creating coupon' });
  }
};

// @desc    Get all coupons
// @route   GET /api/admin/coupons
// @access  Private (Admin only)
const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.status(200).json({ success: true, coupons });
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ success: false, error: 'Server error getting coupons' });
  }
};

// @desc    Get a single coupon
// @route   GET /api/admin/coupons/:id
// @access  Private (Admin only)
const getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Coupon not found' });
    }
    res.status(200).json({ success: true, coupon });
  } catch (error) {
    console.error('Get coupon error:', error);
    res.status(500).json({ success: false, error: 'Server error getting coupon' });
  }
};

// @desc    Update a coupon
// @route   PUT /api/admin/coupons/:id
// @access  Private (Admin only)
const updateCoupon = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Coupon not found' });
    }
    res.status(200).json({ success: true, message: 'Coupon updated successfully', coupon });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ success: false, error: 'Server error updating coupon' });
  }
};

// @desc    Delete a coupon
// @route   DELETE /api/admin/coupons/:id
// @access  Private (Admin only)
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Coupon not found' });
    }
    res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ success: false, error: 'Server error deleting coupon' });
  }
};

// @desc    Get all settings
// @route   GET /api/admin/settings
// @access  Private (Admin only)
const getSettings = async (req, res) => {
  try {
    const settings = await Setting.find();
    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
    res.status(200).json({ success: true, settings: settingsMap });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, error: 'Server error getting settings' });
  }
};

// @desc    Update settings
// @route   PUT /api/admin/settings
// @access  Private (Admin only)
const updateSettings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const { settings } = req.body;

    for (const key in settings) {
      await Setting.findOneAndUpdate({ key }, { value: settings[key] }, { upsert: true, new: true, runValidators: true });
    }

    const updatedSettings = await Setting.find();
    const settingsMap = updatedSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.status(200).json({ success: true, message: 'Settings updated successfully', settings: settingsMap });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, error: 'Server error updating settings' });
  }
};

module.exports = {
  getDashboardStats,
  getProducts,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  createCoupon,
  getCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  getSettings,
  updateSettings
};
