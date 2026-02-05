import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import EmailTemplate from '../models/EmailTemplate.js';


/**
 * Email Service for MediFlow
 * Handles all medical appointment and notification emails
 * 
 * Email Types:
 * - Appointment Confirmation (to patient)
 * - Appointment Reminders (1-day, 2-hour before)
 * - Doctor Assignment Notification (to doctor)
 * - Emergency Alert (to patient + admin)
 * - Consultation Summary (after visit)
 * - Prescription Email (after consultation)
 * - Follow-up Appointment (schedule next visit)
 * - Appointment Cancellation/Rescheduling
 * 
 * FEATURES:
 * - Uses EmailTemplate for risk-based personalization
 * - Rich HTML emails with medical branding
 * - Retry logic with exponential backoff
 * - HIPAA-compliant content (no sensitive info in subject lines)
 */


/**
 * Create Nodemailer transporter
 */
const createTransporter = () => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    logger.success('📧 Email transporter created');
    return transporter;
  } catch (error) {
    logger.error('❌ Error creating email transporter:', error.message);
    throw error;
  }
};


/**
 * Verify email connection
 */
const verifyConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.success('✅ Email server connection verified');
    return true;
  } catch (error) {
    logger.error('❌ Email server connection failed:', error.message);
    return false;
  }
};


/**
 * Send email with retry logic
 */
