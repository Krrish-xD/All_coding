const crypto = require('crypto');
const { Order, User, Product, Setting } = require('../models');
const WebhookLog = require('../models/webhookLog.model');
const { sendOrderConfirmation, sendAdminOrderNotification, sendPaymentFailedEmail, flattenCustomization } = require('../services/emailService');

/**
 * Verify Razorpay webhook signature
 */
const verifyWebhookSignature = (payload, signature, secret) => {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('❌ Webhook signature verification error:', error);
    return false;
  }
};

/**
 * Main webhook handler for Razorpay payment events
 * @route POST /api/webhooks/razorpay
 * @access Public (with signature verification)
 */
const handleRazorpayWebhook = async (req, res) => {
  const startTime = Date.now();
  let webhookLog = null;

  try {
    // Step 1: Get webhook signature and payload
    const webhookSignature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    console.log('📥 Webhook received:', {
      eventType: event.event,
      eventId: event.payload?.payment?.entity?.id || event.payload?.order?.entity?.id,
      timestamp: new Date().toISOString()
    });

    // Step 2: Verify webhook signature
    const paymentSettings = await Setting.findOne({ key: 'paymentGatewayLive' });
    const isLive = paymentSettings ? paymentSettings.value : (process.env.NODE_ENV === 'production');
    const webhookSecret = isLive
      ? process.env.RAZORPAY_WEBHOOK_SECRET
      : process.env.RAZORPAY_TEST_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('❌ Webhook secret not configured');
      return res.status(500).json({
        success: false,
        error: 'Webhook secret not configured'
      });
    }

    const isValidSignature = verifyWebhookSignature(rawBody, webhookSignature, webhookSecret);

    if (!isValidSignature) {
      console.error('❌ Invalid webhook signature');

      // Log failed verification attempt
      await WebhookLog.create({
        eventId: event.payload?.payment?.entity?.id || `unknown_${Date.now()}`,
        eventType: event.event || 'unknown',
        payload: event,
        status: 'failed',
        signature: webhookSignature,
        signatureVerified: false,
        error: {
          message: 'Invalid webhook signature',
          stack: 'Signature verification failed'
        }
      });

      return res.status(400).json({
        success: false,
        error: 'Invalid webhook signature'
      });
    }

    // Step 3: Extract event data
    const eventType = event.event;
    const eventId = event.payload?.payment?.entity?.id || event.payload?.order?.entity?.id;

    // Create webhook log entry
    webhookLog = await WebhookLog.create({
      eventId,
      eventType,
      payload: event,
      status: 'processing',
      signature: webhookSignature,
      signatureVerified: true
    });

    // Step 4: Process event based on type
    let result;
    switch (eventType) {
      case 'payment.authorized':
        result = await handlePaymentAuthorized(event, webhookLog);
        break;

      case 'payment.captured':
        result = await handlePaymentCaptured(event, webhookLog);
        break;

      case 'payment.failed':
        result = await handlePaymentFailed(event, webhookLog);
        break;

      case 'order.paid':
        result = await handleOrderPaid(event, webhookLog);
        break;

      case 'refund.created':
        result = await handleRefundCreated(event, webhookLog);
        break;

      case 'refund.processed':
        result = await handleRefundProcessed(event, webhookLog);
        break;

      case 'refund.failed':
        result = await handleRefundFailed(event, webhookLog);
        break;

      case 'payment.dispute.created':
        result = await handleDisputeCreated(event, webhookLog);
        break;

      default:
        console.log(`ℹ️ Unhandled webhook event: ${eventType}`);
        result = { handled: false, message: 'Event type not handled' };
    }

    // Step 5: Update webhook log
    webhookLog.status = result.handled ? 'processed' : 'failed';
    webhookLog.processedAt = new Date();
    if (result.orderId) webhookLog.orderId = result.orderId;
    if (result.error) webhookLog.error = result.error;
    await webhookLog.save();

    const processingTime = Date.now() - startTime;
    console.log(`✅ Webhook processed in ${processingTime}ms:`, {
      eventType,
      handled: result.handled,
      orderId: result.orderId
    });

    // Step 6: Send response (always 200 to prevent Razorpay retries)
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      eventType,
      handled: result.handled,
      processingTime: `${processingTime}ms`
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);

    // Update webhook log with error
    if (webhookLog) {
      webhookLog.status = 'failed';
      webhookLog.error = {
        message: error.message,
        stack: error.stack
      };
      webhookLog.retryCount += 1;
      await webhookLog.save();
    }

    // Still return 200 to prevent retries for unrecoverable errors
    res.status(200).json({
      success: false,
      error: 'Webhook processing failed',
      message: error.message
    });
  }
};

