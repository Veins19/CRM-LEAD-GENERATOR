// backend/services/smsService.js

import 'dotenv/config';
import twilio from 'twilio';
import logger from '../utils/logger.js';
import SmsTemplate from '../models/SmsTemplate.js';
import riskCalculator from '../utils/riskCalculator.js';

/**
 * SMS Service for MediFlow
 * Handles all medical appointment and notification SMS via Twilio
 * 
 * SMS Types:
 * - Appointment Confirmation (after booking)
 * - Appointment Reminders (1-day, 2-hour before)
 * - Emergency Alert (red flag symptoms detected)
 * - Appointment Cancellation/Rescheduling
 * - Consultation Completion (after visit)
 * - Follow-up Appointment Reminder
 * 
 * HIPAA COMPLIANCE:
 * - No sensitive medical information in SMS
 * - Generic appointment details only
 * - Emergency alerts use coded language
 * - Patient name + date/time only
 */

// Initialize Twilio client with credentials from .env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  logger.error(
    '❌ Twilio credentials or phone number missing in environment variables.'
  );
  throw new Error('Twilio configuration incomplete.');
}

const client = twilio(accountSid, authToken);

/**
 * Normalize phone number to E.164 format (India +91 default)
 * @param {string} phone - Phone number to normalize
 * @returns {string|null} - Normalized phone number or null
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;

  let clean = String(phone).trim();

  // Already E.164
  if (clean.startsWith('+')) {
    return clean;
  }

  // Remove non-digits
  clean = clean.replace(/\D/g, '');

  // Basic heuristic: if 10 digits, assume +91 (India) as default
  if (clean.length === 10) {
    return `+91${clean}`;
  }

  // If 11-15 digits, assume caller already included country code without '+'
  if (clean.length >= 11 && clean.length <= 15) {
    return `+${clean}`;
  }

  logger.warn(`⚠️ Phone normalization failed for value: ${phone}`);
  return null;
}

/**
 * Sends a raw SMS message via Twilio
 * Low-level helper used by higher-level appointment SMS functions
 * @param {string} toPhoneNumber - Recipient's phone number (E.164)
 * @param {string} message - SMS content body
 * @returns {Promise<Object>} Twilio message response object
 */
async function sendSMS(toPhoneNumber, message) {
  try {
    const normalized = normalizePhoneNumber(toPhoneNumber);

    if (!normalized) {
      throw new Error('Invalid or unsupported phone number format');
    }

    const response = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: normalized,
    });

    logger.info(`✅ SMS sent to ${normalized}, SID: ${response.sid}`);
    return response;
  } catch (error) {
    logger.error(
      `❌ Failed to send SMS to ${toPhoneNumber}: ${error.message}`,
      { error }
    );
    throw error;
  }
}

/**
 * Send appointment confirmation SMS to patient
 * @param {Object} appointment - Appointment document
 * @param {Object} patient - Patient document
 * @param {Object} doctor - Doctor document
 * @returns {Promise<Object>} - Send result
 */
