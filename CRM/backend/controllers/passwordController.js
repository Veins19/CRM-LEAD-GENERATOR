// CRM/backend/controllers/passwordController.js

const User = require('../models/User');
const bcrypt = require('bcrypt');

// Change password for logged-in user (old password required)
const changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            console.error('❌ Missing password fields');
            return res.status(400).json({ success: false, message: 'Old and new passwords required' });
        }
        const user = await User.findById(req.user._id);
        if (!user) {
            console.error('❌ User not found for password change:', req.user.email);
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            console.error('❌ Incorrect old password attempt for:', req.user.email);
            return res.status(401).json({ success: false, message: 'Old password incorrect' });
        }
        user.password = newPassword; // Will be hashed by schema middleware
        await user.save();
        console.log(`✅ User changed password: ${user.email}`);
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('❌ Error changing password:', error.message);
        next(error);
    }
};

// Admin can reset password for any user (by param, no old password needed)
const adminResetPassword = async (req, res, next) => {
    try {
        // v2 matches new RESTful route: /users/:id/password
        const userId = req.params.id || req.body.userId;
        const { newPassword } = req.body;
        if (!userId || !newPassword) {
            console.error('❌ Missing admin password reset fields');
            return res.status(400).json({ success: false, message: 'User ID and new password required' });
        }
        const user = await User.findById(userId);
        if (!user) {
            console.error('❌ Target user not found for admin reset:', userId);
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        user.password = newPassword; // Will be hashed
        await user.save();
        console.log(`✅ Admin reset password for user: ${user.email}`);
        res.json({ success: true, message: 'Password reset successfully', user: { id: user._id, email: user.email, username: user.username }});
    } catch (error) {
        console.error('❌ Error resetting password:', error.message);
        next(error);
    }
};

module.exports = { changePassword, adminResetPassword };
