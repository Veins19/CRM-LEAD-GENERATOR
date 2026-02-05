/**
 * Validation Service
 * Validates lead data (email, phone, name) before CRM sync
 * Ensures data quality and prevents invalid leads from polluting CRM
 */

import logger from '../utils/logger.js';

// Disposable email domains blacklist (common temporary email providers)
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com',
  'trashmail.com', 'throwaway.email', 'temp-mail.org', 'getnada.com',
  'maildrop.cc', 'yopmail.com', 'sharklasers.com', 'spam4.me',
  'mintemail.com', 'fakeinbox.com', 'dispostable.com', 'emailondeck.com',
  'guerrillamailblock.com', 'tmails.net', 'mohmal.com', 'fakemailgenerator.com'
];

// Common test names to reject
const TEST_NAMES = [
  'test', 'testing', 'demo', 'sample', 'example', 'dummy', 'fake',
  'abc', 'xyz', 'asdf', 'qwerty', 'admin', 'user', 'null', 'none',
  'na', 'n/a', 'unknown', 'anonymous', 'temp', 'temporary', '123', 'aaa'
];

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {Object} - { valid: boolean, error: string|null }
 */
function validateEmail(email) {
  try {
    // Check if email exists
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email is required' };
    }

    // Trim and lowercase
    const cleanEmail = email.trim().toLowerCase();

    // Check minimum length
    if (cleanEmail.length < 5) {
      return { valid: false, error: 'Email is too short' };
    }

    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(cleanEmail)) {
      return { valid: false, error: 'Invalid email format' };
    }

    // Extract domain
    const domain = cleanEmail.split('@')[1];
    
    if (!domain || domain.length < 3) {
      return { valid: false, error: 'Invalid email domain' };
    }

    // Check for disposable email domains
    if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
      return { valid: false, error: 'Temporary/disposable email addresses are not allowed' };
    }

    // Check for common typos in popular domains
    const popularDomainTypos = {
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'yahooo.com': 'yahoo.com',
      'yaho.com': 'yahoo.com',
      'outlok.com': 'outlook.com',
      'hotmial.com': 'hotmail.com'
    };

    if (popularDomainTypos[domain]) {
      return { 
        valid: false, 
        error: `Did you mean ${cleanEmail.split('@')[0]}@${popularDomainTypos[domain]}?` 
      };
    }

    logger.info(`✅ Email validation passed: ${cleanEmail}`);
    return { valid: true, error: null };

  } catch (error) {
    logger.error('❌ Email validation error:', error.message);
    return { valid: false, error: 'Email validation failed' };
  }
}

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {Object} - { valid: boolean, error: string|null }
 */
function validatePhone(phone) {
  try {
    // Phone is optional in some cases, but if provided must be valid
    if (!phone || typeof phone !== 'string') {
      return { valid: true, error: null }; // Phone is optional
    }

    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');

    // Check if empty after cleaning
    if (cleanPhone.length === 0) {
      return { valid: false, error: 'Phone number contains no digits' };
    }

    // Check length (international format: 10-15 digits)
    if (cleanPhone.length < 10) {
      return { valid: false, error: 'Phone number is too short (minimum 10 digits)' };
    }

    if (cleanPhone.length > 15) {
      return { valid: false, error: 'Phone number is too long (maximum 15 digits)' };
    }

    // Check for invalid patterns (all same digit, sequential)
    const allSameDigit = /^(\d)\1+$/.test(cleanPhone);
    if (allSameDigit) {
      return { valid: false, error: 'Phone number appears invalid (repeated digits)' };
    }

    // Check for sequential numbers (12345, 01234, etc.)
    const isSequential = cleanPhone.split('').every((digit, i, arr) => {
      if (i === 0) return true;
      return parseInt(digit) === parseInt(arr[i - 1]) + 1 || 
             parseInt(digit) === parseInt(arr[i - 1]) - 1;
    });

    if (isSequential && cleanPhone.length > 5) {
      return { valid: false, error: 'Phone number appears invalid (sequential digits)' };
    }

    logger.info(`✅ Phone validation passed: ${cleanPhone}`);
    return { valid: true, error: null };

  } catch (error) {
    logger.error('❌ Phone validation error:', error.message);
    return { valid: false, error: 'Phone validation failed' };
  }
}