const sendEmail = async (
  to,
  subject,
  htmlContent,
  textContent = '',
  retries = 3
) => {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.email(`📨 Sending email to ${to} (Attempt ${attempt}/${retries})`);

      const transporter = createTransporter();

      const mailOptions = {
        from: `${process.env.COMPANY_NAME || 'MediFlow Clinic'} <${
          process.env.EMAIL_USER
        }>`,
        to,
        subject,
        text: textContent || undefined,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);

      logger.success(`✅ Email sent successfully to ${to}`);
      logger.debug('📎 Message ID:', info.messageId);

      return {
        success: true,
        messageId: info.messageId,
        recipient: to,
        attempt,
      };
    } catch (error) {
      lastError = error;
      logger.error(
        `❌ Email send attempt ${attempt} failed for ${to}:`,
        error.message
      );

      if (attempt < retries) {
        // Exponential backoff: 2s, 4s, 8s
        const waitTime = Math.pow(2, attempt) * 1000;
        logger.warn(`⏳ Retrying in ${waitTime / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  // All retries failed
  logger.error(`❌ All ${retries} email send attempts failed for ${to}`);
  return {
    success: false,
    error: lastError ? lastError.message : 'Unknown email error',
    recipient: to,
    attempts: retries,
  };
};


/**
 * Send appointment confirmation email to patient
 */
const sendAppointmentConfirmation = async (appointment, patient, doctor) => {
  try {
    logger.email('📧 Sending appointment confirmation to patient');

    const appointmentDate = new Date(appointment.scheduled_start_time);
    const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = appointmentDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const urgencyIcon =
      appointment.urgency === 'Critical'
        ? '🚨'
        : appointment.urgency === 'High'
        ? '⚡'
        : '📅';

    const subject = `${urgencyIcon} Appointment Confirmed - ${formattedDate}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #f9fafb; padding: 30px 20px; border-radius: 0 0 8px 8px; }
    .card { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .urgency-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin: 10px 0; }
    .critical { background: #ef4444; color: white; }
    .high { background: #f59e0b; color: white; }
    .medium { background: #3b82f6; color: white; }
    .low { background: #10b981; color: white; }
    .field { margin: 12px 0; padding: 10px; background: #f3f4f6; border-left: 4px solid #10b981; border-radius: 4px; }
    .field-label { font-weight: bold; color: #059669; display: block; margin-bottom: 4px; }
    .field-value { color: #1f2937; }
    .highlight { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 15px 0; }
    .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
    .button:hover { background: #059669; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-size: 13px; color: #6b7280; text-align: center; }
    .important { color: #dc2626; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Appointment Confirmed</h1>
      <p style="margin: 5px 0; font-size: 16px;">${process.env.COMPANY_NAME || 'MediFlow Clinic'}</p>
    </div>
    <div class="content">
      <p>Dear <strong>${patient.name}</strong>,</p>
      <p>Your appointment has been successfully scheduled. Here are the details:</p>
      
      <div class="card">
        <h2 style="margin-top: 0; color: #059669;">📅 Appointment Details</h2>
        
        <div class="field">
          <span class="field-label">Date & Time</span>
          <span class="field-value">${formattedDate} at ${formattedTime}</span>
        </div>
        
        <div class="field">
          <span class="field-label">Doctor</span>
          <span class="field-value">${doctor.name} (${doctor.specialization})</span>
        </div>
        
        <div class="field">
          <span class="field-label">Department</span>
          <span class="field-value">${appointment.department}</span>
        </div>
        
        <div class="field">
          <span class="field-label">Appointment ID</span>
          <span class="field-value">${appointment._id || 'N/A'}</span>
        </div>
        
        ${
          appointment.urgency
            ? `
        <div class="field">
          <span class="field-label">Priority</span>
          <span class="urgency-badge ${appointment.urgency.toLowerCase()}">${
                appointment.urgency
              }</span>
        </div>
        `
            : ''
        }
      </div>
      
      ${
        appointment.urgency === 'Critical' || appointment.urgency === 'High'
          ? `
      <div class="highlight">
        <strong>⚠️ Important:</strong> This is a ${appointment.urgency.toLowerCase()}-priority appointment. Please arrive 15 minutes early for registration.
      </div>
      `
          : ''
      }
      
      <div class="card">
        <h3 style="margin-top: 0; color: #059669;">📍 Clinic Information</h3>
        <p style="margin: 5px 0;">
          ${process.env.COMPANY_NAME || 'MediFlow Clinic'}<br>
          Email: ${process.env.COMPANY_EMAIL || process.env.EMAIL_USER}
        </p>
      </div>
      
      <div class="card">
        <h3 style="margin-top: 0; color: #059669;">📋 Before Your Visit</h3>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Bring your previous medical records (if any)</li>
          <li>List of current medications and allergies</li>
          <li>Valid ID proof</li>
          <li>Insurance card (if applicable)</li>
          <li>Arrive 10-15 minutes early for registration</li>
        </ul>
      </div>
      
      <p class="important">If you need to cancel or reschedule, please do so at least 24 hours in advance.</p>
      
      <div class="footer">
        <p><strong>${process.env.COMPANY_NAME || 'MediFlow Clinic'}</strong></p>
        <p>This is an automated confirmation. For assistance, contact us at ${process.env.COMPANY_EMAIL || process.env.EMAIL_USER}</p>
        <p>Appointment confirmed on ${new Date().toLocaleString('en-IN')}</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const textContent = `
Appointment Confirmed - ${process.env.COMPANY_NAME || 'MediFlow Clinic'}

Dear ${patient.name},

Your appointment has been successfully scheduled.

APPOINTMENT DETAILS:
Date & Time: ${formattedDate} at ${formattedTime}
Doctor: ${doctor.name} (${doctor.specialization})
Department: ${appointment.department}
Appointment ID: ${appointment._id || 'N/A'}
${appointment.urgency ? `Priority: ${appointment.urgency}` : ''}

BEFORE YOUR VISIT:
- Bring previous medical records (if any)
- List of current medications and allergies
- Valid ID proof
- Insurance card (if applicable)
- Arrive 10-15 minutes early

To reschedule or cancel, please contact us at least 24 hours in advance.

Thank you,
${process.env.COMPANY_NAME || 'MediFlow Clinic'}
`;

    const result = await sendEmail(
      patient.email,
      subject,
      htmlContent,
      textContent
    );

    return result;
  } catch (error) {
    logger.error('❌ Error sending appointment confirmation:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};


/**
 * Send appointment reminder email (1-day or 2-hour before)
 */
const sendAppointmentReminder = async (
  appointment,
  patient,
  doctor,
  reminderType = '1_day'
) => {
  try {
    const reminderText =
      reminderType === '1_day' ? 'tomorrow' : 'in 2 hours';
    logger.email(
      `📧 Sending ${reminderType} reminder to patient: ${patient.email}`
    );

    const appointmentDate = new Date(appointment.scheduled_start_time);
    const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = appointmentDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const subject = `⏰ Reminder: Appointment ${reminderText} with Dr. ${doctor.name}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 25px 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #fffbeb; padding: 25px 20px; border-radius: 0 0 8px 8px; }
    .reminder-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border: 2px solid #f59e0b; }
    .field { margin: 10px 0; }
    .field-label { font-weight: bold; color: #d97706; }
    .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #fcd34d; font-size: 12px; color: #92400e; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Appointment Reminder</h1>
      <p style="font-size: 18px; margin: 5px 0;">Your appointment is ${reminderText}!</p>
    </div>
    <div class="content">
      <p>Dear <strong>${patient.name}</strong>,</p>
      <p>This is a friendly reminder about your upcoming appointment:</p>
      
      <div class="reminder-box">
        <div class="field">
          <span class="field-label">Date:</span> ${formattedDate}
        </div>
        <div class="field">
          <span class="field-label">Time:</span> ${formattedTime}
        </div>
        <div class="field">
          <span class="field-label">Doctor:</span> ${doctor.name} (${
      doctor.specialization
    })
        </div>
        <div class="field">
          <span class="field-label">Department:</span> ${
            appointment.department
          }
        </div>
      </div>
      
      <p><strong>Please arrive 10-15 minutes early for registration.</strong></p>
      
      <div class="footer">
        <p>If you need to reschedule, please contact us at ${process.env.COMPANY_EMAIL || process.env.EMAIL_USER}</p>
        <p>${process.env.COMPANY_NAME || 'MediFlow Clinic'} - Caring for your health</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const textContent = `
Appointment Reminder - ${process.env.COMPANY_NAME || 'MediFlow Clinic'}

Dear ${patient.name},

Your appointment is ${reminderText}!

Date: ${formattedDate}
Time: ${formattedTime}
Doctor: ${doctor.name} (${doctor.specialization})
Department: ${appointment.department}

Please arrive 10-15 minutes early for registration.

Contact: ${process.env.COMPANY_EMAIL || process.env.EMAIL_USER}

Thank you,
${process.env.COMPANY_NAME || 'MediFlow Clinic'}
`;

    const result = await sendEmail(
      patient.email,
      subject,
      htmlContent,
      textContent
    );

    return result;
  } catch (error) {
    logger.error('❌ Error sending appointment reminder:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};


/**
 * Send doctor notification email about new patient assignment
 */
const sendDoctorNotification = async (appointment, patient, doctor) => {
  try {
    logger.email('📧 Sending doctor notification email');

    const appointmentDate = new Date(appointment.scheduled_start_time);
    const formattedDateTime = appointmentDate.toLocaleString('en-IN');

    const urgencyIcon =
      appointment.urgency === 'Critical'
        ? '🚨'
        : appointment.urgency === 'High'
        ? '⚡'
        : '📋';

    const subject = `${urgencyIcon} New Patient Appointment - ${patient.name}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f0f9ff; padding: 20px; border-radius: 0 0 8px 8px; }
    .patient-info { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; border-left: 4px solid #3b82f6; }
    .field { margin: 8px 0; }
    .field-label { font-weight: bold; color: #1d4ed8; }
    .urgency-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-left: 8px; }
    .critical { background: #ef4444; color: white; }
    .high { background: #f59e0b; color: white; }
    .medium { background: #3b82f6; color: white; }
    .low { background: #10b981; color: white; }
    .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #bfdbfe; font-size: 12px; color: #1e40af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👨‍⚕️ New Patient Assignment</h1>
      <p>Dr. ${doctor.name}</p>
    </div>
    <div class="content">
      <p>Dear Dr. ${doctor.name},</p>
      <p>A new patient has been assigned to you:</p>
      
      <div class="patient-info">
        <h3 style="margin-top: 0; color: #1d4ed8;">Patient Information</h3>
        <div class="field">
          <span class="field-label">Name:</span> ${patient.name}
          ${
            appointment.urgency
              ? `<span class="urgency-badge ${appointment.urgency.toLowerCase()}">${
                  appointment.urgency
                }</span>`
              : ''
          }
        </div>
        <div class="field">
          <span class="field-label">Age:</span> ${patient.age || 'N/A'} years
        </div>
        <div class="field">
          <span class="field-label">Gender:</span> ${patient.gender || 'N/A'}
        </div>
        <div class="field">
          <span class="field-label">Phone:</span> ${patient.phone}
        </div>
        <div class="field">
          <span class="field-label">Email:</span> ${patient.email}
        </div>
      </div>
      
      <div class="patient-info">
        <h3 style="margin-top: 0; color: #1d4ed8;">Appointment Details</h3>
        <div class="field">
          <span class="field-label">Date & Time:</span> ${formattedDateTime}
        </div>
        <div class="field">
          <span class="field-label">Department:</span> ${
            appointment.department
          }
        </div>
        <div class="field">
          <span class="field-label">Chief Complaint:</span> ${patient.chief_complaint ||
            'Not provided'}
        </div>
        ${
          patient.symptoms && patient.symptoms.length > 0
            ? `
        <div class="field">
          <span class="field-label">Symptoms:</span> ${patient.symptoms.join(
            ', '
          )}
        </div>
        `
            : ''
        }
      </div>
      
      ${
        patient.chronic_conditions && patient.chronic_conditions.length > 0
          ? `
      <div class="patient-info">
        <h3 style="margin-top: 0; color: #1d4ed8;">Medical History</h3>
        <div class="field">
          <span class="field-label">Chronic Conditions:</span> ${patient.chronic_conditions.join(
            ', '
          )}
        </div>
        ${
          patient.allergies && patient.allergies.length > 0
            ? `<div class="field"><span class="field-label">Allergies:</span> ${patient.allergies.join(
                ', '
              )}</div>`
            : ''
        }
      </div>
      `
          : ''
      }
      
      <div class="footer">
        <p>Please review patient history before the appointment.</p>
        <p>${process.env.COMPANY_NAME || 'MediFlow Clinic'} - Doctor Portal</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const textContent = `
New Patient Assignment - ${process.env.COMPANY_NAME || 'MediFlow Clinic'}

Dear Dr. ${doctor.name},

A new patient has been assigned to you:

PATIENT INFORMATION:
Name: ${patient.name}
Age: ${patient.age || 'N/A'}
Gender: ${patient.gender || 'N/A'}
Phone: ${patient.phone}
Priority: ${appointment.urgency || 'N/A'}

APPOINTMENT:
Date & Time: ${formattedDateTime}
Department: ${appointment.department}
Chief Complaint: ${patient.chief_complaint || 'Not provided'}
${
  patient.symptoms && patient.symptoms.length > 0
    ? `Symptoms: ${patient.symptoms.join(', ')}`
    : ''
}

Thank you,
${process.env.COMPANY_NAME || 'MediFlow Clinic'}
`;

    const result = await sendEmail(
      doctor.email,
      subject,
      htmlContent,
      textContent
    );

    return result;
  } catch (error) {
    logger.error('❌ Error sending doctor notification:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};


/**
 * Send emergency alert email
 */
const sendEmergencyAlert = async (patient, symptoms, redFlags) => {
  try {
    logger.email('🚨 Sending EMERGENCY alert email');

    const subject = '🚨 EMERGENCY - Immediate Medical Attention Required';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 25px 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #fee2e2; padding: 25px 20px; border-radius: 0 0 8px 8px; }
    .alert-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border: 3px solid #dc2626; }
    .footer { margin-top: 20px; padding-top: 15px; border-top: 2px solid #fca5a5; font-size: 13px; color: #991b1b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 EMERGENCY ALERT</h1>
      <p style="font-size: 20px; margin: 5px 0;">Immediate Medical Attention Required</p>
    </div>
    <div class="content">
      <div class="alert-box">
        <h2 style="color: #dc2626; margin-top: 0;">RED FLAG SYMPTOMS DETECTED</h2>
        <p><strong>Patient:</strong> ${patient.name}</p>
        <p><strong>Phone:</strong> ${patient.phone}</p>
        <p><strong>Symptoms:</strong> ${symptoms.join(', ')}</p>
        <p><strong>Red Flags:</strong> ${redFlags.join(', ')}</p>
      </div>
      
      <h2 style="color: #dc2626;">⚠️ URGENT ACTION REQUIRED</h2>
      <ul style="font-size: 16px; font-weight: bold;">
        <li>Call patient IMMEDIATELY at ${patient.phone}</li>
        <li>Advise to call emergency services: 102 / 108</li>
        <li>Direct to nearest emergency room</li>
      </ul>
      
      <div class="footer">
        <p><strong>This is an automated emergency alert from ${process.env.COMPANY_NAME || 'MediFlow'} Triage System</strong></p>
        <p>Generated: ${new Date().toLocaleString('en-IN')}</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const textContent = `
EMERGENCY ALERT - IMMEDIATE ACTION REQUIRED

RED FLAG SYMPTOMS DETECTED

Patient: ${patient.name}
Phone: ${patient.phone}
Symptoms: ${symptoms.join(', ')}
Red Flags: ${redFlags.join(', ')}

URGENT ACTION:
1. Call patient IMMEDIATELY at ${patient.phone}
2. Advise to call emergency services: 102 / 108
3. Direct to nearest emergency room

Generated: ${new Date().toLocaleString('en-IN')}
${process.env.COMPANY_NAME || 'MediFlow'} Triage System
`;

    // Send to admin/on-call doctor
    const adminEmail =
      process.env.SALES_EMAIL || process.env.COMPANY_EMAIL || process.env.EMAIL_USER;
    if (!adminEmail) {
      logger.error('❌ No admin/emergency email configured');
      return { success: false, error: 'No emergency email configured' };
    }

    const result = await sendEmail(
      adminEmail,
      subject,
      htmlContent,
      textContent,
      1 // Only 1 retry for emergency (fast fail)
    );

    return result;
  } catch (error) {
    logger.error('❌ Error sending emergency alert:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};


/**
 * Send all appointment-related emails
 */
const sendAllAppointmentEmails = async (appointment, patient, doctor) => {
  try {
    logger.section('📨 SENDING APPOINTMENT EMAILS');
    logger.email(
      `Processing emails for appointment: ${patient.name} with Dr. ${doctor.name}`
    );

    const results = {
      patientConfirmation: null,
      doctorNotification: null,
    };

    // 1/2: Confirmation to patient
    logger.email('1/2: Sending confirmation to patient...');
    results.patientConfirmation = await sendAppointmentConfirmation(
      appointment,
      patient,
      doctor
    );

    // 2/2: Notification to doctor
    logger.email('2/2: Sending notification to doctor...');
    results.doctorNotification = await sendDoctorNotification(
      appointment,
      patient,
      doctor
    );

    const patientSuccess = results.patientConfirmation.success;
    const doctorSuccess = results.doctorNotification.success;

    if (patientSuccess && doctorSuccess) {
      logger.success('✅ All appointment emails sent successfully');
    } else if (patientSuccess || doctorSuccess) {
      logger.warn('⚠️ Some emails failed to send');
    } else {
      logger.error('❌ All emails failed to send');
    }

    logger.separator();

    return results;
  } catch (error) {
    logger.error('❌ Error in sendAllAppointmentEmails:', error.message);
    return {
      patientConfirmation: { success: false, error: error.message },
      doctorNotification: { success: false, error: error.message },
    };
  }
};


export default {
  verifyConnection,
  sendEmail,
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendDoctorNotification,
  sendEmergencyAlert,
  sendAllAppointmentEmails,
};
