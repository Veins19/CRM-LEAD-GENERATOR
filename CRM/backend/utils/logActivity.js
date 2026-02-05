// backend/utils/logActivity.js

const Activity = require('../models/Activity');

/**
 * Atomic activity logger
 * @param {ObjectId} leadId - Lead associated with activity
 * @param {ObjectId} userId - User performing the activity
 * @param {String} type - Type of activity (Call, Email, Create, Edit, etc.)
 * @param {String} details - Description of the activity
 * @param {String} statusBefore - Optional: Previous status (for status changes)
 * @param {String} statusAfter - Optional: New status (for status changes)
 * @returns {Promise<Activity|null>} Created activity or null if failed
 */
const logActivity = async (leadId, userId, type, details, statusBefore = null, statusAfter = null) => {
  try {
    const activity = new Activity({
      lead: leadId,
      user: userId,
      type,
      details,
      statusBefore,
      statusAfter,
    });

    await activity.save();
    console.log(`✅ Activity logged: ${type} for lead ${leadId} by user ${userId}`);
    return activity;
  } catch (error) {
    console.error('❌ Error logging activity:', error.message);
    // Don't throw error - activity logging failure shouldn't break main operations
    return null;
  }
};

module.exports = logActivity;