/**
 * Handle payment.authorized event
 */
const handlePaymentAuthorized = async (event, webhookLog) => {
  try {
    const payment = event.payload.payment.entity;

    const order = await Order.findOne({
      'paymentDetails.razorpayOrderId': payment.order_id
    });

    if (!order) {
      console.log(`⚠️ Order not found for payment.authorized: ${payment.order_id}`);
      return { handled: false, message: 'Order not found' };
    }

    // Check idempotency
    if (order.hasProcessedEvent(event.payload.payment.entity.id)) {
      console.log(`⚠️ Duplicate event detected: ${event.payload.payment.entity.id}`);
      webhookLog.status = 'duplicate';
      await webhookLog.save();
      return { handled: true, message: 'Duplicate event', orderId: order._id };
    }

    // Update order
    order.paymentDetails.razorpayPaymentId = payment.id;
    order.paymentDetails.status = 'pending'; // Authorized but not captured
    order.paymentDetails.paymentType = payment.method;
    order.addWebhookEvent(payment.id, 'payment.authorized', event.payload);

    await order.save();

    webhookLog.orderId = order._id;
    webhookLog.razorpayOrderId = payment.order_id;
    webhookLog.razorpayPaymentId = payment.id;
    await webhookLog.save();

    console.log(`✅ Payment authorized: ${payment.id}`);
    return { handled: true, orderId: order._id };

  } catch (error) {
    console.error('❌ Error handling payment.authorized:', error);
    return { handled: false, error: { message: error.message, stack: error.stack } };
  }
};

/**
 * Handle payment.captured event (MOST IMPORTANT)
 */
const handlePaymentCaptured = async (event, webhookLog) => {
  try {
    const payment = event.payload.payment.entity;

    const order = await Order.findOne({
      'paymentDetails.razorpayOrderId': payment.order_id
    }).populate('products.product user');

    if (!order) {
      console.log(`⚠️ Order not found for payment.captured: ${payment.order_id}`);
      return { handled: false, message: 'Order not found' };
    }

    // Check idempotency
    if (order.hasProcessedEvent(payment.id)) {
      console.log(`⚠️ Duplicate payment.captured event: ${payment.id}`);
      webhookLog.status = 'duplicate';
      await webhookLog.save();
      return { handled: true, message: 'Duplicate event', orderId: order._id };
    }

    // Update order payment details
    order.paymentDetails.razorpayPaymentId = payment.id;
    order.paymentDetails.status = 'completed';
    order.paymentDetails.captured = true;
    order.paymentDetails.paymentType = payment.method;
    order.orderStatus = 'processing';
    order.paymentReconciled = true;
    order.reconciledAt = new Date();
    order.addWebhookEvent(payment.id, 'payment.captured', event.payload);

    // Deduct stock (idempotent - only once)
    if (!order.stockDeducted) {
      for (const item of order.products) {
        const product = await Product.findById(item.product._id);
        if (product) {
          product.stock = Math.max(0, product.stock - item.quantity);
          await product.save();
          console.log(`📦 Stock updated for ${product.name}: ${product.stock}`);
        }
      }
      order.stockDeducted = true;
    }

    await order.save();

    webhookLog.orderId = order._id;
    webhookLog.razorpayOrderId = payment.order_id;
    webhookLog.razorpayPaymentId = payment.id;
    await webhookLog.save();

    // Send confirmation emails
    try {
      const user = order.user;
      const emailData = {
        orderId: order._id.toString(),
        customerName: user.username,
        customerEmail: user.email,
        customerPhone: order.shippingAddress.phone || 'Not provided',
        products: order.products.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.price,
          brand: item.product.brand,
          customization: item.customisation
            ? flattenCustomization(item.customisation)
            : null,
          imageUrl: item.product.images?.[0] || null
        })),
        totalAmount: order.totalAmount,
        shippingAddress: {
          name: order.shippingAddress.name || 'Not provided',
          street: order.shippingAddress.address,
          city: order.shippingAddress.city,
          state: '',
          pincode: order.shippingAddress.postalCode,
          phone: order.shippingAddress.phone || 'Not provided'
        },
        paymentId: payment.id,
        paymentStatus: 'completed',
        orderStatus: order.orderStatus
      };

      await sendOrderConfirmation(user.email, emailData);

      const adminEmail = process.env.ADMIN_EMAIL || 'olivepixel.designs@gmail.com';
      await sendAdminOrderNotification(adminEmail, emailData);

      console.log(`📧 Confirmation emails sent for order ${order._id}`);
    } catch (emailError) {
      console.error('❌ Email notification failed:', emailError);
      // Don't fail webhook processing if email fails
    }

    console.log(`✅ Payment captured successfully: ${payment.id}`);
    return { handled: true, orderId: order._id };

  } catch (error) {
    console.error('❌ Error handling payment.captured:', error);
    return { handled: false, error: { message: error.message, stack: error.stack } };
  }
};

