import logger from '../utils/logger.js';
import EmailTemplate from '../models/EmailTemplate.js';
import emailService from '../services/emailService.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';

/**
 * Email Controller for MediFlow
 * Handles REST API endpoints for email template management
 * Templates: Appointment confirmations, reminders, cancellations, emergency alerts
 */

/**
 * Get all email templates
 * GET /api/email-templates
 */
const getAllTemplates = async (req, res) => {
  try {
    logger.info('Fetching all email templates');

    const templates = await EmailTemplate.find()
      .select('-__v')
      .sort({ priority: -1, name: 1 })
      .lean();

    logger.success(`Fetched ${templates.length} email templates`);

    res.status(200).json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error) {
    logger.error('Error fetching templates:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email templates',
      error: error.message,
    });
  }
};

/**
 * Get single email template by ID
 * GET /api/email-templates/:id
 */
const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Fetching email template: ${id}`);

    const template = await EmailTemplate.findById(id).select('-__v');

    if (!template) {
      logger.warn(`Template not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Email template not found',
      });
    }

    logger.success(`Template fetched: ${id}`);

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    logger.error('Error fetching template:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email template',
      error: error.message,
    });
  }
};

/**
 * Get template by name
 * GET /api/email-templates/name/:name
 */
const getTemplateByName = async (req, res) => {
  try {
    const { name } = req.params;
    logger.info(`Fetching email template by name: ${name}`);

    const template = await EmailTemplate.findOne({ name }).select('-__v');

    if (!template) {
      logger.warn(`Template not found: ${name}`);
      return res.status(404).json({
        success: false,
        message: 'Email template not found',
      });
    }

    logger.success(`Template fetched: ${name}`);

    res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error) {
    logger.error('Error fetching template:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email template',
      error: error.message,
    });
  }
};

/**
 * Create new email template
 * POST /api/email-templates
 */
const createTemplate = async (req, res) => {
  try {
    logger.info('Creating new email template');

    const {
      name,
      description,
      subject,
      html_content,
      text_content,
      variables,
      template_type,
      department,
      priority,
    } = req.body;

    // Validate required fields
    if (!name || !subject || !html_content || !text_content) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, subject, html_content, text_content',
      });
    }

    // Check if template with same name exists
    const existingTemplate = await EmailTemplate.findOne({ name });
    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Template with this name already exists',
      });
    }

    const template = new EmailTemplate({
      name,
      description,
      subject,
      html_content,
      text_content,
      variables: variables || [],
      template_type: template_type || 'appointment_confirmation',
      department: department || 'General',
      priority: priority || 'medium',
    });

    await template.save();

    logger.success(`Template created: ${template._id}`);

    res.status(201).json({
      success: true,
      message: 'Email template created successfully',
      data: template,
    });
  } catch (error) {
    logger.error('Error creating template:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create email template',
      error: error.message,
    });
  }
};

/**
 * Update email template
 * PUT /api/email-templates/:id
 */
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Updating email template: ${id}`);

    const template = await EmailTemplate.findById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Email template not found',
      });
    }

    // Update fields
    const allowedFields = [
      'description',
      'subject',
      'html_content',
      'text_content',
      'variables',
      'template_type',
      'department',
      'priority',
      'is_active',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        template[field] = req.body[field];
      }
    });

    await template.save();

    logger.success(`Template updated: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Email template updated successfully',
      data: template,
    });
  } catch (error) {
    logger.error('Error updating template:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update email template',
      error: error.message,
    });
  }
};

