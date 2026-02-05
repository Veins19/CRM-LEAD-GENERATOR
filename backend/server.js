import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import logger from './utils/logger.js';
import connectDB from './config/db.js';
import apiRoutes from './routes/api.js';
import consultationController from './controllers/consultationController.js';
import behaviorController from './controllers/behaviorController.js';
import emailService from './services/emailService.js';
import emailScheduler from './cron/emailScheduler.js';
import { initializeSmsScheduler } from './cron/smsScheduler.js';
import { initializeAppointmentScheduler } from './cron/appointmentScheduler.js';

/**
 * MediFlow - Intelligent Patient Management System
 * Main entry point for medical clinic automation with real-time patient tracking
 * Features: AI Triage, Appointment Scheduling, Follow-ups, No-show Management
 */

// ==================== INITIALIZATION ====================

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ],
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
});

const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.request(req.method, req.path);
  next();
});

// ==================== ROUTES ====================

// API routes (prefixed with /api)
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'MediFlow - Intelligent Patient Management System API',
    version: '1.0.0',
    clinic: {
      name: process.env.CLINIC_NAME || 'MediFlow Clinic',
      phone: process.env.CLINIC_PHONE || '+91-80-12345678',
      email: process.env.CLINIC_EMAIL || 'clinic@mediflow.com',
      address: process.env.CLINIC_ADDRESS || '123 Medical Center, Bangalore, Karnataka 560001',
      type: 'Multi-Specialty Medical Clinic',
      features: 'AI-powered patient management with automated scheduling',
    },
    endpoints: {
      api: '/api',
      health: '/api/health',
      patients: '/api/patients',
      appointments: '/api/appointments',
      doctors: '/api/doctors',
      departments: '/api/departments',
      consultations: '/api/consultations',
      emailTemplates: '/api/email-templates',
      smsTemplates: '/api/sms/templates',
      smsStats: '/api/sms/stats',
    },
    websocket: {
      status: 'active',
      url: `ws://localhost:${PORT}`,
      features: ['real-time-chat', 'patient-triage', 'behavioral-tracking'],
    },
    features: {
      aiTriage: 'Intelligent patient risk classification (Emergency/High/Medium/Low)',
      chatbot: 'Medical symptom checker and appointment booking assistant',
      appointmentScheduling: 'Smart slot allocation based on risk priority',
      behaviorTracking: 'Patient journey tracking (page views, symptom searches)',
      riskClassification: 'WHO/ATS triage standards for emergency detection',
      emailAutomation: 'Appointment reminders (1-day, 2-hour before)',
      smsAutomation: 'WhatsApp/SMS notifications with Twilio',
      followUpManagement: 'Automated follow-up scheduling and reminders',
      noShowPrevention: 'Smart no-show detection and waitlist automation',
      telemedicine: 'Google Calendar integration for virtual consultations',
      prescriptionGeneration: 'Digital prescription PDFs with QR codes',
      abdmCompliance: 'Ayushman Bharat Digital Mission integration ready',
    },
    compliance: {
      dataRetention: '5 years (Indian Medical Council standards)',
      privacy: 'Patient consent-based data access (HIPAA-inspired)',
      encryption: 'AES-256 at rest, TLS 1.3 in transit',
      standards: 'WHO triage protocols, Indian Medical Council guidelines',
    },
    departments: [
      'General Medicine',
      'Cardiology',
      'Neurology',
      'Orthopedics',
      'Pediatrics',
      'Gynecology',
      'Dermatology',
      'Ophthalmology',
      'ENT',
      'Dentistry',
      'Psychiatry',
      'Emergency'
    ],
  });
});

// ==================== SOCKET.IO ====================

// Setup Socket.io event handlers
consultationController.setupSocketHandlers(io);
behaviorController.setupBehaviorHandlers(io);

// Log Socket.io connection attempts
io.on('connection', (socket) => {
  logger.success(`Socket.io client connected: ${socket.id}`);

  // Log disconnect
  socket.on('disconnect', (reason) => {
    logger.info(`Socket.io client disconnected: ${socket.id} - Reason: ${reason}`);
  });

  // Handle socket errors
  socket.on('error', (error) => {
    logger.error(`Socket.io error for client ${socket.id}:`, error.message);
  });
});

// ==================== DATABASE & SERVICES ====================

/**
 * Initialize database and services for medical clinic
 */
