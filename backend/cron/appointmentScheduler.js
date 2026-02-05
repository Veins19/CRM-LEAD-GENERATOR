import cron from 'node-cron';
import logger from '../utils/logger.js';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import emailService from '../services/emailService.js';
import smsService from '../services/smsService.js';
import SmsTemplate from '../models/SmsTemplate.js';
import {
  formatDateTime,
  getMinutesUntilAppointment,
  isAppointmentStartingSoon,
  isPatientLate,
} from '../utils/timeSlotGenerator.js';


/**
 * Appointment Scheduler for MediFlow
 * Handles automated reminders and appointment status updates
 * Industry standard: 3-day, 1-day, 2-hour reminders + no-show management
 */


/**
 * Send appointment confirmation reminders to patients who haven't confirmed yet
 * Runs every 1 minute to check for appointments needing confirmation
 */
const sendConfirmationReminders = async () => {
  try {
    // Find appointments with generated slots that need confirmation reminders
    const appointments = await Appointment.find({
      status: 'slots_generated',
      'confirmation_reminders.sent_count': { $lt: 3 }, // Max 3 reminders
    }).populate('patient_id');


    if (appointments.length === 0) {
      return; // No appointments need confirmation reminders
    }


    logger.info(`🔍 Found ${appointments.length} appointments needing confirmation reminders check`);


    for (const appointment of appointments) {
      try {
        const patient = appointment.patient_id;


        // Only send reminders to high-priority patients (Emergency/Medium risk) with phone numbers
        if (!['Emergency', 'Medium'].includes(patient.risk_classification) || !patient.phone) {
          continue;
        }


        const reminderCount = appointment.confirmation_reminders.sent_count;
        const lastSentAt = appointment.confirmation_reminders.last_sent_at;
        const now = new Date();


        // Calculate time since last reminder (or since slots generated)
        const referenceTime = lastSentAt || appointment.slots_generated_at;
        const minutesSinceLastReminder = Math.floor((now - referenceTime) / (1000 * 60));


        // Determine if it's time to send next reminder
        let shouldSendReminder = false;
        let reminderDelay = 0;


        if (reminderCount === 0 && minutesSinceLastReminder >= 0.17) {
          // First reminder: 10 seconds after slots generated (0.17 min)
          shouldSendReminder = true;
          reminderDelay = '10 seconds';
        } else if (reminderCount === 1 && minutesSinceLastReminder >= 2) {
          // Second reminder: 2 minutes after first
          shouldSendReminder = true;
          reminderDelay = '2 minutes';
        } else if (reminderCount === 2 && minutesSinceLastReminder >= 5) {
          // Third reminder: 5 minutes after second
          shouldSendReminder = true;
          reminderDelay = '5 minutes';
        }


        if (!shouldSendReminder) {
          continue;
        }


        logger.info(`📤 Sending confirmation reminder ${reminderCount + 1}/3 to ${patient.name} (${patient.email})`);


        // Get SMS template for appointment confirmation reminder
        const smsTemplate = await SmsTemplate.findOne({
          name: 'Appointment Confirmation Reminder',
          is_active: true,
        });


        if (!smsTemplate) {
          logger.warn('⚠️ Appointment confirmation reminder SMS template not found');
          continue;
        }


        // Prepare SMS message
        const smsMessage = smsTemplate.body
          .replace('{{patient_name}}', patient.name)
          .replace('{{reminder_number}}', reminderCount + 1)
          .replace('{{booking_link}}', `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/book-appointment/${appointment._id}`);


        // Send SMS/WhatsApp
        try {
          const smsResult = await smsService.sendSMS(patient.phone, smsMessage);


          // Update appointment with reminder record
          await appointment.addConfirmationReminder('sms', 'sent');


          // Update patient reminder count
          await patient.incrementConfirmationReminderCount();


          logger.success(`✅ Confirmation reminder ${reminderCount + 1}/3 sent to ${patient.phone}`);


          // Check if this was the last reminder
          if (reminderCount + 1 >= 3) {
            logger.warn(`⚠️ Patient ${patient.email} has exhausted all 3 confirmation reminders`);


            // Mark patient as unresponsive (industry standard: 3 strikes rule)
            await patient.markAsUnresponsive();
            logger.info(`🚫 Patient ${patient.email} marked as unresponsive`);
          }
        } catch (smsError) {
          logger.error(`❌ Failed to send confirmation reminder SMS to ${patient.phone}:`, smsError.message);
          await appointment.addConfirmationReminder('sms', 'failed');
        }
      } catch (error) {
        logger.error(`❌ Error processing confirmation reminder for appointment ${appointment._id}:`, error.message);
      }
    }
  } catch (error) {
    logger.error('❌ Error in sendConfirmationReminders job:', error.message);
  }
};


