const { validationResult } = require('express-validator');
const { Order, User, Product, Setting } = require('../models');
const { formatCustomizations } = require('../services/emailService');
const crypto = require('crypto');
const {
  createRazorpayOrder,
  verifyPaymentSignature,
  getPaymentDetails,
  refundPayment,
  calculateOrderAmount,
  getRazorpayKeyId,
} = require('../services/paymentService');
const { sendOrderConfirmation, sendAdminOrderNotification } = require('../services/emailService');

// @desc    Create a new Razorpay order
// @route   POST /api/payments/create-order
// @access  Private
const createPaymentOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const { amount, currency = 'INR', receipt, notes = {} } = req.body;
    const orderCalculation = calculateOrderAmount(amount, 0); // 0% tax for now
    const orderReceipt = receipt || `rcpt_${Date.now()}`.substring(0, 40);

    const razorpayOrder = await createRazorpayOrder(
      orderCalculation.totalAmount,
      currency,
      orderReceipt,
      { userId: req.user._id.toString(), userEmail: req.user.email, ...notes }
    );

    if (!razorpayOrder.success) {
      console.error('❌ Failed to create Razorpay order:', razorpayOrder.error);
      return res.status(500).json({ success: false, error: 'Failed to create payment order', details: razorpayOrder.error });
    }

    // Get the correct public key for the frontend
    const publicKey = await getRazorpayKeyId();

    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      order: {
        id: razorpayOrder.orderId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        key: publicKey,
      },
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({ success: false, error: 'Server error creating payment order' });
  }
};