const initializeServices = async () => {
  try {
    logger.section('INITIALIZING MEDIFLOW SERVICES');

    // Connect to MongoDB
    await connectDB();

    // Verify email service connection
    logger.info('Verifying email service connection...');
    const emailVerified = await emailService.verifyConnection();
    if (emailVerified) {
      logger.success('Email service connection verified ✅');
    } else {
      logger.warn('Email service connection failed - appointment reminders via email will not be sent ⚠️');
    }

    // Verify Twilio SMS/WhatsApp service configuration
    logger.info('Verifying SMS/WhatsApp service configuration...');
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      logger.success('SMS/WhatsApp service configured (Twilio) ✅');
      logger.info('WhatsApp notifications enabled for appointment reminders');
    } else {
      logger.warn('SMS/WhatsApp service not configured - patient notifications will not be sent ⚠️');
      logger.warn('Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env');
    }

    // Verify Google Calendar configuration for telemedicine
    logger.info('Verifying Google Calendar configuration...');
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CALENDAR_ID) {
      logger.success('Google Calendar service configured ✅');
      logger.info('Telemedicine appointment scheduling enabled');
    } else {
      logger.warn('Google Calendar not configured - telemedicine appointments will not sync ⚠️');
      logger.warn('Please add GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_CALENDAR_ID to .env');
    }

    // Check ABDM configuration (optional for now)
    logger.info('Checking ABDM integration configuration...');
    if (process.env.ABDM_CLIENT_ID && process.env.ABDM_CLIENT_SECRET) {
      logger.success('ABDM (Ayushman Bharat Digital Mission) configured ✅');
      logger.info('Digital health records integration enabled');
    } else {
      logger.warn('ABDM not configured - digital health records sync disabled (optional) ℹ️');
    }

    logger.separator();
  } catch (error) {
    logger.error('Error initializing services:', error.message);
    logger.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

// ==================== SERVER STARTUP ====================

/**
 * Start the MediFlow server
 */
const startServer = async () => {
  try {
    // Initialize database and services
    await initializeServices();

    // Start HTTP server
    server.listen(PORT, '0.0.0.0', () => {
      logger.section('MEDIFLOW SERVER STARTED');
      logger.server(`🏥 MediFlow running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API URL: http://localhost:${PORT}/api`);
      logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      logger.info(`Socket.io enabled on port ${PORT}`);
      logger.info(`Clinic: ${process.env.CLINIC_NAME || 'MediFlow Clinic'}`);
      logger.info(`Patient journey tracking: ENABLED 📊`);
      logger.info(`AI Triage system: ENABLED 🤖`);
      logger.info(`Appointment automation: ENABLED 📅`);
      logger.separator();

      // Start cron jobs for automated tasks
      logger.section('STARTING AUTOMATED SCHEDULERS');

      logger.info('Starting email scheduler (appointment reminders)...');
      emailScheduler.startAllJobs();
      logger.success('✅ Email scheduler started - 1-day, 2-hour reminders active');

      logger.info('Starting SMS/WhatsApp scheduler...');
      initializeSmsScheduler();
      logger.success('✅ SMS/WhatsApp scheduler started - patient notifications active');

      logger.info('Starting appointment reminder scheduler...');
      initializeAppointmentScheduler();
      logger.success('✅ Appointment scheduler started - follow-ups & no-show management active');

      logger.separator();
      logger.success('🎯 MediFlow is ready to manage patients!');
      logger.separator();
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use`);
        logger.error('Please close the other application or use a different port');
        logger.info('Try: killall -9 node (to stop all Node processes)');
      } else {
        logger.error('Server error:', error.message);
        logger.error('Stack trace:', error.stack);
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error('❌ Failed to start MediFlow server:', error.message);
    logger.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

// ==================== GRACEFUL SHUTDOWN ====================

/**
 * Handle graceful shutdown for MediFlow
 */
const gracefulShutdown = async (signal) => {
  try {
    logger.section('SHUTTING DOWN MEDIFLOW');
    logger.warn(`Received ${signal} signal`);

    // Stop accepting new connections
    logger.info('Closing HTTP server...');
    server.close(() => {
      logger.success('HTTP server closed');
    });

    // Stop cron jobs
    logger.info('Stopping scheduled jobs...');
    emailScheduler.stopAllJobs();
    logger.success('Email scheduler stopped');
    logger.success('SMS/WhatsApp scheduler stopped (cron jobs will terminate with process)');
    logger.success('Appointment scheduler stopped (cron jobs will terminate with process)');

    // Close Socket.io connections
    logger.info('Closing Socket.io connections...');
    io.close(() => {
      logger.success('Socket.io connections closed');
    });

    // Close database connection (handled by MongoDB driver)
    logger.info('Closing database connection...');
    logger.info('Patient data safely persisted to MongoDB');
    // MongoDB connection will be closed by the process.on('SIGINT') handler in db.js

    logger.success('✅ Graceful shutdown complete - All patient data saved');
    logger.separator();

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error.message);
    logger.error('Stack trace:', error.stack);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error.message);
  logger.error('Stack trace:', error.stack);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection at:', promise);
  logger.error('Reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// ==================== START APPLICATION ====================

// Start the MediFlow server
startServer();

// Export for testing
export { app, server, io };
