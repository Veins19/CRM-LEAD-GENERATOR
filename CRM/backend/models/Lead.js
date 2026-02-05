// backend/models/Lead.js

const mongoose = require('mongoose');

// Define Lead Schema
const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Lead name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please enter a valid email address'],
    },
    contact: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    company: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      // Allow both legacy "Won" and new "Converted" as final-success states
      enum: ['New', 'Contacted', 'Qualified', 'Lost', 'Won', 'Converted'],
      default: 'New',
    },
    // Added tags field as requested (e.g., "new lead", "in progress", "successful")
    tags: {
      type: [String],
      default: [],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: '',
    },
    filePath: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Atomic error logging for save attempts
leadSchema.post('save', function (error, doc, next) {
  if (error) {
    console.error('❌ Error saving lead:', error.message);
    next(error);
  } else {
    next();
  }
});

// Atomic error logging for update attempts
leadSchema.post('findOneAndUpdate', function (error, doc, next) {
  if (error) {
    console.error('❌ Error updating lead:', error.message);
    next(error);
  } else {
    next();
  }
});

module.exports = mongoose.model('Lead', leadSchema);
