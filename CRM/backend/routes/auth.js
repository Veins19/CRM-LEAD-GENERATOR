// CRM/backend/routes/auth.js

const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// Register route (Admin or Executive)
router.post('/register', register);

// Login route (returns JWT)
router.post('/login', login);

module.exports = router;
