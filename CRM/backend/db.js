// backend/db.js

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crm';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[DB] MongoDB connected:', MONGO_URI);
  } catch (error) {
    console.error('[DB] MongoDB connection error:', error.message);
    process.exit(1); // Kill process if DB fails
  }
};

module.exports = connectDB;