/**
 * Delete email template
 * DELETE /api/email-templates/:id
 */
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Deleting email template: ${id}`);

    const template = await EmailTemplate.findByIdAndDelete(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Email template not found',
      });
    }

    logger.success(`Template deleted: ${id}`);

    res.status(200).json({
      success: true,
      message: 'Email template deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting template:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete email template',
      error: error.message,
    });
  }
};

/**
 * Preview email template with sample data
 * POST /api/email-templates/:id/preview
 */
const previewTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const sampleData = req.body;

    logger.info(`Previewing email template: ${id}`);

    const template = await EmailTemplate.findById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Email template not found',
      });
    }

    // Use sample data or defaults (medical context)
    const defaultData = {
      // Patient info
      patient_name: sampleData.patient_name || 'John Doe',
      patient_email: sampleData.patient_email || 'john.doe@example.com',
      patient_phone: sampleData.patient_phone || '+91-9876543210',
      patient_age: sampleData.patient_age || 45,
      
      // Doctor info
      doctor_name: sampleData.doctor_name || 'Dr. Sarah Williams',
      doctor_specialization: sampleData.doctor_specialization || 'Cardiologist',
      
      // Appointment info
      appointment_date: sampleData.appointment_date || 'December 18, 2025',
      appointment_time: sampleData.appointment_time || '10:00 AM',
      department: sampleData.department || 'Cardiology',
      
      // Clinic info
      clinic_name: process.env.CLINIC_NAME || 'MediFlow Clinic',
      clinic_address: process.env.CLINIC_ADDRESS || '123 Medical Center, Bangalore',
      clinic_phone: process.env.CLINIC_PHONE || '+91-80-12345678',
    };

    const personalizedEmail = template.personalize(defaultData);

    logger.success(`Template preview generated: ${id}`);

    res.status(200).json({
      success: true,
      data: {
        subject: personalizedEmail.subject,
        html: personalizedEmail.html,
        text: personalizedEmail.text,
        templateName: template.name,
        sampleData: defaultData,
      },
    });
  } catch (error) {
    logger.error('Error previewing template:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to preview email template',
      error: error.message,
    });
  }
};

/**
 * Test send email template
 * POST /api/email-templates/:id/test
 */
const testSendTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: 'Test email address is required',
      });
    }

    logger.info(`Test sending email template: ${id} to ${testEmail}`);

    const template = await EmailTemplate.findById(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Email template not found',
      });
    }

    // Sample data for test (medical context)
    const sampleData = {
      patient_name: 'Test Patient',
      patient_email: testEmail,
      patient_phone: '+91-9876543210',
      patient_age: 35,
      doctor_name: 'Dr. Test Doctor',
      doctor_specialization: 'General Physician',
      appointment_date: 'Tomorrow',
      appointment_time: '10:00 AM',
      department: 'General Medicine',
      clinic_name: process.env.CLINIC_NAME || 'MediFlow Clinic',
      clinic_address: process.env.CLINIC_ADDRESS || '123 Medical Center, Bangalore',
      clinic_phone: process.env.CLINIC_PHONE || '+91-80-12345678',
    };

    const personalizedEmail = template.personalize(sampleData);

    // Send test email
    const result = await emailService.sendEmail(
      testEmail,
      `[TEST] ${personalizedEmail.subject}`,
      personalizedEmail.html,
      personalizedEmail.text
    );

    if (result.success) {
      logger.success(`Test email sent to ${testEmail}`);
      res.status(200).json({
        success: true,
        message: 'Test email sent successfully',
        data: {
          recipient: testEmail,
          messageId: result.messageId,
        },
      });
    } else {
      logger.error(`Test email failed: ${result.error}`);
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error,
      });
    }
  } catch (error) {
    logger.error('Error sending test email:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message,
    });
  }
};

/**
 * Resend appointment confirmation email to a patient
 * POST /api/email-templates/resend-appointment/:appointmentId
 */
const resendAppointmentEmail = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    logger.info(`Resending appointment email for: ${appointmentId}`);

    const appointment = await Appointment.findById(appointmentId)
      .populate('patient_id')
      .populate('doctor_id');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const patient = appointment.patient_id;
    const doctor = appointment.doctor_id;

    // Send appointment confirmation email
    const result = await emailService.sendAllAppointmentEmails(
      appointment,
      patient,
      doctor
    );

    if (result.patientConfirmation.success) {
      logger.success(`Appointment email resent for: ${appointmentId}`);
      res.status(200).json({
        success: true,
        message: 'Appointment email resent successfully',
        data: {
          recipient: patient.email,
          appointmentId: appointment._id,
        },
      });
    } else {
      logger.error(`Email resend failed: ${result.patientConfirmation.error}`);
      res.status(500).json({
        success: false,
        message: 'Failed to resend appointment email',
        error: result.patientConfirmation.error,
      });
    }
  } catch (error) {
    logger.error('Error resending appointment email:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to resend appointment email',
      error: error.message,
    });
  }
};

export default {
  getAllTemplates,
  getTemplateById,
  getTemplateByName,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
  testSendTemplate,
  resendAppointmentEmail,
};
