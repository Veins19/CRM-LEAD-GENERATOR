// CRM/backend/middleware/auth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Authentication Middleware
const authenticate = async (req, res, next) => {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        console.error('❌ No auth token provided');
        return res.status(401).json({ success: false, message: 'No auth token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // JWT expiry check (iat & exp are verified by jwt.verify automatically)
        if (Date.now() >= decoded.exp * 1000) {
            console.error('❌ Token expired');
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            console.error('❌ User not found for token');
            return res.status(401).json({ success: false, message: 'User not found' });
        }
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            console.error('❌ Auth error: Token expired', error.message);
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        console.error('❌ Invalid token:', error.message);
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// Role-based Authorization Middleware (atomic)
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            console.error('❌ No user/role on request for role check');
            return res.status(403).json({ success: false, message: 'Forbidden: No role info' });
        }
        if (!roles.includes(req.user.role)) {
            console.error(
                `❌ Unauthorized role (${req.user.role}) for action: allowed roles are [${roles}]`
            );
            return res.status(403).json({ success: false, message: 'Forbidden: Insufficient role' });
        }
        next();
    };
};

module.exports = { authenticate, authorizeRoles };
