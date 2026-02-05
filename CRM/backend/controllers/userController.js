// backend/controllers/userController.js

const User = require('../models/User');
const bcrypt = require('bcrypt');

/**
 * Get all users (with optional search and pagination)
 * GET /api/users
 */
const getAllUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(query);

    console.log(`✅ Retrieved ${users.length} users (page ${page})`);

    res.status(200).json({
      success: true,
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalUsers: count,
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
};

/**
 * Get user by ID
 * GET /api/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      console.error('❌ User not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log(`✅ Retrieved user: ${user.username}`);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('❌ Error fetching user:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message,
    });
  }
};

/**
 * Create new user (Admin only)
 * POST /api/users
 */
const createUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role,
      specialization,
      max_active_leads,
      metadata,
    } = req.body;

    // Validation
    if (!username || !email || !password || !role) {
      console.error('❌ User creation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'All fields (username, email, password, role) are required',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      console.error('❌ User creation failed: User already exists');
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists',
      });
    }

    // Create new user (password hashed via pre-save hook)
    const userData = { username, email, password, role };

    // Add optional executive fields if provided
    if (specialization) userData.specialization = specialization;
    if (typeof max_active_leads === 'number')
      userData.max_active_leads = max_active_leads;
    if (metadata) userData.metadata = metadata;

    const user = new User(userData);
    await user.save();

    console.log(`✅ User created: ${username} (${role})`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        active: user.active,
        specialization: user.specialization,
        max_active_leads: user.max_active_leads,
        current_active_leads: user.current_active_leads,
      },
    });
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message,
    });
  }
};

/**
 * Update user (Admin can update any user, users can update own profile)
 * PUT /api/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const {
      username,
      email,
      role,
      active,
      specialization,
      max_active_leads,
      metadata,
    } = req.body;
    const userId = req.params.id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User update failed: User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Authorization: Admin can update anyone, users can only update themselves
    const isAdmin = req.user.role === 'Admin';
    const isSelf = req.user._id.toString() === userId;

    if (!isAdmin && !isSelf) {
      console.error('❌ User update failed: Unauthorized');
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile',
      });
    }

    // Non-admins cannot change role, active status, or executive fields
    if (
      !isAdmin &&
      (role ||
        active !== undefined ||
        specialization ||
        max_active_leads !== undefined)
    ) {
      console.error(
        '❌ User update failed: Non-admin trying to change restricted fields'
      );
      return res.status(403).json({
        success: false,
        message: 'Only admins can change role, active status, or executive fields',
      });
    }

    // Update fields
    if (username) user.username = username;
    if (email) user.email = email;
    if (role && isAdmin) user.role = role;
    if (active !== undefined && isAdmin) user.active = active;

    // Update executive-specific fields (admin only)
    if (specialization && isAdmin) user.specialization = specialization;
    if (typeof max_active_leads === 'number' && isAdmin)
      user.max_active_leads = max_active_leads;
    if (metadata && isAdmin) user.metadata = metadata;

    await user.save();

    console.log(`✅ User updated: ${user.username}`);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        active: user.active,
        specialization: user.specialization,
        max_active_leads: user.max_active_leads,
        current_active_leads: user.current_active_leads,
      },
    });
  } catch (error) {
    console.error('❌ Error updating user:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message,
    });
  }
};

/**
 * Delete user (soft delete - set active=false)
 * DELETE /api/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      console.error('❌ User delete failed: User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Soft delete
    user.active = false;
    await user.save();

    console.log(`✅ User deleted (soft): ${user.username}`);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message,
    });
  }
};

/**
 * Change user role (Admin only)
 * PATCH /api/users/:id/role
 */
const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    if (!role || !['Admin', 'Executive'].includes(role)) {
      console.error('❌ Role change failed: Invalid role');
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be Admin or Executive',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ Role change failed: User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.role = role;
    await user.save();

    console.log(`✅ User role changed: ${user.username} → ${role}`);

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        active: user.active,
        specialization: user.specialization,
      },
    });
  } catch (error) {
    console.error('❌ Error changing user role:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to change user role',
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changeUserRole,
};
