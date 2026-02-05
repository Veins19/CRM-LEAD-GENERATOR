// backend/cron/smsScheduler.js

import cron from 'node-cron';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import logger from '../utils/logger.js';
import smsService from '../services/smsService.js';

/**
 * SMS Scheduler for MediFlow
 * Sends automated SMS reminders for appointments
 * 
 * Jobs:
 * - 1-day before appointment reminder (runs every 2 hours)
 * - 2-hour before appointment reminder (runs every 15 minutes)
 * - Follow-up SMS for missed appointments (runs every hour)
 */

/**
 * Process 1-day before appointment reminders
 * Runs every 2 hours
 * Sends SMS to patients with appointments happening tomorrow
 */
async function process1DayReminders() {
  try {
    logger.info('📲 SMS Scheduler: Starting 1-day appointment reminder processing');

    // Find appointments happening in 24 hours (±2 hour window)
    const now = new Date();
    const twentyTwoHoursFromNow = new Date(now.getTime() + 22 * 60 * 60 * 1000);
    const twentySixHoursFromNow = new Date(now.getTime() + 26 * 60 * 60 * 1000);

    const upcomingAppointments = await Appointment.find({
      status: 'scheduled',
      scheduled_start_time: {
        $gte: twentyTwoHoursFromNow,
        $lte: twentySixHoursFromNow,
      },
      'sms_reminders.one_day_sent': { $ne: true },
    })
      .populate('patient_id')
      .populate('doctor_id')
      .limit(50); // Process max 50 at a time

    if (upcomingAppointments.length === 0) {
      logger.info('📲 SMS Scheduler: No appointments need 1-day reminders at this time');
      return;
    }

    logger.info(
      `📲 SMS Scheduler: Found ${upcomingAppointments.length} appointments requiring 1-day reminders`
    );

    let successCount = 0;
    let failCount = 0;

    for (const appointment of upcomingAppointments) {
      try {
        const patient = appointment.patient_id;
        const doctor = appointment.doctor_id;

        if (!patient || !doctor) {
          logger.warn(
            `⚠️ SMS Scheduler: Skipping appointment ${appointment._id} - missing patient or doctor`
          );
          continue;
        }

        if (!patient.phone) {
          logger.warn(
            `⚠️ SMS Scheduler: Skipping appointment ${appointment._id} - patient has no phone`
          );
          appointment.sms_reminders = {
            ...appointment.sms_reminders,
            one_day_sent: true,
            one_day_sent_at: new Date(),
          };
          await appointment.save();
          continue;
        }

        logger.info(
          `📲 SMS Scheduler: Sending 1-day reminder for appointment ${appointment._id} to ${patient.phone}`
        );

        const result = await smsService.sendAppointmentReminderSms(
          appointment,
          patient,
          doctor,
          '1_day'
        );

        if (result.success) {
          appointment.sms_reminders = {
            ...appointment.sms_reminders,
            one_day_sent: true,
            one_day_sent_at: new Date(),
          };
          await appointment.save();

          successCount++;
          logger.success(
            `✅ SMS Scheduler: 1-day reminder sent successfully, SID: ${result.sid}`
          );
        } else {
          failCount++;
          logger.error(
            `❌ SMS Scheduler: 1-day reminder failed for ${patient.phone}: ${result.error}`
          );
        }

        // Wait 2 seconds between sends to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        failCount++;
        logger.error(
          `❌ SMS Scheduler: Error sending 1-day reminder for appointment ${appointment._id}:`,
          error.message
        );
      }
    }

    logger.info(
      `📲 SMS Scheduler: 1-day reminder processing complete - ${successCount} sent, ${failCount} failed`
    );
  } catch (error) {
    logger.error('❌ SMS Scheduler: Error in process1DayReminders:', error.message);
  }
}

/**
 * Process 2-hour before appointment reminders
 * Runs every 15 minutes
 * Sends SMS to patients with appointments happening in 2 hours
 */
