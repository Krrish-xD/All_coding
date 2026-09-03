const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
require('./config/passport');
const { seedDefaultCustomizations } = require('./seed/seedCustomizations');
const { updateProductsWithDefaults } = require('./seed/updateProductsWithCustomizations');
require('./services/paymentService');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ms-enterprises-ecommerce', {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${mongoose.connection.name}`);

    // Initialize settings
    const { initializeSettings } = require('./models/setting.model');
    await initializeSettings();
    console.log('⚙️  Settings initialized');
  } catch (error) {
    console.error('❌ MongoDB Connection FAILED:', error.message);
    process.exit(1);
  }
};

// Connect to database
// connectDB(); // calling this later to ensure connection before server starts

// ============================================================================
// SEED DATA (OPTIONAL - UNCOMMENT IF NEEDED)
// ============================================================================

/*
(async () => {
  await seedDefaultCustomizations();
  await updateProductsWithDefaults();
})();
*/

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// ============================================================================
// SESSION CONFIGURATION
// ============================================================================

app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/ms-enterprises-ecommerce',
    touchAfter: 24 * 3600, // Lazy session update
    mongoOptions: {
      serverSelectionTimeoutMS: 5000
    }
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? '.themsenterprises.com' : undefined
  },
  name: 'sessionId' // Custom session cookie name
}));

// ============================================================================
// PASSPORT INITIALIZATION
// ============================================================================

app.use(passport.initialize());
app.use(passport.session());

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

const getAllowedOrigins = () => {
  const origins = [
    'https://themsenterprises.com',           // Root domain (Primary)
    'https://www.themsenterprises.com',        // WWW subdomain
    'https://app.themsenterprises.com',        // App subdomain (Legacy)
    'http://localhost:3000',                   // React dev server
    'http://localhost:5173',                   // Vite dev server
    'http://localhost:5174',                   // Vite alternate
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ];

  // Add custom frontend URL from env
  if (process.env.FRONTEND_URL && !origins.includes(process.env.FRONTEND_URL)) {
    origins.push(process.env.FRONTEND_URL);
  }

  return origins;
};

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (mobile apps, Postman, etc.)
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
    'Origin'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// ============================================================================
// RATE LIMITING
// ============================================================================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // More permissive in dev
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip for health checks and localhost in development
    const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
    const isHealthCheck = req.path === '/health' || req.path === '/';
    return isHealthCheck || (process.env.NODE_ENV === 'development' && isLocalhost);
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
// BODY PARSING MIDDLEWARE
// ============================================================================

app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    // Store raw body for webhook verification
    req.rawBody = buf.toString('utf-8');
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// REQUEST LOGGING (DEVELOPMENT)
// ============================================================================

if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      console.log('  Body:', req.body);
    }
    next();
  });
}

// ============================================================================
// ROUTES
// ============================================================================

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const reviewRoutes = require('./routes/review.routes');
const couponRoutes = require('./routes/coupon.routes');
const cartRoutes = require('./routes/cart.routes');
const adminRoutes = require('./routes/admin.routes');
const adminAuthRoutes = require('./routes/adminAuth.routes');
const adminDashboardRoutes = require('./routes/adminDashboard.routes');
const adminCouponRoutes = require('./routes/adminCoupon.routes');
const customizationRoutes = require('./routes/customization.routes');
const paymentRoutes = require('./routes/payment.routes');
const settingsRoutes = require('./routes/settings.routes');
const webhookRoutes = require('./routes/webhook.routes');

// Mount routes
app.use('/api/settings', settingsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin2009/coupons', adminCouponRoutes);
app.use('/api/admin2009', adminAuthRoutes);
app.use('/api/admin2009', adminDashboardRoutes);
app.use('/api/customizations', customizationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/webhooks', webhookRoutes);

// ============================================================================
// BASIC ROUTES
// ============================================================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MS Enterprises & Jaksh E-commerce API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'https://themsenterprises.com',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      reviews: '/api/reviews',
      cart: '/api/cart',
      payments: '/api/payments',
      customizations: '/api/customizations',
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
    databaseName: mongoose.connection.name,
    environment: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL,
    allowedOrigins: getAllowedOrigins(),
    nodeVersion: process.version
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

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: 'Duplicate field value',
      message: `${field} already exists`
    });
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format',
      message: `Invalid ${err.path}: ${err.value}`
    });
  }

  // JWT errors
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

  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS Error',
      message: 'Origin not allowed by CORS policy'
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// PROCESS ERROR HANDLERS
// ============================================================================

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Unhandled Rejection: ${err.message}`);
  console.error(err);
  // Close server & exit process
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`❌ Uncaught Exception: ${err.message}`);
  console.error(err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Closing HTTP server gracefully...');
  if (server) {
    server.close(() => {
      console.log('✅ HTTP server closed');
      mongoose.connection.close(false, () => {
        console.log('✅ MongoDB connection closed');
        process.exit(0);
      });
    });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

let server; // Declare server outside to be accessible in error handlers

// Connect to DB first, then start server
connectDB().then(() => {
  server = app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 MS Enterprises E-commerce API Server Started');
    console.log('='.repeat(60));
    console.log(`📍 Port:              ${PORT}`);
    console.log(`🌍 Environment:       ${process.env.NODE_ENV || 'development'}`);
    console.log(`📱 Frontend URL:      ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`🔗 API Base URL:      http://localhost:${PORT}`);
    console.log(`📊 Health Check:      http://localhost:${PORT}/health`);
    console.log(`🗄️  Database:          ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
    console.log('='.repeat(60));
    console.log('\n✅ Server is ready to accept requests\n');
  });
});

module.exports = app;