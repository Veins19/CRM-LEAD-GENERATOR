// frontend/src/api/auth.js

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Login and get JWT
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Response data with token and user info
 */
export async function login(email, password) {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.success && data.token) {
      localStorage.setItem('jwt', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      console.log('✅ Login successful:', data.user.username);
    } else {
      console.error('❌ Login failed:', data.message);
    }

    return data;
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

/**
 * Register new user
 * @param {string} username - Username
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} role - User role (Admin/Executive)
 * @returns {Promise<Object>} Response data
 */
export async function register(username, email, password, role) {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role }),
    });

    const data = await res.json();

    if (data.success) {
      console.log('✅ Registration successful:', username);
    } else {
      console.error('❌ Registration failed:', data.message);
    }

    return data;
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

/**
 * Get current JWT with expiry check
 * @returns {string|null} Valid JWT token or null if expired/invalid
 */
export function getToken() {
  const token = localStorage.getItem('jwt');

  if (!token) return null;

  try {
    // Decode JWT payload to check expiry
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(atob(payloadB64));

    // Check if token is expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      console.warn('⚠️ Token expired, logging out');
      logout();
      return null;
    }

    return token;
  } catch (err) {
    // Malformed or missing payload
    console.error('❌ Invalid token format:', err.message);
    logout();
    return null;
  }
}

/**
 * Get current user info from localStorage
 * @returns {Object|null} User object or null
 */
export function getUser() {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('❌ Error parsing user data:', error.message);
    return null;
  }
}

/**
 * Logout user (atomic cleanup)
 */
export function logout() {
  localStorage.removeItem('jwt');
  localStorage.removeItem('user');
  console.log('✅ User logged out');
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if user has valid token
 */
export function isAuthenticated() {
  return getToken() !== null;
}

/**
 * Check if current user has specific role
 * @param {string} role - Role to check (e.g., 'Admin')
 * @returns {boolean} True if user has the role
 */
export function hasRole(role) {
  const user = getUser();
  return user && user.role === role;
}
