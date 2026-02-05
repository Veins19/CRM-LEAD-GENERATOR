import express from 'express';
import logger from '../utils/logger.js';
import patientController from '../controllers/patientController.js';
import appointmentController from '../controllers/appointmentController.js';
import emailController from '../controllers/emailController.js';
import smsController from '../controllers/smsController.js';

/**
 * API Routes for MediFlow
 * All routes are prefixed with /api
 */

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  logger.info('Health check requested');
  res.status(200).json({
    success: true,
    message: 'MediFlow Clinic Management API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    system: 'MediFlow',
  });
});

// ==================== PATIENT ROUTES ====================

/**
 * GET /api/patients
 * Get all patients with pagination and filtering
 */
router.get('/patients', patientController.getAllPatients);

/**
 * GET /api/patients/stats
 * Get patient statistics (must be before /:id to avoid conflict)
 */
router.get('/patients/stats', patientController.getPatientStats);

/**
 * GET /api/patients/search
 * Search patients by name, email, or phone
 */
router.get('/patients/search', patientController.searchPatients);

/**
 * GET /api/patients/:id
 * Get single patient by ID with populated data
 */
router.get('/patients/:id', patientController.getPatientById);

/**
 * PATCH /api/patients/:id/status
 * Update patient status
 */
router.patch('/patients/:id/status', patientController.updatePatientStatus);

/**
 * DELETE /api/patients/:id
 * Delete patient by ID (soft delete)
 */
router.delete('/patients/:id', patientController.deletePatient);

/**
 * GET /api/patients/:id/consultations
 * Get consultation history for a patient
 */
router.get('/patients/:id/consultations', patientController.getPatientConsultations);

/**
 * GET /api/patients/:id/appointments
 * Get appointment history for a patient
 */
router.get('/patients/:id/appointments', patientController.getPatientAppointments);

/**
 * GET /api/patients/:id/medical-history
 * Get medical history for a patient
 */
router.get('/patients/:id/medical-history', patientController.getPatientMedicalHistory);

// ==================== APPOINTMENT ROUTES ====================

/**
 * POST /api/appointments
 * Create a new appointment
 */
router.post('/appointments', appointmentController.createAppointment);

/**
 * GET /api/appointments/stats
 * Get appointment statistics (must be before /:appointmentId)
 */
router.get('/appointments/stats', appointmentController.getAppointmentStats);

/**
 * GET /api/appointments/:appointmentId
 * Get appointment by ID
 */
router.get('/appointments/:appointmentId', appointmentController.getAppointmentById);

/**
 * GET /api/appointments/patient/:patientId
 * Get all appointments for a specific patient
 */
router.get('/appointments/patient/:patientId', appointmentController.getAppointmentsByPatient);

/**
 * GET /api/appointments
 * Get all appointments with filters
 */
router.get('/appointments', appointmentController.getAllAppointments);

/**
 * PATCH /api/appointments/:appointmentId/cancel
 * Cancel an appointment
 */
router.patch('/appointments/:appointmentId/cancel', appointmentController.cancelAppointment);

/**
 * PATCH /api/appointments/:appointmentId/reschedule
 * Reschedule an appointment
 */
router.patch('/appointments/:appointmentId/reschedule', appointmentController.rescheduleAppointment);

/**
 * PATCH /api/appointments/:appointmentId/complete
 * Mark appointment as completed
 */
router.patch('/appointments/:appointmentId/complete', appointmentController.completeAppointment);

/**
 * PATCH /api/appointments/:appointmentId/no-show
 * Mark appointment as no-show
 */
router.patch('/appointments/:appointmentId/no-show', appointmentController.markAsNoShow);

// ==================== EMAIL TEMPLATE ROUTES ====================

/**
 * GET /api/email-templates
 * Get all email templates
 */
router.get('/email-templates', emailController.getAllTemplates);

/**
 * GET /api/email-templates/name/:name
 * Get email template by name (must be before /:id)
 */
router.get('/email-templates/name/:name', emailController.getTemplateByName);

/**
 * GET /api/email-templates/:id
 * Get single email template by ID
 */
router.get('/email-templates/:id', emailController.getTemplateById);

/**
 * POST /api/email-templates
 * Create new email template
 */
router.post('/email-templates', emailController.createTemplate);

/**
 * PUT /api/email-templates/:id
 * Update email template
 */
router.put('/email-templates/:id', emailController.updateTemplate);

