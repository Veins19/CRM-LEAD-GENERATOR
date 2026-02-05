// backend/controllers/smsController.js

import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import SmsTemplate from '../models/SmsTemplate.js';
import smsService from '../services/smsService.js';
import logger from '../utils/logger.js';

/**
 * SMS Controller for MediFlow
 * Handles REST API endpoints for SMS template management and patient notifications
 * SMS Types: Appointment confirmations, reminders, cancellations, emergency alerts
 */

/**
 * Get all SMS templates
 * GET /api/sms/templates
 */
async function getSmsTemplates(req, res) {
  try {
    const templates = await SmsTemplate.find().sort({ template_type: 1, name: 1 });
    
    res.status(200).json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    logger.error('Error fetching SMS templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS templates',
      error: error.message
    });
  }
}

/**
 * Get SMS template by ID
 * GET /api/sms/templates/:id
 */
async function getSmsTemplateById(req, res) {
  try {
    const { id } = req.params;
    const template = await SmsTemplate.findById(id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'SMS template not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: template
    });
  } catch (error) {
    logger.error('Error fetching SMS template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS template',
      error: error.message
    });
  }
}

/**
 * Create new SMS template
 * POST /api/sms/templates
 */
async function createSmsTemplate(req, res) {
  try {
    const { name, template_type, department, message, variables, active } = req.body;
    
    // Validate required fields
    if (!name || !template_type || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, template_type, and message are required'
      });
    }
    
    // Validate template_type
    const validTypes = [
      'appointment_confirmation',
      'appointment_reminder_1day',
      'appointment_reminder_2hour',
      'appointment_cancellation',
      'appointment_rescheduled',
      'emergency_alert',
      'consultation_complete',
      'follow_up_reminder'
    ];
    
    if (!validTypes.includes(template_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid template_type. Valid types: ${validTypes.join(', ')}`
      });
    }
    
    // Check if template with same name already exists
    const existingTemplate = await SmsTemplate.findOne({ name });
    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Template with this name already exists'
      });
    }
    
    // Create new template
    const newTemplate = new SmsTemplate({
      name,
      template_type,
      department: department || 'General',
      message,
      variables: variables || [],
      active: active !== undefined ? active : true
    });
    
    await newTemplate.save();
    logger.info(`SMS template created: ${newTemplate.name}`);
    
    res.status(201).json({
      success: true,
      message: 'SMS template created successfully',
      data: newTemplate
    });
  } catch (error) {
    logger.error('Error creating SMS template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create SMS template',
      error: error.message
    });
  }
}

/**
 * Update SMS template
 * PUT /api/sms/templates/:id
 */
async function updateSmsTemplate(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const template = await SmsTemplate.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'SMS template not found'
      });
    }
    
    logger.info(`SMS template updated: ${template.name}`);
    
    res.status(200).json({
      success: true,
      message: 'SMS template updated successfully',
      data: template
    });
  } catch (error) {
    logger.error('Error updating SMS template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update SMS template',
      error: error.message
    });
  }
}

/**
 * Delete SMS template
 * DELETE /api/sms/templates/:id
 */
async function deleteSmsTemplate(req, res) {
  try {
    const { id } = req.params;
    
    const template = await SmsTemplate.findByIdAndDelete(id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'SMS template not found'
      });
    }
    
    logger.info(`SMS template deleted: ${template.name}`);
    
    res.status(200).json({
      success: true,
      message: 'SMS template deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting SMS template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete SMS template',
      error: error.message
    });
  }
}

/**
 * Send appointment confirmation SMS manually
 * POST /api/sms/send/appointment/:appointmentId
 */
async function sendAppointmentSms(req, res) {
  try {
    const { appointmentId } = req.params;
    const { smsType } = req.body; // 'confirmation', 'reminder', 'cancellation'
    
    // Find the appointment
    const appointment = await Appointment.findById(appointmentId)
      .populate('patient_id')
      .populate('doctor_id');
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    const patient = appointment.patient_id;
    const doctor = appointment.doctor_id;
    
    // Validate phone number
    if (!patient.phone) {
      return res.status(400).json({
        success: false,
        message: 'Patient has no phone number'
      });
    }
    
    let result;
    
    // Send SMS based on type
    switch (smsType) {
      case 'confirmation':
        result = await smsService.sendAppointmentConfirmationSms(
          appointment,
          patient,
          doctor
        );
        break;
        
      case 'reminder':
        result = await smsService.sendAppointmentReminderSms(
          appointment,
          patient,
          doctor,
          '1_day'
        );
        break;
        
      case 'cancellation':
        result = await smsService.sendAppointmentCancellationSms(
          appointment,
          patient,
          req.body.reason || 'by request'
        );
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid SMS type. Valid types: confirmation, reminder, cancellation'
        });
    }
    
    if (result.success) {
      logger.info(`Manual SMS sent for appointment ${appointmentId}, SID: ${result.sid}`);
      
      res.status(200).json({
        success: true,
        message: 'SMS sent successfully',
        data: {
          sid: result.sid,
          to: patient.phone,
          type: smsType
        }
      });
    } else {
      logger.error(`SMS send failed: ${result.error}`);
      res.status(500).json({
        success: false,
        message: 'Failed to send SMS',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error sending appointment SMS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send appointment SMS',
      error: error.message
    });
  }
}

/**
 * Send emergency alert SMS to patient
 * POST /api/sms/send/emergency/:patientId
 */
async function sendEmergencySms(req, res) {
  try {
    const { patientId } = req.params;
    
    // Find the patient
    const patient = await Patient.findById(patientId);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Validate phone number
    if (!patient.phone) {
      return res.status(400).json({
        success: false,
        message: 'Patient has no phone number'
      });
    }
    
    // Send emergency alert SMS
    const result = await smsService.sendEmergencyAlertSms(patient);
    
    if (result.success) {
      logger.info(`Emergency SMS sent to patient ${patientId}, SID: ${result.sid}`);
      
      res.status(200).json({
        success: true,
        message: 'Emergency SMS sent successfully',
        data: {
          sid: result.sid,
          to: patient.phone
        }
      });
    } else {
      logger.error(`Emergency SMS send failed: ${result.error}`);
      res.status(500).json({
        success: false,
        message: 'Failed to send emergency SMS',
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error sending emergency SMS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send emergency SMS',
      error: error.message
    });
  }
}

/**
 * Send custom SMS to patient
 * POST /api/sms/send/custom/:patientId
 */
async function sendCustomSms(req, res) {
  try {
    const { patientId } = req.params;
    const { message } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }
    
    // Find the patient
    const patient = await Patient.findById(patientId);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Validate phone number
    if (!patient.phone) {
      return res.status(400).json({
        success: false,
        message: 'Patient has no phone number'
      });
    }
    
    // Send SMS
    const result = await smsService.sendSMS(patient.phone, message);
    
    logger.info(`Custom SMS sent to patient ${patientId}, SID: ${result.sid}`);
    
    res.status(200).json({
      success: true,
      message: 'Custom SMS sent successfully',
      data: {
        sid: result.sid,
        to: patient.phone
      }
    });
  } catch (error) {
    logger.error('Error sending custom SMS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send custom SMS',
      error: error.message
    });
  }
}

/**
 * Get SMS statistics
 * GET /api/sms/stats
 */
async function getSmsStats(req, res) {
  try {
    // Count appointments by SMS status (would need to add sms_sent field to Appointment model)
    const totalAppointments = await Appointment.countDocuments();
    const scheduledAppointments = await Appointment.countDocuments({ status: 'scheduled' });
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
    const cancelledAppointments = await Appointment.countDocuments({ status: 'cancelled' });
    
    // Count by department
    const cardiologySms = await Appointment.countDocuments({ 
      department: 'Cardiology',
      status: 'scheduled'
    });
    const neurologySms = await Appointment.countDocuments({ 
      department: 'Neurology',
      status: 'scheduled'
    });
    const orthopedicsSms = await Appointment.countDocuments({ 
      department: 'Orthopedics',
      status: 'scheduled'
    });
    
    // Get template usage stats
    const templateStats = await SmsTemplate.find()
      .select('name template_type department usage_count last_used')
      .sort({ usage_count: -1 })
      .limit(5);
    
    res.status(200).json({
      success: true,
      data: {
        appointments: {
          total: totalAppointments,
          scheduled: scheduledAppointments,
          completed: completedAppointments,
          cancelled: cancelledAppointments
        },
        by_department: {
          cardiology: cardiologySms,
          neurology: neurologySms,
          orthopedics: orthopedicsSms
        },
        top_templates: templateStats
      }
    });
  } catch (error) {
    logger.error('Error fetching SMS stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SMS statistics',
      error: error.message
    });
  }
}

export default {
  getSmsTemplates,
  getSmsTemplateById,
  createSmsTemplate,
  updateSmsTemplate,
  deleteSmsTemplate,
  sendAppointmentSms,
  sendEmergencySms,
  sendCustomSms,
  getSmsStats
};
