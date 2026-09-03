const User = require('./user.model');
const Product = require('./product.model');
const Order = require('./order.model');
const Coupon = require('./coupon.model');
const { Setting, initializeSettings } = require('./setting.model');
const WebhookLog = require('./webhookLog.model');

// Initialize settings on startup
// Initialize settings moved to server start
// initializeSettings();
const Review = require('./review.model');

module.exports = {
  User,
  Product,
  Order,
  Coupon,
  Setting,
  Review,
  WebhookLog
};
