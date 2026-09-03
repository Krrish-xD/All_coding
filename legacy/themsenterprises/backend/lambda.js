const serverless = require('serverless-http');
const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/db');

// Global flag to track if DB is connected
let isDbConnected = false;

// Ensure environment variables are set (fallback for Lambda)
if (!process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL = 'https://themsenterprises.com';
}

if (!process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS = 'https://themsenterprises.com,https://www.themsenterprises.com,https://app.themsenterprises.com';
}

// Initialize database connection
const initializeDB = async () => {
  if (!isDbConnected) {
    try {
      await connectDB();
      isDbConnected = true;
      console.log('✅ Database connection established for Lambda');

      const { initializeSettings } = require('./models/setting.model');
      await initializeSettings();
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      isDbConnected = false;
    }
  }
};

// Get allowed CORS origins
const getAllowedOrigins = () => {
  const origins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [
      'https://themsenterprises.com',
      'https://www.themsenterprises.com',
      'https://app.themsenterprises.com'
    ];
  return origins;
};

// Create the serverless handler with proper options for body parsing
const serverlessHandler = serverless(app, {
  request: (request, event, context) => {
    // Fix for Lambda body parsing
    if (event.body) {
      // Check if body is base64 encoded
      if (event.isBase64Encoded) {
        request.body = Buffer.from(event.body, 'base64').toString('utf-8');
      } else if (typeof event.body === 'string') {
        request.body = event.body;
      }

      // manual JSON parsing removed to allow express.json() to handle it and capture rawBody
      // if (request.headers['content-type'] && request.headers['content-type'].includes('application/json')) {
      //   try {
      //     if (typeof request.body === 'string') {
      //       request.body = JSON.parse(request.body);
      //     }
      //   } catch (e) {
      //     console.error('Error parsing JSON body:', e);
      //   }
      // }
    }

    // Store request context for Lambda-specific info
    request.lambdaContext = context;
    request.lambdaEvent = event;

    // Log for debugging
    console.log('📥 Processed Request:', {
      path: request.path,
      method: request.method,
      hasBody: !!request.body,
      contentType: request.headers['content-type'],
      origin: request.headers.origin
    });
  },
  response: (response, event, context) => {
    // Ensure CORS headers are always present
    const origin = event.headers?.origin || event.headers?.Origin;
    const allowedOrigins = getAllowedOrigins();

    if (origin && allowedOrigins.includes(origin)) {
      response.headers = {
        ...response.headers,
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
      };
    } else if (!origin) {
      // For non-browser requests (like webhooks)
      response.headers = {
        ...response.headers,
        'Access-Control-Allow-Origin': allowedOrigins[0],
        'Access-Control-Allow-Credentials': 'true',
      };
    }
  }
});

// Lambda handler with database initialization
const handler = async (event, context) => {
  // Set callbackWaitsForEmptyEventLoop to false to prevent Lambda from waiting
  context.callbackWaitsForEmptyEventLoop = false;

  console.log('📥 Lambda Event:', JSON.stringify({
    path: event.path,
    method: event.httpMethod,
    body: event.body ? 'Has body' : 'No body',
    isBase64Encoded: event.isBase64Encoded,
    contentType: event.headers?.['content-type'],
    origin: event.headers?.origin,
    authorization: event.headers?.authorization ? 'Has auth' : 'No auth'
  }));

  try {
    // Ensure database connection is established
    await initializeDB();

    // Check if DB is connected
    if (!isDbConnected) {
      const allowedOrigins = getAllowedOrigins();
      const origin = event.headers?.origin || event.headers?.Origin;

      return {
        statusCode: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          success: false,
          error: 'Service Unavailable',
          message: 'Database connection failed'
        })
      };
    }

    // Process the request with the configured handler
    const response = await serverlessHandler(event, context);

    console.log('📤 Lambda Response:', {
      statusCode: response.statusCode,
      hasHeaders: !!response.headers,
      hasCORS: !!response.headers['Access-Control-Allow-Origin']
    });

    return response;
  } catch (error) {
    console.error('❌ Lambda handler error:', error);

    const allowedOrigins = getAllowedOrigins();
    const origin = event.headers?.origin || event.headers?.Origin;

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
      })
    };
  }
};

module.exports.handler = handler;