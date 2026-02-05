// backend/middleware/apiKeyAuth.js

require('dotenv').config();

/**
 * Simple API-key authentication for server-to-server integrations.
 *
 * - Other services send `x-api-key: <key>` on every request.
 * - Valid key(s) are stored in env: INTEGRATION_API_KEYS="key1,key2,..."
 * - Attaches `req.integrationClient` for logging / rate limiting later.
 */
const rawKeys = process.env.INTEGRATION_API_KEYS || '';
const allowedKeys = rawKeys
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

/**
 * Middleware: rejects request if x-api-key header is missing or invalid.
 */
function apiKeyAuth(req, res, next) {
  try {
    if (!allowedKeys.length) {
      console.error(
        '❌ INTEGRATION_API_KEYS is not configured. Rejecting integration request.'
      );
      return res.status(503).json({
        success: false,
        message: 'Integration API not configured',
      });
    }

    const headerKey = req.headers['x-api-key'];

    if (!headerKey) {
      return res.status(401).json({
        success: false,
        message: 'Missing API key',
      });
    }

    const index = allowedKeys.indexOf(headerKey);
    if (index === -1) {
      return res.status(403).json({
        success: false,
        message: 'Invalid API key',
      });
    }

    // Attach basic client info (index-based for now; can be expanded to DB lookups)
    req.integrationClient = {
      keyIndex: index,
    };

    return next();
  } catch (err) {
    console.error('❌ Error in apiKeyAuth middleware:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal authentication error',
    });
  }
}

module.exports = apiKeyAuth;
