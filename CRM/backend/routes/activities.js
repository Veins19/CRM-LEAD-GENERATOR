// backend/routes/activities.js

const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const {
  getAllActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
} = require('../controllers/activityController');

// CREATE a new activity (Admin or Executive only)
router.post('/', authenticate, authorizeRoles('Admin', 'Executive'), createActivity);

// GET all activities with filters and pagination (Admin or Executive)
router.get('/', authenticate, authorizeRoles('Admin', 'Executive'), getAllActivities);

// GET one activity by ID (Admin or Executive)
router.get('/:id', authenticate, authorizeRoles('Admin', 'Executive'), getActivityById);

// UPDATE activity by ID (Admin only)
router.put('/:id', authenticate, authorizeRoles('Admin'), updateActivity);

// DELETE activity by ID (Admin only)
router.delete('/:id', authenticate, authorizeRoles('Admin'), deleteActivity);

module.exports = router;
