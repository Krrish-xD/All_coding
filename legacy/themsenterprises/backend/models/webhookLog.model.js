const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    eventType: {
      type: String,
      required: true,
      index: true
    },
    payload: {
      type: Object,
      required: true
    },
    status: {
      type: String,
      enum: ['received', 'processing', 'processed', 'failed', 'duplicate'],
      default: 'received',
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      index: true
    },
    razorpayOrderId: {
      type: String,
      index: true
    },
    razorpayPaymentId: {
      type: String,
      index: true
    },
    error: {
      message: String,
      stack: String
    },
    retryCount: {
      type: Number,
      default: 0
    },
    signature: {
      type: String
    },
    signatureVerified: {
      type: Boolean,
      default: false
    },
    processedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Auto-delete logs older than 90 days (compliance)
webhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = mongoose.model('WebhookLog', webhookLogSchema);