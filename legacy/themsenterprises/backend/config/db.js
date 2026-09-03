const mongoose = require('mongoose');

// Global connection variable to reuse across Lambda invocations
let cachedConnection = null;

const connectDB = async () => {
  try {
    // Check if MONGO_URI exists
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI is not defined in environment variables');
      throw new Error('MONGO_URI environment variable is required');
    }

    // Return cached connection if available and still connected
    if (cachedConnection && mongoose.connection.readyState === 1) {
      console.log('✅ Using cached MongoDB connection');
      return cachedConnection;
    }

    console.log('🔄 Connecting to MongoDB...');
    console.log('📍 MongoDB URI:', process.env.MONGO_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials

    // Connect to MongoDB with Lambda-optimized settings
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Lambda-optimized connection options
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
    });

    cachedConnection = conn;
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`🏠 Host: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    return conn;

  } catch (err) {
    console.error('❌ MongoDB Connection Error:');
    console.error('📋 Error Message:', err.message);

    if (err.message.includes('ECONNREFUSED')) {
      console.log('💡 Possible solutions:');
      console.log('   1. Make sure MongoDB is running locally');
      console.log('   2. Check if MongoDB service is started');
      console.log('   3. Verify the connection string in .env file');
    }

    // In Lambda, don't exit - let the function handle the error
    throw err;
  }
};

module.exports = connectDB;