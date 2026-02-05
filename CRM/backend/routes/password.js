// backend/routes/password.js

const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { changePassword, adminResetPassword } = require('../controllers/passwordController');

// Change password for logged-in user (requires old password)
// POST /api/password/change
router.post('/change', authenticate, changePassword);

// Admin reset password for any user (no old password required)
// POST /api/password/reset/:id
router.post('/reset/:id', authenticate, authorizeRoles('Admin'), adminResetPassword);

module.exports = router;