/**
 * Handle payment.failed event
 */
const handlePaymentFailed = async (event, webhookLog) => {
  try {
    const payment = event.payload.payment.entity;

    const order = await Order.findOne({
      'paymentDetails.razorpayOrderId': payment.order_id
    }).populate('user');

    if (!order) {
      console.log(`⚠️ Order not found for payment.failed: ${payment.order_id}`);
      return { handled: false, message: 'Order not found' };
    }

    // Check idempotency
    if (order.hasProcessedEvent(payment.id)) {
      console.log(`⚠️ Duplicate payment.failed event: ${payment.id}`);
      webhookLog.status = 'duplicate';
      await webhookLog.save();
      return { handled: true, message: 'Duplicate event', orderId: order._id };
    }

    // Update order
    order.paymentDetails.razorpayPaymentId = payment.id;
    order.paymentDetails.status = 'failed';
    order.orderStatus = 'Payment Failed';
    order.addWebhookEvent(payment.id, 'payment.failed', event.payload);

    await order.save();

    webhookLog.orderId = order._id;
    webhookLog.razorpayOrderId = payment.order_id;
    webhookLog.razorpayPaymentId = payment.id;
    await webhookLog.save();

    // Send failure notification
    try {
      await sendPaymentFailedEmail(order.user.email, {
        orderId: order._id.toString(),
        customerName: order.user.username,
        reason: payment.error_description || 'Payment processing failed'
      });
    } catch (emailError) {
      console.error('❌ Failed to send payment failure email:', emailError);
    }

    console.log(`❌ Payment failed: ${payment.id}`);
    return { handled: true, orderId: order._id };

  } catch (error) {
    console.error('❌ Error handling payment.failed:', error);
    return { handled: false, error: { message: error.message, stack: error.stack } };
  }
};

/**
 * Handle order.paid event
 */
const handleOrderPaid = async (event, webhookLog) => {
  try {
    const orderEntity = event.payload.order.entity;

    const order = await Order.findOne({
      'paymentDetails.razorpayOrderId': orderEntity.id
    });

    if (!order) {
      console.log(`⚠️ Order not found for order.paid: ${orderEntity.id}`);
      return { handled: false, message: 'Order not found' };
    }

    // Check idempotency
    if (order.hasProcessedEvent(orderEntity.id)) {
      console.log(`⚠️ Duplicate order.paid event: ${orderEntity.id}`);
      webhookLog.status = 'duplicate';
      await webhookLog.save();
      return { handled: true, message: 'Duplicate event', orderId: order._id };
    }

    // Mark as reconciled
    order.paymentReconciled = true;
    order.reconciledAt = new Date();
    order.addWebhookEvent(orderEntity.id, 'order.paid', event.payload);

    await order.save();

    webhookLog.orderId = order._id;
    webhookLog.razorpayOrderId = orderEntity.id;
    await webhookLog.save();

    console.log(`✅ Order paid confirmed: ${orderEntity.id}`);
    return { handled: true, orderId: order._id };

  } catch (error) {
    console.error('❌ Error handling order.paid:', error);
    return { handled: false, error: { message: error.message, stack: error.stack } };
  }
};

/**
 * Handle refund.created event
 */
const handleRefundCreated = async (event, webhookLog) => {
  try {
    const refund = event.payload.refund.entity;

    const order = await Order.findOne({
      'paymentDetails.razorpayPaymentId': refund.payment_id
    });

    if (!order) {
      console.log(`⚠️ Order not found for refund: ${refund.payment_id}`);
      return { handled: false, message: 'Order not found' };
    }

    // Check idempotency
    if (order.hasProcessedEvent(refund.id)) {
      console.log(`⚠️ Duplicate refund.created event: ${refund.id}`);
      webhookLog.status = 'duplicate';
      await webhookLog.save();
      return { handled: true, message: 'Duplicate event', orderId: order._id };
    }

    // Add refund record
    order.paymentDetails.refunds.push({
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
      createdAt: new Date(refund.created_at * 1000)
    });

    order.addWebhookEvent(refund.id, 'refund.created', event.payload);
    await order.save();

    webhookLog.orderId = order._id;
    webhookLog.razorpayPaymentId = refund.payment_id;
    await webhookLog.save();

    console.log(`💰 Refund created: ${refund.id}`);
    return { handled: true, orderId: order._id };

  } catch (error) {
    console.error('❌ Error handling refund.created:', error);
    return { handled: false, error: { message: error.message, stack: error.stack } };
  }
};

