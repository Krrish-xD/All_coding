const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        customisation: {
          type: Object,
          default: {}
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    shippingAddress: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentDetails: {
      paymentMethod: {
        type: String,
        required: true,
        enum: ['Razorpay'], // ✅ This is the payment gateway
      },
      paymentType: { // ✅ RENAMED from duplicate paymentMethod - this is the payment type (card, upi, etc.)
        type: String,
        enum: ['card', 'netbanking', 'wallet', 'upi', 'emi', 'cardless_emi', 'paylater']
      },
      razorpayOrderId: { 
        type: String,
        index: true
      },
      razorpayPaymentId: { 
        type: String,
        index: true 
      },
      razorpaySignature: { 
        type: String 
      },
      paymentResult: {
        id: { type: String },
        status: { type: String },
        update_time: { type: String },
        email_address: { type: String },
      },
      status: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'],
        default: 'pending',
      },
      amount: { type: Number },
      currency: { type: String, default: 'INR' },
      captured: { type: Boolean, default: false },
      breakdown: {
        subtotal: { type: Number },
        shipping: { type: Number },
        tax: { type: Number },
        couponDiscount: { type: Number }
      },
      refunds: [{
        refundId: String,
        amount: Number,
        status: String,
        createdAt: Date,
        processedAt: Date
      }]
    },
    orderStatus: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'Payment Failed'],
      default: 'pending',
    },
    trackingLink: {
      type: String,
    },
    deliveredAt: {
      type: Date,
    },
    coupon: {
      type: String,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    // Webhook tracking
    webhookEvents: [{
      eventId: { type: String, unique: true, sparse: true },
      eventType: String,
      processedAt: { type: Date, default: Date.now },
      payload: Object
    }],
    // Payment reconciliation
    paymentReconciled: {
      type: Boolean,
      default: false
    },
    reconciledAt: {
      type: Date
    },
    // Stock management
    stockDeducted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
orderSchema.index({ 'paymentDetails.razorpayOrderId': 1 });
orderSchema.index({ 'paymentDetails.razorpayPaymentId': 1 });
orderSchema.index({ 'webhookEvents.eventId': 1 });
orderSchema.index({ user: 1, createdAt: -1 });

// Method to check if event already processed (idempotency)
orderSchema.methods.hasProcessedEvent = function(eventId) {
  return this.webhookEvents.some(event => event.eventId === eventId);
};

// Method to add webhook event
orderSchema.methods.addWebhookEvent = function(eventId, eventType, payload) {
  this.webhookEvents.push({
    eventId,
    eventType,
    processedAt: new Date(),
    payload
  });
};

module.exports = mongoose.model('Order', orderSchema);