/**
 * Validate name
 * @param {string} name - Name to validate
 * @returns {Object} - { valid: boolean, error: string|null }
 */
function validateName(name) {
  try {
    // Check if name exists
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Name is required' };
    }

    // Trim whitespace
    const cleanName = name.trim();

    // Check minimum length
    if (cleanName.length < 2) {
      return { valid: false, error: 'Name is too short (minimum 2 characters)' };
    }

    // Check maximum length
    if (cleanName.length > 100) {
      return { valid: false, error: 'Name is too long (maximum 100 characters)' };
    }

    // Check if name is only numbers
    if (/^\d+$/.test(cleanName)) {
      return { valid: false, error: 'Name cannot be only numbers' };
    }

    // Check if name is a common test name
    const lowerName = cleanName.toLowerCase();
    if (TEST_NAMES.includes(lowerName)) {
      return { valid: false, error: 'Invalid name (test/placeholder detected)' };
    }

    // Check for excessive special characters (more than 30%)
    const specialCharCount = (cleanName.match(/[^a-zA-Z0-9\s]/g) || []).length;
    const specialCharPercentage = (specialCharCount / cleanName.length) * 100;
    
    if (specialCharPercentage > 30) {
      return { valid: false, error: 'Name contains too many special characters' };
    }

    // Check for minimum alphabetic characters (at least 50%)
    const alphaCharCount = (cleanName.match(/[a-zA-Z]/g) || []).length;
    const alphaPercentage = (alphaCharCount / cleanName.length) * 100;

    if (alphaPercentage < 50) {
      return { valid: false, error: 'Name must contain mostly letters' };
    }

    logger.info(`✅ Name validation passed: ${cleanName}`);
    return { valid: true, error: null };

  } catch (error) {
    logger.error('❌ Name validation error:', error.message);
    return { valid: false, error: 'Name validation failed' };
  }
}

/**
 * Validate complete lead data
 * @param {Object} leadData - Lead data object { name, email, phone }
 * @returns {Object} - { valid: boolean, errors: Object, cleanedData: Object }
 */
function validateLeadData(leadData) {
  try {
    const { name, email, phone } = leadData;
    
    const errors = {};
    let isValid = true;

    // Validate name
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      errors.name = nameValidation.error;
      isValid = false;
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      errors.email = emailValidation.error;
      isValid = false;
    }

    // Validate phone (optional but must be valid if provided)
    if (phone) {
      const phoneValidation = validatePhone(phone);
      if (!phoneValidation.valid) {
        errors.phone = phoneValidation.error;
        isValid = false;
      }
    }

    // Cleaned data
    const cleanedData = {
      name: name ? name.trim() : null,
      email: email ? email.trim().toLowerCase() : null,
      phone: phone ? phone.replace(/\D/g, '') : null
    };

    if (isValid) {
      logger.success('✅ Lead validation passed:', cleanedData.email);
    } else {
      logger.warn('⚠️ Lead validation failed:', { email: cleanedData.email, errors });
    }

    return {
      valid: isValid,
      errors: Object.keys(errors).length > 0 ? errors : null,
      cleanedData
    };

  } catch (error) {
    logger.error('❌ Lead validation error:', error.message);
    return {
      valid: false,
      errors: { general: 'Validation process failed' },
      cleanedData: null
    };
  }
}

/**
 * Check if lead should be rejected immediately
 * @param {Object} leadData - Lead data object
 * @returns {boolean} - true if lead should be rejected
 */
function shouldRejectLead(leadData) {
  const validation = validateLeadData(leadData);
  return !validation.valid;
}

module.exports = {
  validateEmail,
  validatePhone,
  validateName,
  validateLeadData,
  shouldRejectLead,
  DISPOSABLE_EMAIL_DOMAINS,
  TEST_NAMES
};