/**
 * Handle refund.processed event
 */
const handleRefundProcessed = async (event, webhookLog) => {
  try {
    const refund = event.payload.refund.entity;

    const order = await Order.findOne({
      'paymentDetails.razorpayPaymentId': refund.payment_id
    }).populate('user products.product');

    if (!order) {
      console.log(`⚠️ Order not found for refund: ${refund.payment_id}`);
      return { handled: false, message: 'Order not found' };
    }

    // Check idempotency
    if (order.hasProcessedEvent(refund.id + '_processed')) {
      console.log(`⚠️ Duplicate refund.processed event: ${refund.id}`);
      webhookLog.status = 'duplicate';
      await webhookLog.save();
      return { handled: true, message: 'Duplicate event', orderId: order._id };
    }

    // Update refund status
    const refundRecord = order.paymentDetails.refunds.find(r => r.refundId === refund.id);
    if (refundRecord) {
      refundRecord.status = 'processed';
      refundRecord.processedAt = new Date();
    }

    // Update payment status
    const totalRefunded = order.paymentDetails.refunds
      .filter(r => r.status === 'processed')
      .reduce((sum, r) => sum + r.amount, 0);

    if (totalRefunded >= order.totalAmount) {
      order.paymentDetails.status = 'refunded';
      order.orderStatus = 'cancelled';
    } else {
      order.paymentDetails.status = 'partially_refunded';
    }

    // Restore stock
    for (const item of order.products) {
      const product = await Product.findById(item.product._id);
      if (product) {
        product.stock += item.quantity;
        await product.save();
        console.log(`📦 Stock restored for ${product.name}: ${product.stock}`);
      }
    }

    order.addWebhookEvent(refund.id + '_processed', 'refund.processed', event.payload);
    await order.save();

    webhookLog.orderId = order._id;
    webhookLog.razorpayPaymentId = refund.payment_id;
    await webhookLog.save();

    console.log(`✅ Refund processed: ${refund.id}`);
    return { handled: true, orderId: order._id };

  } catch (error) {
    console.error('❌ Error handling refund.processed:', error);
    return { handled: false, error: { message: error.message, stack: error.stack } };
  }
};

/**
 * Handle refund.failed event
 */
const handleRefundFailed = async (event, webhookLog) => {
  try {
    const refund = event.payload.refund.entity;

    const order = await Order.findOne({
      'paymentDetails.razorpayPaymentId': refund.payment_id
    });

    if (!order) {
      return { handled: false, message: 'Order not found' };
    }

    // Update refund status
    const refundRecord = order.paymentDetails.refunds.find(r => r.refundId === refund.id);
    if (refundRecord) {
      refundRecord.status = 'failed';
    }

    order.addWebhookEvent(refund.id + '_failed', 'refund.failed', event.payload);
    await order.save();

    webhookLog.orderId = order._id;
    webhookLog.razorpayPaymentId = refund.payment_id;
    await webhookLog.save();

    console.log(`❌ Refund failed: ${refund.id}`);
    return { handled: true, orderId: order._id };

  } catch (error) {
    console.error('❌ Error handling refund.failed:', error);
    return { handled: false, error: { message: error.message, stack: error.stack } };
  }
};

/**
 * Handle payment.dispute.created event
 */
const handleDisputeCreated = async (event, webhookLog) => {
  try {
    const dispute = event.payload.dispute.entity;

    // Log dispute for admin review
    console.error(`🚨 DISPUTE CREATED: ${dispute.id} for payment ${dispute.payment_id}`);

    // TODO: Send urgent email to admin
    // TODO: Create admin notification in dashboard

    webhookLog.razorpayPaymentId = dispute.payment_id;
    await webhookLog.save();

    return { handled: true, message: 'Dispute logged for admin review' };

  } catch (error) {
    console.error('❌ Error handling dispute.created:', error);
    return { handled: false, error: { message: error.message, stack: error.stack } };
  }
};

/**
 * Get webhook logs (admin only)
 * @route GET /api/webhooks/logs
 * @access Private (Admin)
 */
const getWebhookLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status;
    const eventType = req.query.eventType;

    const filter = {};
    if (status) filter.status = status;
    if (eventType) filter.eventType = eventType;

    const logs = await WebhookLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('orderId', 'totalAmount orderStatus user');

    const total = await WebhookLog.countDocuments(filter);

    res.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching webhook logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook logs'
    });
  }
};

module.exports = {
  handleRazorpayWebhook,
  getWebhookLogs
};