async function process2HourReminders() {
  try {
    logger.info('📲 SMS Scheduler: Starting 2-hour appointment reminder processing');

    // Find appointments happening in 2 hours (±15 minute window)
    const now = new Date();
    const oneHourFortyFiveMinFromNow = new Date(now.getTime() + 105 * 60 * 1000);
    const twoHoursFifteenMinFromNow = new Date(now.getTime() + 135 * 60 * 1000);

    const upcomingAppointments = await Appointment.find({
      status: 'scheduled',
      scheduled_start_time: {
        $gte: oneHourFortyFiveMinFromNow,
        $lte: twoHoursFifteenMinFromNow,
      },
      'sms_reminders.two_hour_sent': { $ne: true },
    })
      .populate('patient_id')
      .populate('doctor_id')
      .limit(50);

    if (upcomingAppointments.length === 0) {
      logger.info('📲 SMS Scheduler: No appointments need 2-hour reminders at this time');
      return;
    }

    logger.info(
      `📲 SMS Scheduler: Found ${upcomingAppointments.length} appointments requiring 2-hour reminders`
    );

    let successCount = 0;
    let failCount = 0;

    for (const appointment of upcomingAppointments) {
      try {
        const patient = appointment.patient_id;
        const doctor = appointment.doctor_id;

        if (!patient || !doctor) {
          logger.warn(
            `⚠️ SMS Scheduler: Skipping appointment ${appointment._id} - missing patient or doctor`
          );
          continue;
        }

        if (!patient.phone) {
          logger.warn(
            `⚠️ SMS Scheduler: Skipping appointment ${appointment._id} - patient has no phone`
          );
          appointment.sms_reminders = {
            ...appointment.sms_reminders,
            two_hour_sent: true,
            two_hour_sent_at: new Date(),
          };
          await appointment.save();
          continue;
        }

        logger.info(
          `📲 SMS Scheduler: Sending 2-hour reminder for appointment ${appointment._id} to ${patient.phone}`
        );

        const result = await smsService.sendAppointmentReminderSms(
          appointment,
          patient,
          doctor,
          '2_hour'
        );

        if (result.success) {
          appointment.sms_reminders = {
            ...appointment.sms_reminders,
            two_hour_sent: true,
            two_hour_sent_at: new Date(),
          };
          await appointment.save();

          successCount++;
          logger.success(
            `✅ SMS Scheduler: 2-hour reminder sent successfully, SID: ${result.sid}`
          );
        } else {
          failCount++;
          logger.error(
            `❌ SMS Scheduler: 2-hour reminder failed for ${patient.phone}: ${result.error}`
          );
        }

        // Wait 2 seconds between sends
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        failCount++;
        logger.error(
          `❌ SMS Scheduler: Error sending 2-hour reminder for appointment ${appointment._id}:`,
          error.message
        );
      }
    }

    logger.info(
      `📲 SMS Scheduler: 2-hour reminder processing complete - ${successCount} sent, ${failCount} failed`
    );
  } catch (error) {
    logger.error('❌ SMS Scheduler: Error in process2HourReminders:', error.message);
  }
}

/**
 * Process missed appointment follow-ups
 * Runs every hour
 * Sends SMS to patients who missed their appointments
 */
