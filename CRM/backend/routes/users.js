// backend/routes/users.js

const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changeUserRole,
} = require('../controllers/userController');

// Self-profile routes (MUST come before /:id routes to avoid conflicts)
// GET self profile (user can view own profile info)
router.get('/self', authenticate, async (req, res, next) => {
  try {
    const user = req.user; // Already populated by authenticate middleware
    console.log(`✅ Self profile retrieved: ${user.username}`);
    res.json({ success: true, user });
  } catch (error) {
    console.error('❌ Error fetching self profile:', error.message);
    next(error);
  }
});

// UPDATE self profile info (username/email only)
router.put('/self', authenticate, async (req, res, next) => {
  try {
    // Reuse updateUser controller with current user's ID
    req.params.id = req.user._id.toString();
    await updateUser(req, res, next);
  } catch (error) {
    console.error('❌ Error updating self profile:', error.message);
    next(error);
  }
});

// Admin-only routes
// CREATE a new user (Admin only)
router.post('/', authenticate, authorizeRoles('Admin'), createUser);

// GET all users (Admin only) - with search and pagination
router.get('/', authenticate, authorizeRoles('Admin'), getAllUsers);

// GET one user by ID (Admin only)
router.get('/:id', authenticate, authorizeRoles('Admin'), getUserById);

// UPDATE user by ID (Admin only)
router.put('/:id', authenticate, authorizeRoles('Admin'), updateUser);

// DELETE user by ID (Admin only - soft delete)
router.delete('/:id', authenticate, authorizeRoles('Admin'), deleteUser);

// UPDATE user role (Admin only) -- promote/demote
router.patch('/:id/role', authenticate, authorizeRoles('Admin'), changeUserRole);

module.exports = router;
