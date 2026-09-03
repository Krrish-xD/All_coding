const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const { Setting } = require('../models');

// @desc    Get admin dashboard stats
// @route   GET /api/admin12345678987654321/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { paymentDetails: { status: 'paid' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const pendingOrders = await Order.countDocuments({ orderStatus: 'Processing' });
    const deliveredOrders = await Order.countDocuments({ orderStatus: 'Delivered' });
    const cancelledOrders = await Order.countDocuments({ orderStatus: 'Cancelled' });
    const totalProducts = await Product.countDocuments();
    const totalCustomers = await User.countDocuments();
    const wishlistItems = await User.aggregate([
      { $unwind: '$wishlist' },
      { $count: 'total' },
    ]);

    res.json({
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalProducts,
      totalCustomers,
      wishlistItems: wishlistItems[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all orders
// @route   GET /api/admin12345678987654321/orders
// @access  Private
const getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { orderStatus: status } : {};
    const orders = await Order.find(filter)
      .populate({
        path: 'user',
        select: 'username email'
      })
      .populate({
        path: 'products.product',
        model: 'Product',
        populate: {
          path: 'customizations.optionId',
          model: 'CustomizationOption'
        }
      })
      .sort({ createdAt: -1 });
    const total = await Order.countDocuments(filter);
    res.json({ orders, total, page: 1, pages: 1 });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single order
// @route   GET /api/admin12345678987654321/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'username email addresses')
      .populate({
        path: 'products.product',
        populate: {
          path: 'customizations.optionId',
          model: 'CustomizationOption'
        }
      });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update order status
// @route   PATCH /api/admin12345678987654321/orders/:id
// @access  Private
const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (orderStatus) order.orderStatus = orderStatus;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete an order
// @route   DELETE /api/admin2009/orders/:id
// @access  Private
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    await order.deleteOne(); // Use deleteOne() for Mongoose

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all products
// @route   GET /api/admin12345678987654321/products
// @access  Private
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create product
// @route   POST /api/admin12345678987654321/products
// @access  Private
const createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get product by ID
// @route   GET /api/admin12345678987654321/products/:id
// @access  Private
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update product
// @route   PATCH /api/admin12345678987654321/products/:id
// @access  Private
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete product
// @route   DELETE /api/admin12345678987654321/products/:id
// @access  Private
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all customers
// @route   GET /api/admin12345678987654321/customers
// @access  Private
const getAllCustomers = async (req, res) => {
  try {
    const customers = await User.find({ isAdmin: { $ne: true } }).select('-password');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get customer by ID
// @route   GET /api/admin12345678987654321/customers/:id
// @access  Private
const getCustomerById = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id).select('-password');
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update customer
// @route   PATCH /api/admin12345678987654321/customers/:id
// @access  Private
const updateCustomer = async (req, res) => {
  try {
    const customer = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete customer
// @route   DELETE /api/admin12345678987654321/customers/:id
// @access  Private
const deleteCustomer = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get sales report
// @route   GET /api/admin12345678987654321/reports/sales
// @access  Private
const getSalesReport = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    // Simple aggregation for sales
    const sales = await Order.aggregate([
      { $match: { paymentDetails: { status: 'paid' } } },
      {
        $group: {
          _id: {
            $dateToString: { format: period === 'daily' ? '%Y-%m-%d' : '%Y-%m', date: '$createdAt' },
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
    ]);
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get top selling products
// @route   GET /api/admin12345678987654321/reports/products
// @access  Private
const getTopProducts = async (req, res) => {
  try {
    const topProducts = await Order.aggregate([
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.product',
          totalSold: { $sum: '$products.quantity' },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
    ]);
    res.json(topProducts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};


// @route   GET /api/admin2009/settings
// @access  Private
const getAdminSettings = async (req, res) => {
  try {
    const settings = await Setting.find({});
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    // Ensure paymentGatewayLive reflects the default backend behavior if missing
    if (settingsObject.paymentGatewayLive === undefined) {
      settingsObject.paymentGatewayLive = (process.env.NODE_ENV === 'production');
    }

    res.status(200).json(settingsObject);
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update admin settings
// @route   PATCH /api/admin2009/settings
// @access  Private
// @desc    Update admin settings
// @route   PATCH /api/admin2009/settings
// @access  Private
const updateAdminSettings = async (req, res) => {
  try {
    let settings = req.body;

    // Safety check: if body comes in as string (weird content-type issue), parse it
    if (typeof settings === 'string') {
      try {
        settings = JSON.parse(settings);
      } catch (e) {
        console.error('Failed to parse settings body string:', e);
        return res.status(400).json({ message: 'Invalid JSON body' });
      }
    }

    console.log('📝 Received settings update payload:', JSON.stringify(settings, null, 2));

    if (!settings || Object.keys(settings).length === 0) {
      console.warn('⚠️ Received empty settings object');
      return res.status(400).json({ message: 'No settings provided' });
    }

    const updates = [];
    for (const key of Object.keys(settings)) {
      const value = settings[key];

      // Skip undefined values
      if (value === undefined) continue;

      updates.push(async () => {
        try {
          const result = await Setting.findOneAndUpdate(
            { key },
            { key, value },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          console.log(`✅ Updated setting [${key}]:`, result ? result.value : 'null');
          return result;
        } catch (err) {
          console.error(`❌ Failed to update setting [${key}]:`, err);
          throw err;
        }
      });
    }

    // Execute updates
    await Promise.all(updates.map(fn => fn()));

    res.status(200).json({ message: 'Settings updated successfully' });

  } catch (error) {
    console.error('Error updating admin settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getAllProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getSalesReport,
  getTopProducts,
  getAdminSettings,
  updateAdminSettings,
  deleteOrder, // Added
};