/**
 * DELETE /api/email-templates/:id
 * Delete email template
 */
router.delete('/email-templates/:id', emailController.deleteTemplate);

/**
 * POST /api/email-templates/:id/preview
 * Preview email template with sample data
 */
router.post('/email-templates/:id/preview', emailController.previewTemplate);

/**
 * POST /api/email-templates/:id/test
 * Send test email to specified address
 */
router.post('/email-templates/:id/test', emailController.testSendTemplate);

/**
 * POST /api/email-templates/resend-appointment/:appointmentId
 * Resend appointment confirmation email
 */
router.post('/email-templates/resend-appointment/:appointmentId', emailController.resendAppointmentEmail);

// ==================== SMS TEMPLATE ROUTES ====================

/**
 * GET /api/sms/templates
 * Get all SMS templates
 */
router.get('/sms/templates', smsController.getSmsTemplates);

/**
 * GET /api/sms/stats
 * Get SMS statistics (must be before /templates/:id to avoid conflict)
 */
router.get('/sms/stats', smsController.getSmsStats);

/**
 * GET /api/sms/templates/:id
 * Get single SMS template by ID
 */
router.get('/sms/templates/:id', smsController.getSmsTemplateById);

/**
 * POST /api/sms/templates
 * Create new SMS template
 */
router.post('/sms/templates', smsController.createSmsTemplate);

/**
 * PUT /api/sms/templates/:id
 * Update SMS template
 */
router.put('/sms/templates/:id', smsController.updateSmsTemplate);

/**
 * DELETE /api/sms/templates/:id
 * Delete SMS template
 */
router.delete('/sms/templates/:id', smsController.deleteSmsTemplate);

/**
 * POST /api/sms/send/appointment/:appointmentId
 * Send appointment SMS manually
 */
router.post('/sms/send/appointment/:appointmentId', smsController.sendAppointmentSms);

/**
 * POST /api/sms/send/emergency/:patientId
 * Send emergency alert SMS to patient
 */
router.post('/sms/send/emergency/:patientId', smsController.sendEmergencySms);

/**
 * POST /api/sms/send/custom/:patientId
 * Send custom SMS to patient
 */
router.post('/sms/send/custom/:patientId', smsController.sendCustomSms);

// ==================== 404 HANDLER ====================

/**
 * Catch-all for undefined routes
 */
router.use('*', (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    requestedUrl: req.originalUrl,
    availableEndpoints: {
      patients: [
        'GET /api/patients',
        'GET /api/patients/stats',
        'GET /api/patients/search?q=query',
        'GET /api/patients/:id',
        'PATCH /api/patients/:id/status',
        'DELETE /api/patients/:id',
        'GET /api/patients/:id/consultations',
        'GET /api/patients/:id/appointments',
        'GET /api/patients/:id/medical-history',
      ],
      appointments: [
        'POST /api/appointments',
        'GET /api/appointments',
        'GET /api/appointments/stats',
        'GET /api/appointments/:appointmentId',
        'GET /api/appointments/patient/:patientId',
        'PATCH /api/appointments/:appointmentId/cancel',
        'PATCH /api/appointments/:appointmentId/reschedule',
        'PATCH /api/appointments/:appointmentId/complete',
        'PATCH /api/appointments/:appointmentId/no-show',
      ],
      emailTemplates: [
        'GET /api/email-templates',
        'GET /api/email-templates/name/:name',
        'GET /api/email-templates/:id',
        'POST /api/email-templates',
        'PUT /api/email-templates/:id',
        'DELETE /api/email-templates/:id',
        'POST /api/email-templates/:id/preview',
        'POST /api/email-templates/:id/test',
        'POST /api/email-templates/resend-appointment/:appointmentId',
      ],
      smsTemplates: [
        'GET /api/sms/templates',
        'GET /api/sms/stats',
        'GET /api/sms/templates/:id',
        'POST /api/sms/templates',
        'PUT /api/sms/templates/:id',
        'DELETE /api/sms/templates/:id',
        'POST /api/sms/send/appointment/:appointmentId',
        'POST /api/sms/send/emergency/:patientId',
        'POST /api/sms/send/custom/:patientId',
      ],
      utility: ['GET /api/health'],
    },
  });
});

// ==================== ERROR HANDLER ====================

/**
 * Global error handler for this router
 */
router.use((err, req, res, next) => {
  logger.error('API Error:', err.message);
  logger.error('Stack trace:', err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

export default router;