/**
 * Send 3-day advance appointment reminders
 * Medical industry standard: First reminder 3 days before appointment
 * Runs every hour
 */
const send3DayReminders = async () => {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const threeDaysPlus1Hour = new Date(threeDaysFromNow.getTime() + 60 * 60 * 1000);


    // Find appointments scheduled 3 days from now that haven't received 3-day reminder
    const appointments = await Appointment.find({
      status: 'scheduled',
      scheduled_start_time: { 
        $gte: threeDaysFromNow, 
        $lt: threeDaysPlus1Hour 
      },
      '3_day_reminder.sent': false,
    }).populate('patient_id doctor_id');


    if (appointments.length === 0) {
      return;
    }


    logger.info(`📅 Found ${appointments.length} appointments needing 3-day reminders`);


    for (const appointment of appointments) {
      try {
        const patient = appointment.patient_id;
        const doctor = appointment.doctor_id;


        logger.info(`📤 Sending 3-day reminder to ${patient.name} for appointment with Dr. ${doctor.name}`);


        let emailSent = false;
        let smsSent = false;


        // Send email reminder
        try {
          const emailSubject = `📅 Appointment Reminder - 3 Days to Go`;
          const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0066CC;">Appointment Reminder</h2>
              
              <p>Hi ${patient.name},</p>
              
              <p>This is a friendly reminder that you have an appointment in <strong>3 days</strong>.</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>👨‍⚕️ Doctor:</strong> Dr. ${doctor.name} (${doctor.specialty})</p>
                <p style="margin: 5px 0;"><strong>📅 Date & Time:</strong> ${formatDateTime(appointment.scheduled_start_time)}</p>
                <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${process.env.CLINIC_NAME || 'MediFlow Clinic'}</p>
                <p style="margin: 5px 0;"><strong>📝 Chief Complaint:</strong> ${appointment.chief_complaint || 'General Consultation'}</p>
              </div>
              
              <p><strong>Please confirm your appointment by replying C to this message or calling us at ${process.env.CLINIC_PHONE || '1800-XXX-XXXX'}.</strong></p>
              
              <p>If you need to reschedule, please contact us at least 24 hours in advance.</p>
              
              <p>We look forward to seeing you!</p>
              
              <p>Best regards,<br>${process.env.CLINIC_NAME || 'MediFlow Clinic'}</p>
            </div>
          `;


          await emailService.sendEmail(patient.email, emailSubject, emailBody);
          emailSent = true;
          logger.success(`✅ 3-day email reminder sent to ${patient.email}`);
        } catch (emailError) {
          logger.error(`❌ Failed to send 3-day email reminder to ${patient.email}:`, emailError.message);
        }


        // Send SMS/WhatsApp reminder
        if (patient.phone) {
          try {
            const smsMessage = `Hi ${patient.name}! Reminder: Your appointment with Dr. ${doctor.name} is in 3 days on ${formatDateTime(appointment.scheduled_start_time)}. Reply C to confirm. - ${process.env.CLINIC_NAME || 'MediFlow Clinic'}`;
            await smsService.sendSMS(patient.phone, smsMessage);
            smsSent = true;
            logger.success(`✅ 3-day SMS reminder sent to ${patient.phone}`);
          } catch (smsError) {
            logger.error(`❌ Failed to send 3-day SMS reminder to ${patient.phone}:`, smsError.message);
          }
        }


        // Update appointment 3-day reminder status
        await appointment.mark3DayReminderSent(emailSent, smsSent);


        logger.success(`✅ 3-day reminder sent for appointment ${appointment._id}`);
      } catch (error) {
        logger.error(`❌ Error sending 3-day reminder for appointment ${appointment._id}:`, error.message);
      }
    }
  } catch (error) {
    logger.error('❌ Error in send3DayReminders job:', error.message);
  }
};


/**
 * Send 1-day advance appointment reminders
 * Medical industry standard: Second reminder 1 day before appointment
 * Runs every hour
 */
const send1DayReminders = async () => {
  try {
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneDayPlus1Hour = new Date(oneDayFromNow.getTime() + 60 * 60 * 1000);


    // Find appointments scheduled 1 day from now that haven't received 1-day reminder
    const appointments = await Appointment.find({
      status: 'scheduled',
      scheduled_start_time: { 
        $gte: oneDayFromNow, 
        $lt: oneDayPlus1Hour 
      },
      '1_day_reminder.sent': false,
    }).populate('patient_id doctor_id');


    if (appointments.length === 0) {
      return;
    }


    logger.info(`📅 Found ${appointments.length} appointments needing 1-day reminders`);


    for (const appointment of appointments) {
      try {
        const patient = appointment.patient_id;
        const doctor = appointment.doctor_id;


        logger.info(`📤 Sending 1-day reminder to ${patient.name} for appointment with Dr. ${doctor.name}`);


        let emailSent = false;
        let smsSent = false;


        // Send email reminder with clinic directions
        try {
          const emailSubject = `⏰ Tomorrow's Appointment - Dr. ${doctor.name}`;
          const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0066CC;">Your Appointment is Tomorrow!</h2>
              
              <p>Hi ${patient.name},</p>
              
              <p>This is a reminder that your appointment is <strong>tomorrow</strong>.</p>
              
              <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0066CC;">
                <p style="margin: 5px 0;"><strong>👨‍⚕️ Doctor:</strong> Dr. ${doctor.name} (${doctor.specialty})</p>
                <p style="margin: 5px 0;"><strong>📅 Date & Time:</strong> ${formatDateTime(appointment.scheduled_start_time)}</p>
                <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${process.env.CLINIC_ADDRESS || 'MediFlow Clinic, Address Line'}</p>
                <p style="margin: 5px 0;"><strong>🅿️ Parking:</strong> ${process.env.CLINIC_PARKING_INFO || 'Available at clinic premises'}</p>
              </div>
              
              <p><strong>⚠️ Please arrive 10 minutes early for registration.</strong></p>
              
              <p><strong>📋 What to bring:</strong></p>
              <ul>
                <li>Valid ID proof</li>
                <li>Previous medical records (if any)</li>
                <li>Insurance card (if applicable)</li>
                <li>List of current medications</li>
              </ul>
              
              <p>Need to cancel or reschedule? Please call us at ${process.env.CLINIC_PHONE || '1800-XXX-XXXX'} at least 4 hours in advance.</p>
              
              <p>See you tomorrow!</p>
              
              <p>Best regards,<br>${process.env.CLINIC_NAME || 'MediFlow Clinic'}</p>
            </div>
          `;


          await emailService.sendEmail(patient.email, emailSubject, emailBody);
          emailSent = true;
          logger.success(`✅ 1-day email reminder sent to ${patient.email}`);
        } catch (emailError) {
          logger.error(`❌ Failed to send 1-day email reminder to ${patient.email}:`, emailError.message);
        }


        // Send SMS/WhatsApp reminder
        if (patient.phone) {
          try {
            const smsMessage = `Reminder: Your appointment with Dr. ${doctor.name} is tomorrow at ${formatDateTime(appointment.scheduled_start_time)}. Location: ${process.env.CLINIC_ADDRESS || 'MediFlow Clinic'}. Arrive 10 mins early. - ${process.env.CLINIC_NAME || 'MediFlow'}`;
            await smsService.sendSMS(patient.phone, smsMessage);
            smsSent = true;
            logger.success(`✅ 1-day SMS reminder sent to ${patient.phone}`);
          } catch (smsError) {
            logger.error(`❌ Failed to send 1-day SMS reminder to ${patient.phone}:`, smsError.message);
          }
        }


        // Update appointment 1-day reminder status
        await appointment.mark1DayReminderSent(emailSent, smsSent);


        logger.success(`✅ 1-day reminder sent for appointment ${appointment._id}`);
      } catch (error) {
        logger.error(`❌ Error sending 1-day reminder for appointment ${appointment._id}:`, error.message);
      }
    }
  } catch (error) {
    logger.error('❌ Error in send1DayReminders job:', error.message);
  }
};


/**
 * Send 2-hour pre-appointment reminders
 * Medical industry standard: Final reminder 2 hours before appointment
 * Runs every 15 minutes for precise timing
 */
const send2HourReminders = async () => {
  try {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const twoHoursPlus15Min = new Date(twoHoursFromNow.getTime() + 15 * 60 * 1000);


    // Find appointments starting in 2 hours
    const appointments = await Appointment.find({
      status: 'scheduled',
      scheduled_start_time: { 
        $gte: twoHoursFromNow, 
        $lt: twoHoursPlus15Min 
      },
      '2_hour_reminder.sent': false,
    }).populate('patient_id doctor_id');


    if (appointments.length === 0) {
      return;
    }


    logger.info(`⏰ Found ${appointments.length} appointments needing 2-hour reminders`);


    for (const appointment of appointments) {
      try {
        const patient = appointment.patient_id;
        const doctor = appointment.doctor_id;
        const minutesUntil = getMinutesUntilAppointment(appointment.scheduled_start_time);


        logger.info(`📤 Sending 2-hour reminder to ${patient.name} (appointment in ${minutesUntil} min)`);


        let emailSent = false;
        let smsSent = false;


        // Send email reminder
        try {
          const emailSubject = `⏰ Your Appointment Starts in 2 Hours - Dr. ${doctor.name}`;
          const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0066CC;">Appointment Starting Soon! ⏰</h2>
              
              <p>Hi ${patient.name},</p>
              
              <p>Your appointment is starting in <strong>${Math.floor(minutesUntil / 60)} hours</strong>!</p>
              
              <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <p style="margin: 5px 0;"><strong>👨‍⚕️ Doctor:</strong> Dr. ${doctor.name}</p>
                <p style="margin: 5px 0;"><strong>📅 Time:</strong> ${formatDateTime(appointment.scheduled_start_time)}</p>
                <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${process.env.CLINIC_ADDRESS || 'MediFlow Clinic'}</p>
              </div>
              
              <p><strong>⚠️ Please arrive 10 minutes early!</strong></p>
              
              <p>We're ready to see you!</p>
              
              <p>Best regards,<br>${process.env.CLINIC_NAME || 'MediFlow Clinic'}</p>
            </div>
          `;


          await emailService.sendEmail(patient.email, emailSubject, emailBody);
          emailSent = true;
          logger.success(`✅ 2-hour email reminder sent to ${patient.email}`);
        } catch (emailError) {
          logger.error(`❌ Failed to send 2-hour email reminder to ${patient.email}:`, emailError.message);
        }


        // Send SMS/WhatsApp reminder (urgent)
        if (patient.phone) {
          try {
            const smsMessage = `Hi ${patient.name}! Your appointment with Dr. ${doctor.name} starts in 2 hours at ${formatDateTime(appointment.scheduled_start_time)}. See you soon! - ${process.env.CLINIC_NAME || 'MediFlow'}`;
            await smsService.sendSMS(patient.phone, smsMessage);
            smsSent = true;
            logger.success(`✅ 2-hour SMS reminder sent to ${patient.phone}`);
          } catch (smsError) {
            logger.error(`❌ Failed to send 2-hour SMS reminder to ${patient.phone}:`, smsError.message);
          }
        }


        // Update appointment 2-hour reminder status
        await appointment.mark2HourReminderSent(emailSent, smsSent);
        await patient.updateAppointmentStatus(appointment._id, 'reminder_sent', appointment.scheduled_start_time);


        logger.success(`✅ 2-hour reminder sent for appointment ${appointment._id}`);
      } catch (error) {
        logger.error(`❌ Error sending 2-hour reminder for appointment ${appointment._id}:`, error.message);
      }
    }
  } catch (error) {
    logger.error('❌ Error in send2HourReminders job:', error.message);
  }
};


