import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import SmsTemplate from '../models/SmsTemplate.js';
import logger from '../utils/logger.js';

// Get current file's directory (ES6 equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: join(__dirname, '../.env') });


/**
 * SMS Template Seeder for MediFlow
 * Populates database with medical appointment SMS templates
 * 
 * HIPAA Compliance:
 * - No sensitive medical information in SMS
 * - Generic appointment details only
 * - Professional, clear, actionable messages
 */


const CLINIC_NAME = process.env.CLINIC_NAME || 'MediFlow Clinic';
const CLINIC_PHONE = process.env.CLINIC_PHONE || '+91-80-12345678';


const smsTemplates = [
  // ==================== APPOINTMENT CONFIRMATION ====================
  {
    name: 'appointment-confirmation',
    description: 'Appointment confirmation SMS sent immediately after booking',
    category: 'appointment_confirmation',
    department: 'General',
    priority: 'high',
    message: `✅ Appointment Confirmed\n${CLINIC_NAME}\nDate: {{appointment_date}} at {{appointment_time}}\nDoctor: {{doctor_name}}\nDept: {{department}}\n\nPlease arrive 10-15 mins early.\nTo reschedule/cancel: ${CLINIC_PHONE}`,
    variables: ['appointment_date', 'appointment_time', 'doctor_name', 'department'],
    active: true,
    whatsapp_supported: true,
  },


  // ==================== 1-DAY REMINDER ====================
  {
    name: 'appointment-reminder-1day',
    description: 'Appointment reminder sent 1 day before scheduled appointment',
    category: 'appointment_reminder_1day',
    department: 'General',
    priority: 'high',
    message: `⏰ Appointment Reminder\n\n${CLINIC_NAME}\nYour appointment is tomorrow at {{appointment_time}}\nDoctor: {{doctor_name}}\n\nPlease arrive 10-15 mins early.`,
    variables: ['appointment_time', 'doctor_name'],
    active: true,
    whatsapp_supported: true,
  },


  // ==================== 2-HOUR REMINDER ====================
  {
    name: 'appointment-reminder-2hour',
    description: 'Appointment reminder sent 2 hours before scheduled appointment',
    category: 'appointment_reminder_2hour',
    department: 'General',
    priority: 'high',
    message: `⏰ Appointment Reminder\n\n${CLINIC_NAME}\nYour appointment is in 2 hours at {{appointment_time}}\nDoctor: {{doctor_name}}\n\nLocation: {{clinic_address}}\n\nPlease arrive 10-15 mins early.`,
    variables: ['appointment_time', 'doctor_name', 'clinic_address'],
    active: true,
    whatsapp_supported: true,
  },


  // ==================== APPOINTMENT CANCELLATION ====================
  {
    name: 'appointment-cancellation',
    description: 'Appointment cancellation confirmation SMS',
    category: 'appointment_cancellation',
    department: 'General',
    priority: 'medium',
    message: `❌ Appointment Cancelled\n\n${CLINIC_NAME}\nDate: {{appointment_date}} at {{appointment_time}}\n\nTo reschedule, call: ${CLINIC_PHONE}\n\nWe hope to serve you soon.`,
    variables: ['appointment_date', 'appointment_time'],
    active: true,
    whatsapp_supported: true,
  },


  // ==================== NO-SHOW FOLLOW-UP ====================
  {
    name: 'no-show-followup',
    description: 'Follow-up SMS for patients who missed their appointment',
    category: 'no_show_followup',
    department: 'General',
    priority: 'medium',
    message: `Hi {{patient_name}},\n\nWe missed you at your appointment today at ${CLINIC_NAME}.\n\nWould you like to reschedule?\nCall: ${CLINIC_PHONE}\n\nTake care of your health!`,
    variables: ['patient_name'],
    active: true,
    whatsapp_supported: true,
  },


  // ==================== FOLLOW-UP REMINDER ====================
  {
    name: 'follow-up-reminder',
    description: 'Reminder for patients who need follow-up appointments',
    category: 'follow_up_reminder',
    department: 'General',
    priority: 'medium',
    message: `📅 Follow-up Reminder\n\nHello {{patient_name}},\n\nYour doctor recommended a follow-up appointment.\n\nPlease schedule your appointment:\nCall: ${CLINIC_PHONE}\nVisit: ${CLINIC_NAME}\n\nTake care of your health!`,
    variables: ['patient_name'],
    active: true,
    whatsapp_supported: true,
  },


  // ==================== WELCOME NEW PATIENT ====================
  {
    name: 'welcome-new-patient',
    description: 'Welcome SMS for new patients after registration',
    category: 'welcome_new_patient',
    department: 'General',
    priority: 'low',
    message: `🏥 Welcome to ${CLINIC_NAME}!\n\nHi {{patient_name}},\n\nThank you for choosing us for your healthcare needs.\n\nFor appointments: ${CLINIC_PHONE}\n\nWishing you good health!`,
    variables: ['patient_name'],
    active: true,
    whatsapp_supported: true,
  },


  // ==================== CARDIOLOGY DEPARTMENT SPECIFIC ====================
  {
    name: 'cardiology-appointment-confirmation',
    description: 'Cardiology-specific appointment confirmation with department instructions',
    category: 'appointment_confirmation',
    department: 'Cardiology',
    priority: 'high',
    message: `✅ Cardiology Appointment Confirmed\n${CLINIC_NAME}\nDate: {{appointment_date}} at {{appointment_time}}\nDoctor: {{doctor_name}}\n\n⚠️ Please fast for 8 hours before appointment if ECG/blood tests are scheduled.\n\nArrival: 10-15 mins early\nReschedule: ${CLINIC_PHONE}`,
    variables: ['appointment_date', 'appointment_time', 'doctor_name'],
    active: true,
    whatsapp_supported: true,
  },


  // ==================== NEUROLOGY DEPARTMENT SPECIFIC ====================
  {
    name: 'neurology-appointment-confirmation',
    description: 'Neurology-specific appointment confirmation with department instructions',
    category: 'appointment_confirmation',
    department: 'Neurology',
    priority: 'high',
    message: `✅ Neurology Appointment Confirmed\n${CLINIC_NAME}\nDate: {{appointment_date}} at {{appointment_time}}\nDoctor: {{doctor_name}}\n\nPlease bring previous MRI/CT scan reports if any.\n\nArrival: 10-15 mins early\nReschedule: ${CLINIC_PHONE}`,
    variables: ['appointment_date', 'appointment_time', 'doctor_name'],
    active: true,
    whatsapp_supported: true,
  },


  // ==================== ORTHOPEDICS DEPARTMENT SPECIFIC ====================
  {
    name: 'orthopedics-appointment-confirmation',
    description: 'Orthopedics-specific appointment confirmation with department instructions',
    category: 'appointment_confirmation',
    department: 'Orthopedics',
    priority: 'high',
    message: `✅ Orthopedics Appointment Confirmed\n${CLINIC_NAME}\nDate: {{appointment_date}} at {{appointment_time}}\nDoctor: {{doctor_name}}\n\nPlease bring previous X-ray/MRI reports if any.\n\nArrival: 10-15 mins early\nReschedule: ${CLINIC_PHONE}`,
    variables: ['appointment_date', 'appointment_time', 'doctor_name'],
    active: true,
    whatsapp_supported: true,
  },


  // ==================== GENERAL MEDICINE DEPARTMENT SPECIFIC ====================
  {
    name: 'general-medicine-appointment-confirmation',
    description: 'General Medicine-specific appointment confirmation with department instructions',
    category: 'appointment_confirmation',
    department: 'General Medicine',
    priority: 'high',
    message: `✅ General Medicine Appointment Confirmed\n${CLINIC_NAME}\nDate: {{appointment_date}} at {{appointment_time}}\nDoctor: {{doctor_name}}\n\nPlease bring previous medical records and list of current medications.\n\nArrival: 10-15 mins early\nReschedule: ${CLINIC_PHONE}`,
    variables: ['appointment_date', 'appointment_time', 'doctor_name'],
    active: true,
    whatsapp_supported: true,
  },
];


async function seedSmsTemplates() {
  try {
    logger.section('SEEDING MEDICAL SMS TEMPLATES');

    // Verify MONGODB_URI is loaded
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables. Check your .env file!');
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    logger.success('Connected to MongoDB');


    // Clear existing SMS templates
    const deleteResult = await SmsTemplate.deleteMany({});
    logger.info(`Cleared ${deleteResult.deletedCount} existing SMS templates`);


    // Insert new templates
    const insertedTemplates = await SmsTemplate.insertMany(smsTemplates);
    logger.success(`Inserted ${insertedTemplates.length} SMS templates`);


    // Display templates
    insertedTemplates.forEach((template) => {
      logger.info(
        `✅ ${template.name} [${template.category}] (${template.department}, priority=${template.priority})`
      );
    });


    logger.separator();
    logger.success('Medical SMS templates seeded successfully!');


    process.exit(0);
  } catch (error) {
    logger.error('Error seeding SMS templates:', error.message);
    process.exit(1);
  }
}


// Run the seed function
seedSmsTemplates();
