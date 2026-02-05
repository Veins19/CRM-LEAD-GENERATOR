/**
 * Custom Logger Utility for MediFlow
 * Provides timestamped, color-coded logging for easier debugging
 * 
 * Medical-specific log levels:
 * - appointment: Appointment-related logs
 * - patient: Patient-related logs
 * - hipaa: HIPAA compliance and security logs
 * - sms: SMS notification logs
 */

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

/**
 * Get formatted timestamp
 */
const getTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Format log message with timestamp and color
 */
const formatMessage = (level, color, emoji, message, ...args) => {
  const timestamp = getTimestamp();
  const prefix = `${color}[${timestamp}] ${emoji} ${level}:${colors.reset}`;
  
  if (args.length > 0) {
    console.log(prefix, message, ...args);
  } else {
    console.log(prefix, message);
  }
};

/**
 * Logger object with different log levels
 */
const logger = {
  /**
   * Info level - General information
   */
  info: (message, ...args) => {
    formatMessage('INFO', colors.blue, 'ℹ️', message, ...args);
  },

  /**
   * Success level - Successful operations
   */
  success: (message, ...args) => {
    formatMessage('SUCCESS', colors.green, '✅', message, ...args);
  },

  /**
   * Warning level - Warning messages
   */
  warn: (message, ...args) => {
    formatMessage('WARNING', colors.yellow, '⚠️', message, ...args);
  },

  /**
   * Error level - Error messages
   */
  error: (message, ...args) => {
    formatMessage('ERROR', colors.red, '❌', message, ...args);
  },

  /**
   * Debug level - Debug information
   */
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      formatMessage('DEBUG', colors.magenta, '🔍', message, ...args);
    }
  },

  /**
   * Appointment level - Appointment-specific logs
   */
  appointment: (message, ...args) => {
    formatMessage('APPOINTMENT', colors.cyan, '📅', message, ...args);
  },

  /**
   * Patient level - Patient-specific logs
   */
  patient: (message, ...args) => {
    formatMessage('PATIENT', colors.blue, '👤', message, ...args);
  },

  /**
   * Doctor level - Doctor/medical staff logs
   */
  doctor: (message, ...args) => {
    formatMessage('DOCTOR', colors.green, '👨‍⚕️', message, ...args);
  },

  /**
   * HIPAA level - Security and compliance logs
   */
  hipaa: (message, ...args) => {
    formatMessage('HIPAA', colors.magenta, '🔒', message, ...args);
  },

  /**
   * Email level - Email-specific logs
   */
  email: (message, ...args) => {
    formatMessage('EMAIL', colors.magenta, '📧', message, ...args);
  },

  /**
   * SMS level - SMS notification logs
   */
  sms: (message, ...args) => {
    formatMessage('SMS', colors.cyan, '📱', message, ...args);
  },

  /**
   * AI level - AI/Gemini-specific logs
   */
  ai: (message, ...args) => {
    formatMessage('AI', colors.cyan, '🤖', message, ...args);
  },

  /**
   * Database level - Database operation logs
   */
  db: (message, ...args) => {
    formatMessage('DB', colors.green, '💾', message, ...args);
  },

  /**
   * Server level - Server-related logs
   */
  server: (message, ...args) => {
    formatMessage('SERVER', colors.blue, '🚀', message, ...args);
  },

  /**
   * Consultation level - Consultation/chatbot logs
   */
  consultation: (message, ...args) => {
    formatMessage('CONSULTATION', colors.cyan, '💬', message, ...args);
  },

  /**
   * Separator for visual clarity
   */
  separator: () => {
    console.log(colors.dim + '─'.repeat(80) + colors.reset);
  },

  /**
   * Section header for grouping logs
   */
  section: (title) => {
    console.log('\n' + colors.bright + colors.cyan + `━━━ ${title} ━━━` + colors.reset + '\n');
  },

  /**
   * Log object data in readable format
   */
  object: (label, obj) => {
    const timestamp = getTimestamp();
    console.log(`${colors.blue}[${timestamp}] 📦 ${label}:${colors.reset}`);
    console.log(JSON.stringify(obj, null, 2));
  },

  /**
   * Log API request details
   */
  request: (method, path, data = null) => {
    const timestamp = getTimestamp();
    console.log(`${colors.cyan}[${timestamp}] 📥 ${method} ${path}${colors.reset}`);
    if (data) {
      console.log(colors.dim + JSON.stringify(data, null, 2) + colors.reset);
    }
  },

  /**
   * Log API response details
   */
  response: (status, message, data = null) => {
    const timestamp = getTimestamp();
    const color = status >= 200 && status < 300 ? colors.green : colors.red;
    console.log(`${color}[${timestamp}] 📤 ${status} - ${message}${colors.reset}`);
    if (data) {
      console.log(colors.dim + JSON.stringify(data, null, 2) + colors.reset);
    }
  },

  /**
   * Log medical emergency alerts
   */
  emergency: (message, ...args) => {
    formatMessage('EMERGENCY', colors.bgRed + colors.white, '🚨', message, ...args);
  },

  /**
   * Log prescription-related actions
   */
  prescription: (message, ...args) => {
    formatMessage('PRESCRIPTION', colors.green, '💊', message, ...args);
  },

  /**
   * Log billing/payment actions
   */
  billing: (message, ...args) => {
    formatMessage('BILLING', colors.yellow, '💳', message, ...args);
  },
};

export default logger;
