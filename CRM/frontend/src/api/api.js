// frontend/src/api/api.js

import { getToken } from './auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Unified API fetch helper with atomic error handling & file support
 * @param {string} endpoint - API endpoint (e.g., '/leads' or full URL)
 * @param {Object} options - Fetch options
 * @param {string} options.method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param {Object|FormData} options.body - Request body
 * @param {Object} options.headers - Additional headers
 * @param {boolean} options.useFormData - If true, body is sent as FormData
 * @returns {Promise<Object>} API response data
 */
export async function apiFetch(endpoint, { method = 'GET', body, headers = {}, useFormData = false } = {}) {
  // Build full URL if endpoint is relative
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  const opts = {
    method,
    headers: {
      ...(useFormData
        ? {} // Omit Content-Type for FormData; browser sets it with boundary
        : { 'Content-Type': 'application/json' }),
      ...headers,
    },
  };

  // Add JWT token if available
  const token = getToken();
  if (token) {
    opts.headers.Authorization = `Bearer ${token}`;
  }

  // Add body based on type
  if (body && useFormData) {
    opts.body = body; // Direct FormData object
  } else if (body) {
    opts.body = JSON.stringify(body);
  }

  let res, data;

  try {
    console.log(`🔄 API Request: ${method} ${url}`);
    res = await fetch(url, opts);

    // Try parsing JSON (guard for empty/invalid responses)
    try {
      data = await res.json();
    } catch (parseError) {
      console.warn('⚠️ Response is not JSON:', parseError.message);
      data = { success: false, message: 'Invalid response format' };
    }
  } catch (networkError) {
    // Network failure (server down, CORS, etc.)
    console.error('❌ API network error:', networkError.message);
    throw new Error(`Network error: ${networkError.message}`);
  }

  // Check for API errors
  if (!res.ok || data.success === false) {
    const errorMsg = data.message || res.statusText || `API error (${res.status})`;
    console.error('❌ API error response:', {
      endpoint: url,
      method,
      status: res.status,
      message: errorMsg,
      data,
    });
    throw new Error(errorMsg);
  }

  console.log(`✅ API Success: ${method} ${url}`);
  return data;
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiFetch(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => apiFetch(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options = {}) => apiFetch(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'DELETE' }),
};