/**
 * Check for No-Shows (15 mins after appointment start time)
 * Medical industry standard: 15-minute grace period
 * Runs every 1 minute
 */
const checkNoShows = async () => {
  try {
    const now = new Date();
    // Find appointments that started > 15 mins ago, still in 'scheduled' or 'reminder_sent', and patient NOT checked in
    const cutoffTime = new Date(now.getTime() - 15 * 60 * 1000); // 15 mins ago


    const appointments = await Appointment.find({
      status: { $in: ['scheduled', 'reminder_sent'] },
      scheduled_start_time: { $lt: cutoffTime },
    }).populate('patient_id doctor_id');


    if (appointments.length === 0) {
      return;
    }


    logger.info(`🔍 Checking ${appointments.length} potential no-show appointments...`);


    for (const appointment of appointments) {
      const hasCheckedIn = appointment.patient_checked_in;


      if (!hasCheckedIn) {
        const patient = appointment.patient_id;
        const doctor = appointment.doctor_id;
        
        logger.warn(`🚫 NO-SHOW DETECTED: ${patient.name} did not show up for Dr. ${doctor.name} (15+ min late)`);


        // 1. Mark Appointment as No-Show
        await appointment.markAsNoShow();


        // 2. Update Patient no-show counter and risk classification
        await patient.incrementNoShowCount();
        
        // Downgrade risk classification if multiple no-shows
        if (patient.no_show_count >= 3) {
          logger.warn(`⚠️ Patient ${patient.name} has ${patient.no_show_count} no-shows - flagging as high-risk`);
          patient.high_no_show_risk = true;
          await patient.save();
        }


        // 3. Send "Sorry we missed you" SMS/Email
        try {
          const rebookLink = `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/book-appointment`;
          
          // Send email
          const emailSubject = 'We Missed You Today';
          const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0066CC;">We Missed You!</h2>
              <p>Hi ${patient.name},</p>
              <p>We noticed you couldn't make it to your appointment with Dr. ${doctor.name} today. We hope everything is okay.</p>
              <p>If you'd like to reschedule, please <a href="${rebookLink}" style="color: #0066CC; font-weight: bold;">book another appointment here</a> or call us at ${process.env.CLINIC_PHONE || '1800-XXX-XXXX'}.</p>
              <p>We're here to help whenever you need us.</p>
              <br>
              <p>Best regards,<br>${process.env.CLINIC_NAME || 'MediFlow Clinic'}</p>
            </div>
          `;
          await emailService.sendEmail(patient.email, emailSubject, emailBody);
          logger.success(`✅ Sent no-show email to ${patient.email}`);


          // Send SMS
          if (patient.phone) {
            const smsMessage = `Hi ${patient.name}, we missed you today. Reschedule anytime: ${rebookLink} or call ${process.env.CLINIC_PHONE || '1800-XXX-XXXX'}. - ${process.env.CLINIC_NAME || 'MediFlow'}`;
            await smsService.sendSMS(patient.phone, smsMessage);
            logger.success(`✅ Sent no-show SMS to ${patient.phone}`);
          }
        } catch (err) {
          logger.error('❌ Failed to send no-show notification:', err.message);
        }
      } else {
        // Patient checked in - update status if still in 'reminder_sent'
        if (appointment.status === 'reminder_sent') {
          appointment.status = 'in_progress';
          await appointment.save();
          logger.info(`✅ Appointment ${appointment._id} status updated to in_progress`);
        }
      }
    }
  } catch (error) {
    logger.error('❌ Error in checkNoShows:', error.message);
  }
};


/**
 * Cleanup expired time slots (older than 24 hours without booking)
 * Runs every hour
 */
const cleanupExpiredSlots = async () => {
  try {
    const now = new Date();
    const expiryTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago


    const result = await Appointment.updateMany(
      {
        status: 'slots_generated',
        slots_generated_at: { $lt: expiryTime },
      },
      {
        $set: { status: 'expired' },
      }
    );


    if (result.modifiedCount > 0) {
      logger.info(`🧹 Cleaned up ${result.modifiedCount} expired appointment slots`);


      // Update corresponding patients
      const expiredAppointments = await Appointment.find({ status: 'expired' }).select('patient_id');
      for (const appointment of expiredAppointments) {
        await Patient.findByIdAndUpdate(appointment.patient_id, {
          appointment_status: 'expired',
        });
      }
    }
  } catch (error) {
    logger.error('❌ Error in cleanupExpiredSlots job:', error.message);
  }
};


/**
 * Initialize all appointment scheduler cron jobs for MediFlow
 */
const initializeAppointmentScheduler = () => {
  try {
    logger.info('🔧 Initializing MediFlow appointment scheduler cron jobs...');


    // Job 1: Appointment confirmation reminders (every 1 minute)
    cron.schedule('*/1 * * * *', () => {
      logger.info('⏰ Running appointment confirmation reminders check...');
      sendConfirmationReminders();
    });


    // Job 2: 3-day advance reminders (every hour)
    cron.schedule('0 * * * *', () => {
      logger.info('📅 Running 3-day appointment reminders...');
      send3DayReminders();
    });


    // Job 3: 1-day advance reminders (every hour)
    cron.schedule('0 * * * *', () => {
      logger.info('📅 Running 1-day appointment reminders...');
      send1DayReminders();
    });


    // Job 4: 2-hour pre-appointment reminders (every 15 minutes)
    cron.schedule('*/15 * * * *', () => {
      logger.info('⏰ Running 2-hour appointment reminders...');
      send2HourReminders();
    });


    // Job 5: No-Show Check (every 1 minute)
    cron.schedule('*/1 * * * *', () => {
      logger.info('🚫 Checking for no-shows...');
      checkNoShows();
    });


    // Job 6: Cleanup expired slots (every hour)
    cron.schedule('0 * * * *', () => {
      logger.info('🧹 Running expired slots cleanup...');
      cleanupExpiredSlots();
    });


    logger.success('✅ MediFlow appointment scheduler initialized successfully');
    logger.info('📋 Active medical automation jobs:');
    logger.info('   - Confirmation reminders: Every 1 minute');
    logger.info('   - 3-day reminders: Every hour');
    logger.info('   - 1-day reminders: Every hour');
    logger.info('   - 2-hour reminders: Every 15 minutes');
    logger.info('   - No-Show detection: Every 1 minute');
    logger.info('   - Cleanup expired slots: Every hour');
  } catch (error) {
    logger.error('❌ Failed to initialize appointment scheduler:', error.message);
    throw error;
  }
};


// Named exports
export {
  initializeAppointmentScheduler,
  sendConfirmationReminders,
  send3DayReminders,
  send1DayReminders,
  send2HourReminders,
  checkNoShows,
  cleanupExpiredSlots,
};

// Default export
export default {
  initializeAppointmentScheduler,
  sendConfirmationReminders,
  send3DayReminders,
  send1DayReminders,
  send2HourReminders,
  checkNoShows,
  cleanupExpiredSlots,
};
