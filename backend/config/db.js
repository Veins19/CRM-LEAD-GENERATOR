import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/**
 * Connect to MongoDB database for MediFlow
 * Handles connection with error handling, logging, and retry logic
 */
const connectDB = async () => {
  try {
    // Connection options for better stability
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    logger.success(`MongoDB Connected: ${conn.connection.host}`);
    logger.info(`📊 Database Name: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB Error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB Disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.success('MongoDB Reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('🛑 MongoDB connection closed due to app termination');
        process.exit(0);
      } catch (err) {
        logger.error('Error during MongoDB shutdown:', err.message);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('MongoDB Connection Failed:', error.message);
    logger.warn('💡 Make sure MongoDB is running locally on port 27017');
    logger.warn('💡 Check if MongoDB Compass is connected');
    logger.warn('💡 Verify MONGODB_URI in .env file');
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