// @desc    Verify payment signature and update order status
// @route   POST /api/payments/verify
// @access  Public (signature verified)
const verifyPayment = async (req, res) => {
  try {
    // ✅ DETAILED LOGGING
    console.log('\n🔍 ===== PAYMENT VERIFICATION START =====');
    console.log('📥 Request body:', JSON.stringify(req.body, null, 2));

    // ✅ VALIDATE REQUEST BODY EXISTS
    if (!req.body || typeof req.body !== 'object') {
      console.error('❌ Invalid request body:', req.body);
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        received: typeof req.body
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: errors.array(),
        received: Object.keys(req.body || {}),
        required: ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'orderId']
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    console.log('✅ Validation passed');
    console.log('   - razorpay_order_id:', razorpay_order_id);
    console.log('   - razorpay_payment_id:', razorpay_payment_id);
    console.log('   - razorpay_signature:', razorpay_signature?.substring(0, 20) + '...');
    console.log('   - orderId:', orderId);

    // ✅ VERIFY SIGNATURE
    console.log('\n🔐 Verifying payment signature...');
    const signatureVerification = await verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!signatureVerification.success) {
      console.error('❌ Signature verification failed:', signatureVerification.error);
      return res.status(500).json({ 
        success: false, 
        error: 'Signature verification failed',
        details: signatureVerification.error 
      });
    }

    if (!signatureVerification.isValid) {
      console.error('❌ Invalid payment signature');
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    console.log('✅ Signature verified successfully');

    // ✅ GET PAYMENT DETAILS FROM RAZORPAY
    console.log('\n📡 Fetching payment details from Razorpay...');
    const paymentDetails = await getPaymentDetails(razorpay_payment_id);
    
    if (!paymentDetails.success) {
      console.error('❌ Failed to fetch payment details:', paymentDetails.error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch payment details',
        details: paymentDetails.error 
      });
    }

    console.log('✅ Payment details fetched:', {
      id: paymentDetails.payment.id,
      status: paymentDetails.payment.status,
      captured: paymentDetails.payment.captured,
      method: paymentDetails.payment.method
    });

    // ✅ FIND ORDER
    console.log('\n🔍 Finding order:', orderId);
    const order = await Order.findById(orderId).populate('products.product');
    
    if (!order) {
      console.error('❌ Order not found:', orderId);
      return res.status(404).json({ success: false, error: 'Order not found for this payment' });
    }

    console.log('✅ Order found:', {
      id: order._id,
      user: order.user,
      totalAmount: order.totalAmount,
      currentStatus: order.orderStatus
    });

    // ✅ UPDATE ORDER PAYMENT DETAILS
    console.log('\n💳 Updating payment details...');
    order.paymentDetails.razorpayPaymentId = razorpay_payment_id;
    order.paymentDetails.razorpaySignature = razorpay_signature;
    order.paymentDetails.paymentType = paymentDetails.payment.method;
    order.paymentDetails.captured = paymentDetails.payment.captured;

    if (paymentDetails.payment.status === 'captured') {
      order.paymentDetails.status = 'completed';
      order.orderStatus = 'processing';
      order.paymentReconciled = true;
      order.reconciledAt = new Date();

      console.log('✅ Payment captured - updating order status to Processing');

      // ✅ DEDUCT STOCK (ONLY ONCE)
      if (!order.stockDeducted) {
        console.log('📦 Deducting stock...');
        for (const item of order.products) {
          try {
            const product = await Product.findById(item.product._id);
            if (product) {
              const newStock = Math.max(0, product.stock - item.quantity);
              await Product.findByIdAndUpdate(item.product._id, { stock: newStock });
              console.log(`   ✅ ${item.product.name}: ${product.stock} → ${newStock}`);
            } else {
              console.warn(`   ⚠️ Product not found: ${item.product._id}`);
            }
          } catch (stockError) {
            console.error(`   ❌ Error updating stock for ${item.product._id}:`, stockError);
          }
        }
        order.stockDeducted = true;
      } else {
        console.log('ℹ️ Stock already deducted, skipping');
      }
    } else if (paymentDetails.payment.status === 'authorized') {
      order.paymentDetails.status = 'pending';
      order.orderStatus = 'pending';
      console.log('⚠️ Payment authorized but not captured yet');
    } else {
      order.paymentDetails.status = 'failed';
      order.orderStatus = 'Payment Failed';
      console.log('❌ Payment failed with status:', paymentDetails.payment.status);
    }

    await order.save();
    console.log('✅ Order saved successfully');

    // ✅ SEND CONFIRMATION EMAILS (ONLY FOR CAPTURED PAYMENTS)
    if (paymentDetails.payment.status === 'captured') {
      console.log('\n📧 Sending confirmation emails...');
      try {
        const user = await User.findById(order.user);
        if (!user) {
          console.warn('⚠️ User not found for order:', order.user);
        } else {
          // Customer email data (no download buttons)
          const customerEmailData = {
            orderId: order._id.toString(),
            customerName: user.username,
            customerEmail: user.email,
            customerPhone: user.phone || order.shippingAddress.phone,
            products: order.products.map(item => ({
              name: item.product.name,
              quantity: item.quantity,
              price: item.price,
              brand: item.product.brand,
              // ✅ Customer - false = no download button
              customization: item.customisation ? formatCustomizations(item.customisation, false) : null,
              imageUrl: item.product.images && item.product.images.length > 0 ? item.product.images[0] : null,
            })),
            totalAmount: order.totalAmount,
            shippingAddress: {
              name: order.shippingAddress.name,
              street: order.shippingAddress.address,
              city: order.shippingAddress.city,
              state: order.shippingAddress.state,
              pincode: order.shippingAddress.postalCode,
              phone: order.shippingAddress.phone
            },
            paymentId: razorpay_payment_id,
            paymentStatus: 'completed',
            orderStatus: order.orderStatus,
          };

          // Admin email data (with download buttons)
          const adminEmailData = {
            ...customerEmailData,
            products: order.products.map(item => ({
              name: item.product.name,
              quantity: item.quantity,
              price: item.price,
              brand: item.product.brand,
              // ✅ Admin - true = shows download button
              customization: item.customisation ? formatCustomizations(item.customisation, true) : null,
              imageUrl: item.product.images && item.product.images.length > 0 ? item.product.images[0] : null,
            }))
          };

          await sendOrderConfirmation(user.email, customerEmailData);
          console.log('   ✅ Customer email sent to:', user.email);

          const adminEmail = process.env.ADMIN_EMAIL || 'olivepixel.designs@gmail.com';
          await sendAdminOrderNotification(adminEmail, adminEmailData);
          console.log('   ✅ Admin email sent to:', adminEmail);
        }
      } catch (emailError) {
        console.error('❌ Email notification failed:', emailError);
        // Don't fail the request if email fails
      }
    }

    console.log('\n✅ ===== PAYMENT VERIFICATION COMPLETE =====\n');

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      order: { 
        id: order._id, 
        status: order.orderStatus, 
        paymentId: razorpay_payment_id,
        paymentStatus: order.paymentDetails.status
      },
    });

  } catch (error) {
    console.error('\n❌ ===== PAYMENT VERIFICATION ERROR =====');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('==========================================\n');

    res.status(500).json({ 
      success: false, 
      error: 'Server error verifying payment',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

// @desc    Handle Razorpay webhook for payment events
// @route   POST /api/payments/webhook
// @access  Public (webhook)
const handlePaymentWebhook = async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const payload = JSON.stringify(req.body);

    const paymentSettings = await Setting.findOne({ key: 'paymentGatewayLive' });
    const isLive = paymentSettings ? paymentSettings.value : false;
    const webhookSecret = isLive ? process.env.RAZORPAY_WEBHOOK_SECRET : process.env.RAZORPAY_TEST_WEBHOOK_SECRET;

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      return res.status(400).json({ success: false, error: 'Invalid webhook signature' });
    }

    const event = req.body;
    const payment = event.payload.payment;
    const order = event.payload.order;

    // Find the order using the Razorpay Order ID from the webhook payload
    const orderToUpdate = await Order.findOne({ 'paymentDetails.razorpayOrderId': order.entity.id }).populate('products.product');

    if (!orderToUpdate) {
        console.log(`Webhook received for order ${order.entity.id}, but no matching order found in DB.`);
        return res.status(200).json({ success: true, message: 'Webhook received, but no order found.' });
    }

    switch (event.event) {
      case 'payment.authorized':
      case 'payment.captured':
        orderToUpdate.paymentDetails.razorpayPaymentId = payment.entity.id;
        orderToUpdate.paymentDetails.status = 'completed';
        orderToUpdate.paymentDetails.paymentType = payment.entity.method;
        orderToUpdate.orderStatus = 'processing';
        await orderToUpdate.save();

        for (const item of orderToUpdate.products) {
          await Product.findByIdAndUpdate(item.product._id, { $inc: { stock: -item.quantity } });
        }

        const user = await User.findById(orderToUpdate.user);
        if (user) {
            // Customer email data (no download buttons)
            const customerEmailData = {
              orderId: orderToUpdate._id.toString(),
              customerName: user.username,
              customerEmail: user.email,
              customerPhone: user.phone || orderToUpdate.shippingAddress.phone,
              products: orderToUpdate.products.map(item => ({
                name: item.product.name,
                quantity: item.quantity,
                price: item.price,
                brand: item.product.brand,
                // ✅ Customer - false = no download button
                customization: item.customisation ? formatCustomizations(item.customisation, false) : null,
                imageUrl: item.product.images && item.product.images.length > 0 ? item.product.images[0] : null,
              })),
              totalAmount: orderToUpdate.totalAmount,
              shippingAddress: {
                name: orderToUpdate.shippingAddress.name,
                street: orderToUpdate.shippingAddress.address,
                city: orderToUpdate.shippingAddress.city,
                state: orderToUpdate.shippingAddress.state,
                pincode: orderToUpdate.shippingAddress.postalCode,
                phone: orderToUpdate.shippingAddress.phone
              },
              paymentId: payment.entity.id,
              paymentStatus: 'completed',
              orderStatus: orderToUpdate.orderStatus,
            };

            // Admin email data (with download buttons)
            const adminEmailData = {
              ...customerEmailData,
              products: orderToUpdate.products.map(item => ({
                name: item.product.name,
                quantity: item.quantity,
                price: item.price,
                brand: item.product.brand,
                // ✅ Admin - true = shows download button
                customization: item.customisation ? formatCustomizations(item.customisation, true) : null,
                imageUrl: item.product.images && item.product.images.length > 0 ? item.product.images[0] : null,
              }))
            };

            await sendOrderConfirmation(user.email, customerEmailData);
            const adminEmail = process.env.ADMIN_EMAIL || 'olivepixel.designs@gmail.com';
            await sendAdminOrderNotification(adminEmail, adminEmailData);
        }
        break;

      case 'payment.failed':
        orderToUpdate.paymentDetails.status = 'failed';
        orderToUpdate.orderStatus = 'Payment Failed';
        await orderToUpdate.save();
        break;

      default:
        // Unhandled event
    }

    res.status(200).json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ success: false, error: 'Server error processing webhook' });
  }
};

