const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const passport = require('passport');
require('./config/passport');

const app = express();

// Trust proxy for Lambda/API Gateway
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

const getAllowedOrigins = () => {
  const origins = [
    'https://themsenterprises.com',
    'https://www.themsenterprises.com',
    'https://app.themsenterprises.com'
  ];

  if (process.env.ALLOWED_ORIGINS) {
    const envOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    origins.push(...envOrigins);
  }

  if (process.env.NODE_ENV === 'development') {
    origins.push('http://localhost:3000', 'http://localhost:5173');
  }

  return [...new Set(origins)];
};

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();

    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      console.warn(`✅ Allowed origins:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Amz-Date',
    'X-Api-Key',
    'X-Amz-Security-Token',
    'X-Razorpay-Signature'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// ============================================================================
// BODY PARSING MIDDLEWARE (CRITICAL FOR LAMBDA)
// ============================================================================

app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    req.rawBody = buf.toString('utf-8');
  }
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// DEBUG MIDDLEWARE (OPTIONAL - REMOVE IN PRODUCTION)
// ============================================================================

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      console.log(`📝 ${req.method} ${req.path}`);
      console.log('   Content-Type:', req.get('content-type'));
      console.log('   Body type:', typeof req.body);
      console.log('   Has body:', !!req.body);
      console.log('   Origin:', req.get('origin'));
    }
    next();
  });
}

// ============================================================================
// PASSPORT INITIALIZATION
// ============================================================================

app.use(passport.initialize());

// ============================================================================
// RATE LIMITING (OPTIMIZED FOR LAMBDA)
// ============================================================================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const forwarded = req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      'unknown';
    return `${userAgent.substring(0, 50)}:${forwarded}`;
  },
  skip: (req) => {
    return req.path === '/health' || req.path === '/';
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

app.use(limiter);

// ============================================================================
// ROUTES
// ============================================================================

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const reviewRoutes = require('./routes/review.routes');
const couponRoutes = require('./routes/coupon.routes'); // ✅ ADDED
const cartRoutes = require('./routes/cart.routes');
const adminRoutes = require('./routes/admin.routes');
const adminAuthRoutes = require('./routes/adminAuth.routes');
const adminDashboardRoutes = require('./routes/adminDashboard.routes');
const adminCouponRoutes = require('./routes/adminCoupon.routes'); // ✅ ADDED
const customizationRoutes = require('./routes/customization.routes');
const paymentRoutes = require('./routes/payment.routes');
const settingsRoutes = require('./routes/settings.routes'); // ✅ ADDED
const webhookRoutes = require('./routes/webhook.routes'); // ✅ MOVED HERE

// Mount routes
app.use('/api/settings', settingsRoutes); // ✅ ADDED
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes); // ✅ ADDED
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin2009/coupons', adminCouponRoutes); // ✅ ADDED
app.use('/api/admin2009', adminAuthRoutes);
app.use('/api/admin2009', adminDashboardRoutes);
app.use('/api/customizations', customizationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/webhooks', webhookRoutes); // ✅ ADDED

// ============================================================================
// BASIC ROUTES
// ============================================================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MS Enterprises & Jaksh E-commerce API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'production',
    frontendUrl: process.env.FRONTEND_URL || 'https://themsenterprises.com',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      reviews: '/api/reviews',
      coupons: '/api/coupons',
      cart: '/api/cart',
      payments: '/api/payments',
      customizations: '/api/customizations',
      settings: '/api/settings',
      webhooks: '/api/webhooks',
      admin: '/api/admin',
      adminAuth: '/api/admin2009',
      health: '/health'
    }
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'production',
    frontendUrl: process.env.FRONTEND_URL,
    allowedOrigins: getAllowedOrigins()
  });
});

// ============================================================================
// ERROR HANDLERS
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: {
      root: '/',
      health: '/health',
      api: '/api/*'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack:', err.stack);
  }

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: errors
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: 'Duplicate field value',
      message: `${field} already exists`
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format',
      message: `Invalid ${err.path}: ${err.value}`
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'Please login again'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      message: 'Your session has expired. Please login again'
    });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS Error',
      message: 'Origin not allowed by CORS policy'
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;