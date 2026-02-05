// backend/controllers/activityController.js

const Activity = require('../models/Activity');

/**
 * Get all activities with filters and pagination
 * GET /api/activities
 */
const getAllActivities = async (req, res) => {
  try {
    const {
      lead,
      user,
      type,
      page = 1,
      limit = 20,
      startDate,
      endDate,
      search,
    } = req.query;

    const query = {};

    // --- ROLE-BASED ACCESS CONTROL ---
    // If Executive, FORCE filter to their own ID
    if (req.user.role === 'Executive') {
      query.user = req.user._id;
    } 
    // If Admin, allow them to filter by any user if they want
    else if (user) {
      query.user = user;
    }

    // Filter by lead
    if (lead) {
      query.lead = lead;
    }

    // Filter by activity type
    if (type) {
      query.type = type;
    }

    // Search in details field
    if (search) {
      query.details = { $regex: search, $options: 'i' };
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const activities = await Activity.find(query)
      .populate('lead', 'name email company status')
      .populate('user', 'username email role')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Activity.countDocuments(query);

    console.log(`✅ Retrieved ${activities.length} activities (page ${page}) for ${req.user.role}`);

    res.status(200).json({
      success: true,
      activities,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalActivities: count,
    });
  } catch (error) {
    console.error('❌ Error fetching activities:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities',
      error: error.message,
    });
  }
};

/**
 * Get activity by ID
 * GET /api/activities/:id
 */
const getActivityById = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('lead', 'name email company status')
      .populate('user', 'username email role');

    if (!activity) {
      console.error('❌ Activity not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Activity not found',
      });
    }

    // Access Control: Executives can only view their own activities
    if (req.user.role === 'Executive' && activity.user._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }

    console.log(`✅ Retrieved activity: ${activity.type} for lead ${activity.lead?.name}`);

    res.status(200).json({
      success: true,
      activity,
    });
  } catch (error) {
    console.error('❌ Error fetching activity:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity',
      error: error.message,
    });
  }
};

/**
 * Create new activity (manual entry)
 * POST /api/activities
 */
const createActivity = async (req, res) => {
  try {
    const { lead, type, details, statusBefore, statusAfter } = req.body;

    // Validation
    if (!lead || !type || !details) {
      console.error('❌ Activity creation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Lead, type, and details are required',
      });
    }

    // Create activity
    const activity = new Activity({
      lead,
      user: req.user._id, // Force the logged-in user
      type,
      details,
      statusBefore,
      statusAfter,
    });

    await activity.save();

    console.log(`✅ Activity created: ${type} for lead ${lead}`);

    res.status(201).json({
      success: true,
      message: 'Activity created successfully',
      activity,
    });
  } catch (error) {
    console.error('❌ Error creating activity:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create activity',
      error: error.message,
    });
  }
};

/**
 * Update activity
 * PUT /api/activities/:id
 */
const updateActivity = async (req, res) => {
  try {
    const { type, details, statusBefore, statusAfter } = req.body;

    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      console.error('❌ Activity update failed: Activity not found');
      return res.status(404).json({
        success: false,
        message: 'Activity not found',
      });
    }

    // Access Control: Admin or Owner only
    if (req.user.role !== 'Admin' && activity.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }

    // Update fields
    if (type) activity.type = type;
    if (details) activity.details = details;
    if (statusBefore !== undefined) activity.statusBefore = statusBefore;
    if (statusAfter !== undefined) activity.statusAfter = statusAfter;

    await activity.save();

    console.log(`✅ Activity updated: ${activity.type}`);

    res.status(200).json({
      success: true,
      message: 'Activity updated successfully',
      activity,
    });
  } catch (error) {
    console.error('❌ Error updating activity:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update activity',
      error: error.message,
    });
  }
};

/**
 * Delete activity (Admin only, for cleanup)
 * DELETE /api/activities/:id
 */
const deleteActivity = async (req, res) => {
  try {
    // Strict Admin Check
    if (req.user.role !== 'Admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Only Admins can delete activities.',
        });
    }

    const activity = await Activity.findByIdAndDelete(req.params.id);

    if (!activity) {
      console.error('❌ Activity delete failed: Activity not found');
      return res.status(404).json({
        success: false,
        message: 'Activity not found',
      });
    }

    console.log(`✅ Activity deleted: ${activity.type}`);

    res.status(200).json({
      success: true,
      message: 'Activity deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting activity:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete activity',
      error: error.message,
    });
  }
};

module.exports = {
  getAllActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
};