// @desc    Get payment status
// @route   GET /api/payments/status/:paymentId
// @access  Private
const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const paymentDetails = await getPaymentDetails(paymentId);

    if (!paymentDetails.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch payment status',
      });
    }

    res.status(200).json({
      success: true,
      payment: paymentDetails.payment,
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error getting payment status',
    });
  }
};

// @desc    Refund a payment
// @route   POST /api/payments/refund
// @access  Private (Admin only)
const processRefund = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
      });
    }

    const { paymentId, amount, notes = {} } = req.body;

    // Get payment details first to check if refund is possible
    const paymentDetails = await getPaymentDetails(paymentId);

    if (!paymentDetails.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch payment details',
      });
    }

    if (paymentDetails.payment.status !== 'captured') {
      return res.status(400).json({
        success: false,
        error: 'Payment must be captured to be refunded',
      });
    }

    // Process refund
    const refundAmount = amount || paymentDetails.payment.amount / 100;
    const refund = await refundPayment(paymentId, refundAmount, notes);

    if (!refund.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to process refund',
        details: refund.error,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        id: refund.refundId,
        amount: refund.amount,
        status: refund.status,
      },
    });
  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error processing refund',
    });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  handlePaymentWebhook,
  getPaymentStatus,
  processRefund,
};