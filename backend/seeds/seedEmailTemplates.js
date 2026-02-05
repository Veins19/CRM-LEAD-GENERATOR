import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import EmailTemplate from '../models/EmailTemplate.js';
import logger from '../utils/logger.js';

// Get current file's directory (ES6 equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: join(__dirname, '../.env') });


/**
 * Email Template Seeder for MediFlow
 * Populates database with medical appointment email templates
 * 
 * Templates:
 * - Appointment Confirmation
 * - Appointment Reminder (1-day before)
 * - Appointment Cancellation
 * - Welcome New Patient
 */


const CLINIC_EMAIL = process.env.CLINIC_EMAIL || process.env.SMTP_FROM_EMAIL || 'clinic@mediflow.com';
const CLINIC_NAME = process.env.CLINIC_NAME || 'MediFlow Clinic';
const CLINIC_PHONE = process.env.CLINIC_PHONE || '+91-80-12345678';
const CLINIC_ADDRESS = process.env.CLINIC_ADDRESS || '123 Medical Center, Bangalore, Karnataka 560001';


const templates = [
  // ==================== APPOINTMENT CONFIRMATION ====================
  {
    name: 'appointment-confirmation',
    description: 'Appointment confirmation email sent immediately after booking',
    department: 'General',
    category: 'appointment_confirmation',
    priority: 'high',
    subject: '✅ Appointment Confirmed - {{patient_name}} at {{clinic_name}}',
    html_content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .content {
      padding: 30px 20px;
    }
    .appointment-details {
      background: #f0fdf4;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #10b981;
    }
    .detail-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-label {
      font-weight: 600;
      width: 140px;
      color: #059669;
    }
    .detail-value {
      flex: 1;
    }
    .important-info {
      background: #fef3c7;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #f59e0b;
    }
    .footer {
      text-align: center;
      padding: 20px;
      background: #f9fafb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Appointment Confirmed</h1>
      <p>{{clinic_name}}</p>
    </div>
    
    <div class="content">
      <p>Dear <strong>{{patient_name}}</strong>,</p>
      
      <p>Your appointment has been successfully scheduled. We look forward to seeing you!</p>
      
      <div class="appointment-details">
        <h3 style="margin-top: 0; color: #059669;">📅 Appointment Details</h3>
        <div class="detail-row">
          <div class="detail-label">Date & Time:</div>
          <div class="detail-value"><strong>{{appointment_date}} at {{appointment_time}}</strong></div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Doctor:</div>
          <div class="detail-value">{{doctor_name}}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Department:</div>
          <div class="detail-value">{{department}}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Clinic Address:</div>
          <div class="detail-value">{{clinic_address}}</div>
        </div>
      </div>
      
      <div class="important-info">
        <h4 style="margin-top: 0;">⏰ Important Reminders</h4>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Please arrive <strong>10-15 minutes early</strong> for registration</li>
          <li>Bring your <strong>ID proof and previous medical records</strong></li>
          <li>If you're a new patient, complete the registration form</li>
          <li>Wear a <strong>mask</strong> and follow clinic safety protocols</li>
        </ul>
      </div>
      
      <p><strong>Need to reschedule or cancel?</strong><br>
      Please call us at <a href="tel:{{clinic_phone}}">{{clinic_phone}}</a> at least 24 hours in advance.</p>
      
      <p>If you have any questions, feel free to contact us.</p>
      
      <p>Take care of your health!</p>
      
      <p>Best regards,<br>
      <strong>{{clinic_name}} Team</strong><br>
      📞 {{clinic_phone}}<br>
      📧 ${CLINIC_EMAIL}</p>
    </div>
    
    <div class="footer">
      <p>{{clinic_name}} | {{clinic_address}}</p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 10px;">
        This is an automated appointment confirmation email.
      </p>
    </div>
  </div>
</body>
</html>`,
    text_content: `APPOINTMENT CONFIRMED

Dear {{patient_name}},

Your appointment has been successfully scheduled at {{clinic_name}}.

APPOINTMENT DETAILS:
📅 Date & Time: {{appointment_date}} at {{appointment_time}}
👨‍⚕️ Doctor: {{doctor_name}}
🏥 Department: {{department}}
📍 Address: {{clinic_address}}

IMPORTANT REMINDERS:
• Please arrive 10-15 minutes early for registration
• Bring your ID proof and previous medical records
• If you're a new patient, complete the registration form
• Wear a mask and follow clinic safety protocols

NEED TO RESCHEDULE OR CANCEL?
Please call us at {{clinic_phone}} at least 24 hours in advance.

If you have any questions, feel free to contact us.

Take care of your health!

Best regards,
{{clinic_name}} Team
📞 {{clinic_phone}}
📧 ${CLINIC_EMAIL}

{{clinic_name}} | {{clinic_address}}`,
    variables: [
      '{{patient_name}}',
      '{{appointment_date}}',
      '{{appointment_time}}',
      '{{doctor_name}}',
      '{{department}}',
      '{{clinic_name}}',
      '{{clinic_address}}',
      '{{clinic_phone}}'
    ],
  },


  // ==================== APPOINTMENT REMINDER (1-DAY BEFORE) ====================
  {
    name: 'appointment-reminder-1day',
    description: 'Appointment reminder sent 1 day before scheduled appointment',
    department: 'General',
    category: 'appointment_reminder_1day',
    priority: 'high',
    subject: '⏰ Reminder: Your appointment tomorrow at {{clinic_name}}',
    html_content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .content {
      padding: 30px 20px;
    }
    .reminder-box {
      background: #dbeafe;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #3b82f6;
      text-align: center;
    }
    .time-display {
      font-size: 24px;
      font-weight: bold;
      color: #1e40af;
      margin: 10px 0;
    }
    .footer {
      text-align: center;
      padding: 20px;
      background: #f9fafb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Appointment Reminder</h1>
      <p>{{clinic_name}}</p>
    </div>
    
    <div class="content">
      <p>Dear <strong>{{patient_name}}</strong>,</p>
      
      <p>This is a friendly reminder about your upcoming appointment.</p>
      
      <div class="reminder-box">
        <h3 style="margin-top: 0; color: #1e40af;">Your appointment is TOMORROW</h3>
        <div class="time-display">{{appointment_time}}</div>
        <p style="margin: 5px 0;"><strong>{{appointment_date}}</strong></p>
        <p style="margin: 5px 0;">Dr. {{doctor_name}} | {{department}}</p>
      </div>
      
      <p><strong>📍 Location:</strong><br>
      {{clinic_address}}</p>
      
      <p><strong>✅ Before you come:</strong></p>
      <ul>
        <li>Arrive 10-15 minutes early</li>
        <li>Bring ID proof and medical records</li>
        <li>Wear a mask</li>
        <li>List any medications you're currently taking</li>
      </ul>
      
      <p><strong>Need to reschedule?</strong><br>
      Call us at <a href="tel:{{clinic_phone}}">{{clinic_phone}}</a></p>
      
      <p>We look forward to seeing you tomorrow!</p>
      
      <p>Best regards,<br>
      <strong>{{clinic_name}} Team</strong></p>
    </div>
    
    <div class="footer">
      <p>{{clinic_name}} | {{clinic_phone}}</p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 10px;">
        Automated appointment reminder
      </p>
    </div>
  </div>
</body>
</html>`,
    text_content: `APPOINTMENT REMINDER

Dear {{patient_name}},

This is a friendly reminder about your upcoming appointment.

YOUR APPOINTMENT IS TOMORROW
⏰ {{appointment_time}}
📅 {{appointment_date}}
👨‍⚕️ Dr. {{doctor_name}} | {{department}}

LOCATION:
{{clinic_address}}

BEFORE YOU COME:
✅ Arrive 10-15 minutes early
✅ Bring ID proof and medical records
✅ Wear a mask
✅ List any medications you're currently taking

NEED TO RESCHEDULE?
Call us at {{clinic_phone}}

We look forward to seeing you tomorrow!

Best regards,
{{clinic_name}} Team
{{clinic_phone}}`,
    variables: [
      '{{patient_name}}',
      '{{appointment_date}}',
      '{{appointment_time}}',
      '{{doctor_name}}',
      '{{department}}',
      '{{clinic_name}}',
      '{{clinic_address}}',
      '{{clinic_phone}}'
    ],
  },


  // ==================== APPOINTMENT CANCELLATION ====================
  {
    name: 'appointment-cancellation',
    description: 'Appointment cancellation confirmation email',
    department: 'General',
    category: 'appointment_cancellation',
    priority: 'medium',
    subject: '❌ Appointment Cancelled - {{clinic_name}}',
    html_content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .content {
      padding: 30px 20px;
    }
    .cancellation-box {
      background: #fee2e2;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #ef4444;
    }
    .footer {
      text-align: center;
      padding: 20px;
      background: #f9fafb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Appointment Cancelled</h1>
      <p>{{clinic_name}}</p>
    </div>
    
    <div class="content">
      <p>Dear <strong>{{patient_name}}</strong>,</p>
      
      <p>Your appointment has been cancelled as requested.</p>
      
      <div class="cancellation-box">
        <h3 style="margin-top: 0; color: #dc2626;">Cancelled Appointment</h3>
        <p><strong>Date & Time:</strong> {{appointment_date}} at {{appointment_time}}</p>
        <p><strong>Doctor:</strong> Dr. {{doctor_name}}</p>
        <p><strong>Department:</strong> {{department}}</p>
      </div>
      
      <p>We hope to serve you again soon. If you'd like to reschedule, please call us at <a href="tel:{{clinic_phone}}">{{clinic_phone}}</a>.</p>
      
      <p>Take care of your health!</p>
      
      <p>Best regards,<br>
      <strong>{{clinic_name}} Team</strong><br>
      📞 {{clinic_phone}}</p>
    </div>
    
    <div class="footer">
      <p>{{clinic_name}} | {{clinic_address}}</p>
    </div>
  </div>
</body>
</html>`,
    text_content: `APPOINTMENT CANCELLED

Dear {{patient_name}},

Your appointment has been cancelled as requested.

CANCELLED APPOINTMENT:
📅 Date & Time: {{appointment_date}} at {{appointment_time}}
👨‍⚕️ Doctor: Dr. {{doctor_name}}
🏥 Department: {{department}}

We hope to serve you again soon. If you'd like to reschedule, please call us at {{clinic_phone}}.

Take care of your health!

Best regards,
{{clinic_name}} Team
📞 {{clinic_phone}}

{{clinic_name}} | {{clinic_address}}`,
    variables: [
      '{{patient_name}}',
      '{{appointment_date}}',
      '{{appointment_time}}',
      '{{doctor_name}}',
      '{{department}}',
      '{{clinic_name}}',
      '{{clinic_address}}',
      '{{clinic_phone}}'
    ],
  },


  // ==================== WELCOME NEW PATIENT ====================
  {
    name: 'welcome-new-patient',
    description: 'Welcome email for new patients after first consultation',
    department: 'General',
    category: 'welcome_new_patient',
    priority: 'medium',
    subject: '🏥 Welcome to {{clinic_name}} - {{patient_name}}',
    html_content: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .content {
      padding: 30px 20px;
    }
    .welcome-box {
      background: #f5f3ff;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #8b5cf6;
    }
    .footer {
      text-align: center;
      padding: 20px;
      background: #f9fafb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 Welcome to {{clinic_name}}</h1>
    </div>
    
    <div class="content">
      <p>Dear <strong>{{patient_name}}</strong>,</p>
      
      <div class="welcome-box">
        <h3 style="margin-top: 0; color: #7c3aed;">Thank you for choosing us!</h3>
        <p>We're honored to be part of your healthcare journey. Our team is committed to providing you with the best medical care possible.</p>
      </div>
      
      <p><strong>📞 Contact Us:</strong></p>
      <ul>
        <li>Phone: {{clinic_phone}}</li>
        <li>Email: ${CLINIC_EMAIL}</li>
        <li>Address: {{clinic_address}}</li>
      </ul>
      
      <p>If you have any questions or need assistance, don't hesitate to reach out!</p>
      
      <p>Take care of your health!</p>
      
      <p>Best regards,<br>
      <strong>{{clinic_name}} Team</strong></p>
    </div>
    
    <div class="footer">
      <p>{{clinic_name}} | {{clinic_address}}</p>
    </div>
  </div>
</body>
</html>`,
    text_content: `WELCOME TO {{clinic_name}}

Dear {{patient_name}},

Thank you for choosing us! We're honored to be part of your healthcare journey. Our team is committed to providing you with the best medical care possible.

CONTACT US:
📞 Phone: {{clinic_phone}}
📧 Email: ${CLINIC_EMAIL}
📍 Address: {{clinic_address}}

If you have any questions or need assistance, don't hesitate to reach out!

Take care of your health!

Best regards,
{{clinic_name}} Team

{{clinic_name}} | {{clinic_address}}`,
    variables: [
      '{{patient_name}}',
      '{{clinic_name}}',
      '{{clinic_address}}',
      '{{clinic_phone}}'
    ],
  },
];


/**
 * Seed email templates
 */
const seedTemplates = async () => {
  try {
    logger.section('SEEDING MEDICAL EMAIL TEMPLATES');

    // Verify MONGODB_URI is loaded
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables. Check your .env file!');
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    logger.success('Connected to MongoDB');


    // Clear existing templates
    const deleteResult = await EmailTemplate.deleteMany({});
    logger.info(`Cleared ${deleteResult.deletedCount} existing templates`);


    // Insert new templates
    const insertedTemplates = await EmailTemplate.insertMany(templates);
    logger.success(`Inserted ${insertedTemplates.length} email templates`);


    // Display templates
    insertedTemplates.forEach((template) => {
      logger.info(
        `✅ ${template.name} [${template.category}] (${template.department}, priority=${template.priority})`
      );
    });


    logger.separator();
    logger.success('Medical email templates seeded successfully!');


    process.exit(0);
  } catch (error) {
    logger.error('Error seeding templates:', error.message);
    process.exit(1);
  }
};


// Run seeder
seedTemplates();
