// backend/routes/dashboard.js

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/dashboardController');

/**
 * GET /api/dashboard
 * Returns aggregated analytics for Dashboard and Analytics pages
 */
router.get('/', authenticate, getDashboardStats);

module.exports = router;