async function processMissedAppointmentFollowUps() {
  try {
    logger.info('📲 SMS Scheduler: Starting missed appointment follow-up processing');

    // Find appointments that were scheduled but are now past their time
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const missedAppointments = await Appointment.find({
      status: 'scheduled',
      scheduled_start_time: {
        $gte: twentyFourHoursAgo,
        $lt: oneHourAgo,
      },
      'sms_reminders.missed_followup_sent': { $ne: true },
    })
      .populate('patient_id')
      .limit(20); // Process max 20 at a time

    if (missedAppointments.length === 0) {
      logger.info('📲 SMS Scheduler: No missed appointments need follow-up SMS');
      return;
    }

    logger.info(
      `📲 SMS Scheduler: Found ${missedAppointments.length} missed appointments for follow-up`
    );

    let successCount = 0;
    let failCount = 0;

    for (const appointment of missedAppointments) {
      try {
        const patient = appointment.patient_id;

        if (!patient) {
          logger.warn(
            `⚠️ SMS Scheduler: Skipping appointment ${appointment._id} - missing patient`
          );
          continue;
        }

        if (!patient.phone) {
          logger.warn(
            `⚠️ SMS Scheduler: Skipping appointment ${appointment._id} - patient has no phone`
          );
          appointment.sms_reminders = {
            ...appointment.sms_reminders,
            missed_followup_sent: true,
            missed_followup_sent_at: new Date(),
          };
          await appointment.save();
          continue;
        }

        logger.info(
          `📲 SMS Scheduler: Sending missed appointment follow-up to ${patient.phone}`
        );

        const clinicName = process.env.CLINIC_NAME || 'MediFlow Clinic';
        const clinicPhone = process.env.CLINIC_PHONE || '+91-80-12345678';

        const message = `Hello ${patient.name},

We noticed you missed your appointment at ${clinicName}. 

We hope everything is okay. Please call us at ${clinicPhone} to reschedule.

Take care of your health!`;

        const result = await smsService.sendSMS(patient.phone, message);

        if (result) {
          // Mark as no-show
          appointment.status = 'no_show';
          appointment.no_show_at = new Date();
          appointment.sms_reminders = {
            ...appointment.sms_reminders,
            missed_followup_sent: true,
            missed_followup_sent_at: new Date(),
          };
          await appointment.save();

          successCount++;
          logger.success(
            `✅ SMS Scheduler: Missed appointment follow-up sent, SID: ${result.sid}`
          );
        } else {
          failCount++;
          logger.error(
            `❌ SMS Scheduler: Missed appointment follow-up failed for ${patient.phone}`
          );
        }

        // Wait 2 seconds between sends
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        failCount++;
        logger.error(
          `❌ SMS Scheduler: Error sending missed appointment follow-up for ${appointment._id}:`,
          error.message
        );
      }
    }

    logger.info(
      `📲 SMS Scheduler: Missed appointment follow-up complete - ${successCount} sent, ${failCount} failed`
    );
  } catch (error) {
    logger.error(
      '❌ SMS Scheduler: Error in processMissedAppointmentFollowUps:',
      error.message
    );
  }
}

/**
 * Initialize SMS scheduler cron jobs
 */
function initializeSmsScheduler() {
  logger.section('📲 SMS SCHEDULER: INITIALIZING CRON JOBS');

  // 1-day reminder: Every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    logger.info('⏰ SMS Scheduler: Running 1-day reminder job (every 2 hours)');
    await process1DayReminders();
  });

  // 2-hour reminder: Every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    logger.info('⏰ SMS Scheduler: Running 2-hour reminder job (every 15 minutes)');
    await process2HourReminders();
  });

  // Missed appointment follow-up: Every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('⏰ SMS Scheduler: Running missed appointment follow-up job (hourly)');
    await processMissedAppointmentFollowUps();
  });

  logger.success('📲 SMS Scheduler: Cron jobs initialized successfully');
  logger.info('📲 SMS Scheduler: - 1-day reminder: Every 2 hours');
  logger.info('📲 SMS Scheduler: - 2-hour reminder: Every 15 minutes');
  logger.info('📲 SMS Scheduler: - Missed appointment follow-up: Every hour');
  logger.separator();
}

// Named exports
export {
  initializeSmsScheduler,
  process1DayReminders,
  process2HourReminders,
  processMissedAppointmentFollowUps,
};

// Default export for backward compatibility
export default {
  initializeSmsScheduler,
  process1DayReminders,
  process2HourReminders,
  processMissedAppointmentFollowUps,
};
