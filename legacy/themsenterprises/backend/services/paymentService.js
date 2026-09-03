const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Setting } = require('../models');

// Get Razorpay instance dynamically based on settings
const getRazorpayInstance = async () => {
  try {
    const paymentSettings = await Setting.findOne({ key: 'paymentGatewayLive' });
    // Default to LIVE in production if setting is missing, otherwise default to TEST
    const isLive = paymentSettings ? paymentSettings.value : (process.env.NODE_ENV === 'production');

    const key_id = isLive ? process.env.RAZORPAY_KEY_ID : process.env.RAZORPAY_TEST_KEY_ID;
    const key_secret = isLive ? process.env.RAZORPAY_KEY_SECRET : process.env.RAZORPAY_TEST_KEY_SECRET;

    if (!key_id || !key_secret) {
      throw new Error('Razorpay API keys are not configured for the selected mode.');
    }

    console.log(`✅ Initializing Razorpay in ${isLive ? 'Live' : 'Test'} mode.`);
    return new Razorpay({ key_id, key_secret });

  } catch (error) {
    console.error('❌ Failed to get Razorpay instance:', error);
    return null;
  }
};

// Get public key for frontend
const getRazorpayKeyId = async () => {
  const paymentSettings = await Setting.findOne({ key: 'paymentGatewayLive' });
  const isLive = paymentSettings ? paymentSettings.value : (process.env.NODE_ENV === 'production');
  return isLive ? process.env.RAZORPAY_KEY_ID : process.env.RAZORPAY_TEST_KEY_ID;
}

// Create Razorpay order
const createRazorpayOrder = async (amount, currency = 'INR', receipt, notes = {}) => {
  try {
    const razorpayInstance = await getRazorpayInstance();
    if (!razorpayInstance) throw new Error('Could not initialize Razorpay.');

    const options = {
      amount: Math.round(amount * 100),
      currency,
      receipt,
      notes,
      payment_capture: 1, // ✅ ADDED - Auto-capture payments (CRITICAL FIX)
    };

    console.log('🔄 Creating Razorpay order with options:', {
      amount: options.amount,
      currency: options.currency,
      receipt: options.receipt,
      payment_capture: options.payment_capture
    });

    const order = await razorpayInstance.orders.create(options);

    console.log('✅ Razorpay order created:', {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status
    });

    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status, // ✅ ADDED
    };
  } catch (error) {
    console.error('❌ Razorpay order creation failed:', error);
    return { success: false, error: error.message };
  }
};

// Verify Razorpay payment signature
const verifyPaymentSignature = async (razorpayOrderId, razorpayPaymentId, signature) => {
  try {
    const paymentSettings = await Setting.findOne({ key: 'paymentGatewayLive' });
    const isLive = paymentSettings ? paymentSettings.value : (process.env.NODE_ENV === 'production');
    const key_secret = isLive ? process.env.RAZORPAY_KEY_SECRET : process.env.RAZORPAY_TEST_KEY_SECRET;

    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(body.toString())
      .digest('hex');

    const isValidSignature = expectedSignature === signature;

    if (isValidSignature) {
      console.log('✅ Payment signature verified successfully');
      return { success: true, isValid: true };
    } else {
      console.log('❌ Invalid payment signature');
      console.log('   Expected:', expectedSignature); // ✅ ADDED - Debug logging
      console.log('   Received:', signature);
      return { success: true, isValid: false };
    }
  } catch (error) {
    console.error('❌ Payment signature verification failed:', error);
    return { success: false, error: error.message };
  }
};

// Get payment details
const getPaymentDetails = async (paymentId) => {
  try {
    const razorpayInstance = await getRazorpayInstance();
    if (!razorpayInstance) throw new Error('Could not initialize Razorpay.');

    const payment = await razorpayInstance.payments.fetch(paymentId);
    console.log('✅ Payment details fetched:', {
      id: payment.id,
      status: payment.status,
      captured: payment.captured,
      method: payment.method
    });

    return {
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        captured: payment.captured,
        description: payment.description,
        created_at: payment.created_at,
        order_id: payment.order_id,
      },
    };
  } catch (error) {
    console.error('❌ Failed to fetch payment details:', error);
    return { success: false, error: error.message };
  }
};

// Refund payment
const refundPayment = async (paymentId, amount, notes = {}) => {
  try {
    const razorpayInstance = await getRazorpayInstance();
    if (!razorpayInstance) throw new Error('Could not initialize Razorpay.');

    const refund = await razorpayInstance.payments.refund(paymentId, {
      amount: Math.round(amount * 100),
      notes,
    });

    console.log('✅ Payment refund initiated:', refund.id);
    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
    };
  } catch (error) {
    console.error('❌ Payment refund failed:', error);
    return { success: false, error: error.message };
  }
};

// Calculate order amount with tax
const calculateOrderAmount = (subtotal, taxRate = 0) => {
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;
  return { subtotal, taxAmount, totalAmount, taxRate };
};

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  getPaymentDetails,
  refundPayment,
  calculateOrderAmount,
  getRazorpayKeyId,
  getRazorpayInstance,
};