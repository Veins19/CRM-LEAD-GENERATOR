// CRM/backend/models/Activity.js

const mongoose = require('mongoose');

// Define Activity Schema
const activitySchema = new mongoose.Schema({
    lead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        required: [true, 'Associated lead is required'],
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User performing activity is required'],
    },
    type: {
        type: String,
        enum: [
            'Call',
            'Email',
            'Meeting',
            'Note',
            'Status Change',
            'Follow-Up',
            'Task',
            'Other',
            'Create',
            'Edit',
            'Archive',
            'Restore',
            'Delete'
        ],
        required: [true, 'Activity type is required'],
    },
    details: {
        type: String,
        required: [true, 'Activity details are required'],
        trim: true,
    },
    statusBefore: {
        type: String,
        trim: true,
    },
    statusAfter: {
        type: String,
        trim: true,
    }
}, { timestamps: true });

// Error logging for save attempts
activitySchema.post('save', function(error, doc, next) {
    if (error) {
        console.error('❌ Error saving activity:', error.message);
        next(error);
    } else {
        next();
    }
});

module.exports = mongoose.model('Activity', activitySchema);
