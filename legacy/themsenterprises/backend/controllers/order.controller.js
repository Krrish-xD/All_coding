const { Order, Product, User, Coupon, Setting } = require('../models');
const { validationResult } = require('express-validator');
const { sendOrderConfirmation, sendAdminOrderNotification } = require('../services/emailService');
const { calculateOrderTotal } = require('../services/priceCalculator.service');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    // Only accept product info, shipping address, and coupon from client
    const { products, shippingAddress, coupon: couponCode } = req.body;

    if (!products || products.length === 0) {
        return res.status(400).json({ success: false, error: 'No products in order.' });
    }

    const { createRazorpayOrder } = require('../services/paymentService');

    // *** SECURITY: ALWAYS calculate the price on the backend ***
    const priceBreakdown = await calculateOrderTotal(products, couponCode);

    // If the calculator returned an error (e.g., product not found, out of stock)
    if (priceBreakdown.error) {
        return res.status(400).json({ success: false, error: priceBreakdown.error });
    }

    console.log('💰 Price breakdown:', priceBreakdown);

    // Create a Razorpay order with proper receipt and notes
    const razorpayOrder = await createRazorpayOrder(
      priceBreakdown.finalTotal, 
      'INR',
      `order_${Date.now()}`.substring(0, 40), // ✅ ADDED - Receipt ID
      { 
        userId: req.user._id.toString(), 
        userEmail: req.user.email 
      }
    );

    if (!razorpayOrder || !razorpayOrder.success) {
      console.error('❌ Failed to create Razorpay order:', razorpayOrder);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create Razorpay order.',
        details: razorpayOrder?.error 
      });
    }

    console.log('✅ Razorpay order created:', razorpayOrder.orderId);

    // Create order using the backend-calculated totals
    const order = await Order.create({
      user: req.user._id,
      products: priceBreakdown.validatedItems,
      shippingAddress: {
        name: shippingAddress.name, // ✅ ADDED
        phone: shippingAddress.phone, // ✅ ADDED
        address: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state, // Add this line
        postalCode: shippingAddress.pinCode,
        country: shippingAddress.country,
      },
      paymentDetails: {
        paymentMethod: 'Razorpay',
        razorpayOrderId: razorpayOrder.orderId, // ✅ FIXED: was razorpayOrder.id
        status: 'pending',
        amount: priceBreakdown.finalTotal, 
        currency: 'INR',
        breakdown: {
            subtotal: priceBreakdown.subtotal,
            shipping: priceBreakdown.shipping,
            tax: priceBreakdown.tax,
            couponDiscount: priceBreakdown.couponDiscount
        }
      },
      totalAmount: priceBreakdown.finalTotal,
      coupon: priceBreakdown.appliedCoupon,
      discountAmount: priceBreakdown.couponDiscount,
    });

    console.log('✅ Order created in database:', {
      orderId: order._id,
      razorpayOrderId: order.paymentDetails.razorpayOrderId,
      totalAmount: order.totalAmount
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: order,
    });

  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({ success: false, error: 'Server error creating order' });
  }
};

// @desc    Get user's orders
// @route   GET /api/orders/me
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const orders = await Order.find({ user: req.user._id })
      .populate('products.product', 'name images price brand')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    const total = await Order.countDocuments({ user: req.user._id });

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalOrders: total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    };

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination,
      orders
    });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting orders'
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user owns the order or is admin
    if (order.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this order'
      });
    }

    // If authorized, find again and populate for the response
    const populatedOrder = await Order.findById(req.params.id)
      .populate('products.product', 'name images price brand category')
      .populate('user', 'username email');

    res.status(200).json({
      success: true,
      order: populatedOrder
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting order'
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Admin only)
const updateOrderStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { orderStatus, trackingLink, notes } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Update order
    order.orderStatus = orderStatus;
    if (trackingLink) order.trackingLink = trackingLink;
    if (notes) order.notes = notes;

    // Set actual delivery date if status is delivered
    if (orderStatus === 'delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();

    // Populate the updated order
    const updatedOrder = await Order.findById(order._id)
      .populate('products.product', 'name images price brand')
      .populate('user', 'username email');

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error updating order status'
    });
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to cancel this order'
      });
    }

    // Check if order can be cancelled (only pending or processing)
    if (!['pending', 'processing'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        error: 'Order cannot be cancelled at this stage'
      });
    }

    // Update order status
    order.orderStatus = 'cancelled';
    await order.save();

    // Restore product stock if it was already deducted
    if (order.stockDeducted) {
      for (const item of order.products) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } }
        );
      }
      order.stockDeducted = false;
      await order.save();
    }

    // Populate the updated order
    const updatedOrder = await Order.findById(order._id)
      .populate('products.product', 'name images price brand')
      .populate('user', 'username email');

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error cancelling order'
    });
  }
};

// @desc    Get order statistics
// @route   GET /api/orders/stats
// @access  Private (Admin only)
const getOrderStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { 'paymentDetails.status': 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Monthly revenue for the last 12 months
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
      { $limit: 12 }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        statusBreakdown: stats,
        monthlyRevenue
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting order statistics'
    });
  }
};

// @desc    Update order payment details
// @route   PUT /api/orders/:id
// @access  Private
const updateOrderPayment = async (req, res) => {
  try {
    const { paymentDetails } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this order'
      });
    }

    // Update payment details
    if (paymentDetails) {
      order.paymentDetails = { ...order.paymentDetails, ...paymentDetails };
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error updating order'
    });
  }
};

// @desc    Get all orders (Admin only)
// @route   GET /api/orders
// @access  Private (Admin only)
const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Filter options
    let filter = {};
    if (req.query.status) filter.orderStatus = req.query.status;
    if (req.query.paymentStatus) filter['paymentDetails.status'] = req.query.paymentStatus;

    const orders = await Order.find(filter)
      .populate('user', 'username email')
      .populate('products.product', 'name images price brand')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    const total = await Order.countDocuments(filter);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalOrders: total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    };

    res.status(200).json({
      success: true,
      count: orders.length,
      pagination,
      orders
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting orders'
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderPayment,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
  getAllOrders,
};