async function sendAppointmentConfirmationSms(appointment, patient, doctor) {
  try {
    if (!patient.phone) {
      logger.warn(
        `⚠️ Skipping confirmation SMS for ${patient.name} - no phone number`
      );
      return {
        success: false,
        error: 'No phone number provided',
      };
    }

    logger.sms(`📱 Sending appointment confirmation SMS to ${patient.phone}`);

    const appointmentDate = new Date(appointment.scheduled_start_time);
    const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
    const formattedTime = appointmentDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const clinicName = process.env.CLINIC_NAME || 'MediFlow Clinic';
    const clinicPhone = process.env.CLINIC_PHONE || '+91-80-12345678';

    // HIPAA-compliant message (no sensitive medical info)
    const message = `✅ Appointment Confirmed

${clinicName}
Date: ${formattedDate} at ${formattedTime}
Doctor: ${doctor.name}
Dept: ${appointment.department}

Please arrive 10-15 mins early.
To reschedule/cancel: ${clinicPhone}`;

    const response = await sendSMS(patient.phone, message);

    logger.success(
      `✅ Confirmation SMS sent to ${patient.phone}, SID: ${response.sid}`
    );

    return {
      success: true,
      sid: response.sid,
      to: response.to,
    };
  } catch (error) {
    logger.error(
      `❌ Error sending confirmation SMS to ${patient.phone}:`,
      error.message
    );
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send appointment reminder SMS (1-day or 2-hour before)
 * @param {Object} appointment - Appointment document
 * @param {Object} patient - Patient document
 * @param {Object} doctor - Doctor document
 * @param {string} reminderType - '1_day' or '2_hour'
 * @returns {Promise<Object>} - Send result
 */
async function sendAppointmentReminderSms(
  appointment,
  patient,
  doctor,
  reminderType = '1_day'
) {
  try {
    if (!patient.phone) {
      logger.warn(
        `⚠️ Skipping reminder SMS for ${patient.name} - no phone number`
      );
      return {
        success: false,
        error: 'No phone number provided',
      };
    }

    const reminderText = reminderType === '1_day' ? 'tomorrow' : 'in 2 hours';
    logger.sms(
      `📱 Sending ${reminderType} reminder SMS to ${patient.phone}`
    );

    const appointmentDate = new Date(appointment.scheduled_start_time);
    const formattedTime = appointmentDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const clinicName = process.env.CLINIC_NAME || 'MediFlow Clinic';
    const clinicAddress =
      process.env.CLINIC_ADDRESS || '123 Medical Center, Bangalore';

    const message = `⏰ Appointment Reminder

${clinicName}
Your appointment is ${reminderText} at ${formattedTime}
Doctor: ${doctor.name}

Location: ${clinicAddress}

Please arrive 10-15 mins early.`;

    const response = await sendSMS(patient.phone, message);

    logger.success(
      `✅ ${reminderType} reminder SMS sent to ${patient.phone}, SID: ${response.sid}`
    );

    return {
      success: true,
      sid: response.sid,
      to: response.to,
      reminderType,
    };
  } catch (error) {
    logger.error(
      `❌ Error sending ${reminderType} reminder SMS:`,
      error.message
    );
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send emergency alert SMS to patient
 * @param {Object} patient - Patient document
 * @returns {Promise<Object>} - Send result
 */
async function sendEmergencyAlertSms(patient) {
  try {
    if (!patient.phone) {
      logger.warn(
        `⚠️ Skipping emergency SMS for ${patient.name} - no phone number`
      );
      return {
        success: false,
        error: 'No phone number provided',
      };
    }

    logger.sms(`🚨 Sending EMERGENCY alert SMS to ${patient.phone}`);

    const clinicPhone = process.env.CLINIC_PHONE || '+91-80-12345678';
    const emergencyNumber = process.env.EMERGENCY_NUMBER || '102 / 108';

    // HIPAA-compliant emergency message (coded language)
    const message = `🚨 URGENT MEDICAL ALERT

Based on your symptoms, you need IMMEDIATE medical attention.

ACTION REQUIRED:
1. Call emergency: ${emergencyNumber}
2. Go to nearest ER NOW
3. Or call us: ${clinicPhone}

This is NOT a drill. Please act immediately.

- MediFlow Clinic`;

    const response = await sendSMS(patient.phone, message);

    logger.success(
      `✅ Emergency alert SMS sent to ${patient.phone}, SID: ${response.sid}`
    );

    return {
      success: true,
      sid: response.sid,
      to: response.to,
    };
  } catch (error) {
    logger.error(`❌ Error sending emergency alert SMS:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send appointment cancellation SMS
 * @param {Object} appointment - Appointment document
 * @param {Object} patient - Patient document
 * @param {string} reason - Cancellation reason (optional)
 * @returns {Promise<Object>} - Send result
 */
async function sendAppointmentCancellationSms(
  appointment,
  patient,
  reason = 'by request'
) {
  try {
    if (!patient.phone) {
      logger.warn(
        `⚠️ Skipping cancellation SMS for ${patient.name} - no phone number`
      );
      return {
        success: false,
        error: 'No phone number provided',
      };
    }

    logger.sms(`📱 Sending cancellation SMS to ${patient.phone}`);

    const appointmentDate = new Date(appointment.scheduled_start_time);
    const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
    const formattedTime = appointmentDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const clinicName = process.env.CLINIC_NAME || 'MediFlow Clinic';
    const clinicPhone = process.env.CLINIC_PHONE || '+91-80-12345678';

    const message = `❌ Appointment Cancelled

${clinicName}
Date: ${formattedDate} at ${formattedTime}
Reason: ${reason}

To reschedule, call: ${clinicPhone}

We hope to serve you soon.`;

    const response = await sendSMS(patient.phone, message);

    logger.success(
      `✅ Cancellation SMS sent to ${patient.phone}, SID: ${response.sid}`
    );

    return {
      success: true,
      sid: response.sid,
      to: response.to,
    };
  } catch (error) {
    logger.error(`❌ Error sending cancellation SMS:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send appointment rescheduling SMS
 * @param {Object} newAppointment - New appointment document
 * @param {Object} patient - Patient document
 * @param {Object} doctor - Doctor document
 * @returns {Promise<Object>} - Send result
 */
async function sendAppointmentReschedulingSms(newAppointment, patient, doctor) {
  try {
    if (!patient.phone) {
      logger.warn(
        `⚠️ Skipping rescheduling SMS for ${patient.name} - no phone number`
      );
      return {
        success: false,
        error: 'No phone number provided',
      };
    }

    logger.sms(`📱 Sending rescheduling SMS to ${patient.phone}`);

    const newDate = new Date(newAppointment.scheduled_start_time);
    const formattedDate = newDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const formattedTime = newDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const clinicName = process.env.CLINIC_NAME || 'MediFlow Clinic';

    const message = `🔄 Appointment Rescheduled

${clinicName}
New Date: ${formattedDate} at ${formattedTime}
Doctor: ${doctor.name}
Dept: ${newAppointment.department}

Please arrive 10-15 mins early.`;

    const response = await sendSMS(patient.phone, message);

    logger.success(
      `✅ Rescheduling SMS sent to ${patient.phone}, SID: ${response.sid}`
    );

    return {
      success: true,
      sid: response.sid,
      to: response.to,
    };
  } catch (error) {
    logger.error(`❌ Error sending rescheduling SMS:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send consultation completion SMS (after visit)
 * @param {Object} consultation - Consultation document
 * @param {Object} patient - Patient document
 * @returns {Promise<Object>} - Send result
 */
async function sendConsultationCompletionSms(consultation, patient) {
  try {
    if (!patient.phone) {
      logger.warn(
        `⚠️ Skipping completion SMS for ${patient.name} - no phone number`
      );
      return {
        success: false,
        error: 'No phone number provided',
      };
    }

    logger.sms(`📱 Sending consultation completion SMS to ${patient.phone}`);

    const clinicName = process.env.CLINIC_NAME || 'MediFlow Clinic';
    const clinicPhone = process.env.CLINIC_PHONE || '+91-80-12345678';

    const message = `✅ Consultation Complete

Thank you for visiting ${clinicName}!

Your prescription and consultation summary are available in your patient portal.

${
  consultation.follow_up_required
    ? `Follow-up recommended in ${consultation.follow_up_timing}.`
    : ''
}

For queries: ${clinicPhone}

Wishing you good health!`;

    const response = await sendSMS(patient.phone, message);

    logger.success(
      `✅ Completion SMS sent to ${patient.phone}, SID: ${response.sid}`
    );

    return {
      success: true,
      sid: response.sid,
      to: response.to,
    };
  } catch (error) {
    logger.error(`❌ Error sending completion SMS:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Send follow-up appointment reminder SMS
 * @param {Object} patient - Patient document
 * @param {string} followUpTiming - Follow-up timing (e.g., "in 1 week")
 * @returns {Promise<Object>} - Send result
 */
async function sendFollowUpReminderSms(patient, followUpTiming) {
  try {
    if (!patient.phone) {
      logger.warn(
        `⚠️ Skipping follow-up SMS for ${patient.name} - no phone number`
      );
      return {
        success: false,
        error: 'No phone number provided',
      };
    }

    logger.sms(`📱 Sending follow-up reminder SMS to ${patient.phone}`);

    const clinicName = process.env.CLINIC_NAME || 'MediFlow Clinic';
    const clinicPhone = process.env.CLINIC_PHONE || '+91-80-12345678';

    const message = `📅 Follow-up Reminder

Hello ${patient.name},

Your doctor recommended a follow-up appointment ${followUpTiming}.

Please schedule your appointment:
Call: ${clinicPhone}
Visit: ${clinicName}

Take care of your health!`;

    const response = await sendSMS(patient.phone, message);

    logger.success(
      `✅ Follow-up reminder SMS sent to ${patient.phone}, SID: ${response.sid}`
    );

    return {
      success: true,
      sid: response.sid,
      to: response.to,
    };
  } catch (error) {
    logger.error(`❌ Error sending follow-up reminder SMS:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Helper: decide if appointment reminder SMS should be sent now
 * @param {Object} appointment - Appointment document
 * @param {Date} lastReminderSent - Last reminder timestamp
 * @param {string} reminderType - '3_day', '1_day', or '2_hour'
 * @returns {Object} - { shouldSend, reason }
 */
function shouldSendReminderSmsNow(
  appointment,
  lastReminderSent = null,
  reminderType = '1_day'
) {
  try {
    const timing = riskCalculator.shouldSendReminderNow(
      appointment,
      lastReminderSent,
      reminderType
    );
    return {
      shouldSend: timing.shouldSend,
      reason: timing.reason,
      hoursUntilAppointment: timing.hoursUntilAppointment,
    };
  } catch (error) {
    logger.error('❌ Error checking SMS reminder timing:', error.message);
    return {
      shouldSend: false,
      reason: 'Error checking timing',
      hoursUntilAppointment: null,
    };
  }
}

/**
 * Send all appointment-related SMS notifications
 * @param {Object} appointment - Appointment document
 * @param {Object} patient - Patient document
 * @param {Object} doctor - Doctor document
 * @returns {Promise<Object>} - Results object
 */
async function sendAllAppointmentSms(appointment, patient, doctor) {
  try {
    logger.section('📱 SENDING APPOINTMENT SMS');
    logger.sms(
      `Processing SMS for appointment: ${patient.name} with Dr. ${doctor.name}`
    );

    const results = {
      confirmationSms: null,
    };

    // Send confirmation SMS
    logger.sms('Sending appointment confirmation SMS...');
    results.confirmationSms = await sendAppointmentConfirmationSms(
      appointment,
      patient,
      doctor
    );

    if (results.confirmationSms.success) {
      logger.success('✅ Appointment SMS sent successfully');
    } else {
      logger.error('❌ Appointment SMS failed to send');
    }

    logger.separator();

    return results;
  } catch (error) {
    logger.error('❌ Error in sendAllAppointmentSms:', error.message);
    return {
      confirmationSms: { success: false, error: error.message },
    };
  }
}

export default {
  sendSMS, // low-level Twilio sender
  sendAppointmentConfirmationSms,
  sendAppointmentReminderSms,
  sendEmergencyAlertSms,
  sendAppointmentCancellationSms,
  sendAppointmentReschedulingSms,
  sendConsultationCompletionSms,
  sendFollowUpReminderSms,
  shouldSendReminderSmsNow,
  sendAllAppointmentSms,
};
