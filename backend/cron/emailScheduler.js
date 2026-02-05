import cron from 'node-cron';
import logger from '../utils/logger.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import Consultation from '../models/Consultation.js';
import emailService from '../services/emailService.js';

/**
 * Email Scheduler for MediFlow
 * Handles periodic email tasks using node-cron
 * 
 * Jobs:
 * - Send appointment reminder emails (1-day before)
 * - Retry failed appointment confirmation emails
 * - Cleanup abandoned consultations
 * - Send daily appointment summary to clinic staff
 */

/**
 * Send appointment reminder emails (1-day before)
 * Runs every hour
 * Sends reminders for appointments happening tomorrow
 */
const sendAppointmentReminders = cron.schedule(
  '0 * * * *', // Every hour at :00
  async () => {
    try {
      logger.section('CRON: APPOINTMENT REMINDER EMAILS');
      logger.info('Starting appointment reminder email job');

      // Find appointments happening in 24 hours (±1 hour window)
      const now = new Date();
      const twentyThreeHoursFromNow = new Date(now.getTime() + 23 * 60 * 60 * 1000);
      const twentyFiveHoursFromNow = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      const upcomingAppointments = await Appointment.find({
        status: 'scheduled',
        scheduled_start_time: {
          $gte: twentyThreeHoursFromNow,
          $lte: twentyFiveHoursFromNow,
        },
        reminder_sent: { $ne: true }, // Only if reminder not already sent
      })
        .populate('patient_id')
        .populate('doctor_id')
        .limit(50); // Process max 50 at a time

      if (upcomingAppointments.length === 0) {
        logger.info('No appointments need reminders at this time');
        logger.separator();
        return;
      }

      logger.info(`Found ${upcomingAppointments.length} appointments needing reminders`);

      let successCount = 0;
      let failCount = 0;

      for (const appointment of upcomingAppointments) {
        try {
          const patient = appointment.patient_id;
          const doctor = appointment.doctor_id;

          if (!patient || !doctor) {
            logger.warn(`Skipping appointment ${appointment._id} - missing patient or doctor`);
            continue;
          }

          logger.email(`Sending reminder email for appointment: ${appointment._id}`);

          const result = await emailService.sendAppointmentReminderEmail(
            appointment,
            patient,
            doctor
          );

          if (result.success) {
            // Mark reminder as sent
            appointment.reminder_sent = true;
            appointment.reminder_sent_at = new Date();
            await appointment.save();

            successCount++;
            logger.success(`✅ Reminder email sent to ${patient.email}`);
          } else {
            failCount++;
            logger.error(`❌ Reminder email failed for ${patient.email}: ${result.error}`);
          }

          // Wait 2 seconds between sends to avoid rate limits
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          failCount++;
          logger.error(`Error sending reminder for appointment ${appointment._id}:`, error.message);
        }
      }

      logger.info(`Reminder job complete: ${successCount} sent, ${failCount} failed`);
      logger.separator();
    } catch (error) {
      logger.error('Error in appointment reminder email job:', error.message);
      logger.separator();
    }
  },
  {
    scheduled: false, // Don't start automatically
  }
);

/**
 * Retry failed appointment confirmation emails
 * Runs every 30 minutes
 * Retries emails that failed in the last 6 hours
 */
const retryFailedAppointmentEmails = cron.schedule(
  '*/30 * * * *', // Every 30 minutes
  async () => {
    try {
      logger.section('CRON: RETRY FAILED APPOINTMENT EMAILS');
      logger.info('Starting failed appointment email retry job');

      // Find appointments with failed email confirmations in last 6 hours
      const sixHoursAgo = new Date();
      sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

      const failedAppointments = await Appointment.find({
        email_confirmation_sent: false,
        createdAt: { $gte: sixHoursAgo },
        status: 'scheduled',
      })
        .populate('patient_id')
        .populate('doctor_id')
        .limit(10); // Process max 10 at a time

      if (failedAppointments.length === 0) {
        logger.info('No failed appointment emails to retry');
        logger.separator();
        return;
      }

      logger.info(`Found ${failedAppointments.length} failed appointment emails to retry`);

      let successCount = 0;
      let failCount = 0;

      for (const appointment of failedAppointments) {
        try {
          const patient = appointment.patient_id;
          const doctor = appointment.doctor_id;

          if (!patient || !doctor) {
            logger.warn(`Skipping appointment ${appointment._id} - missing patient or doctor`);
            continue;
          }

          logger.email(`Retrying confirmation email for: ${patient.email}`);

          const result = await emailService.sendAllAppointmentEmails(
            appointment,
            patient,
            doctor
          );

          if (result.patientConfirmation.success) {
            appointment.email_confirmation_sent = true;
            await appointment.save();

            successCount++;
            logger.success(`✅ Email sent to ${patient.email} on retry`);
          } else {
            failCount++;
            logger.error(`❌ Email failed again for ${patient.email}: ${result.patientConfirmation.error}`);
          }

          // Wait 2 seconds between sends
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          failCount++;
          logger.error(`Error retrying email for appointment ${appointment._id}:`, error.message);
        }
      }

      logger.info(`Retry job complete: ${successCount} sent, ${failCount} failed`);
      logger.separator();
    } catch (error) {
      logger.error('Error in retry failed emails job:', error.message);
      logger.separator();
    }
  },
  {
    scheduled: false,
  }
);

/**
 * Clean up abandoned consultations
 * Runs every day at 3 AM
 * Marks consultations as abandoned if inactive for > 2 hours
 */
const cleanupAbandonedConsultations = cron.schedule(
  '0 3 * * *', // Every day at 3:00 AM
  async () => {
    try {
      logger.section('CRON: CLEANUP ABANDONED CONSULTATIONS');
      logger.info('Starting abandoned consultation cleanup job');

      // Find active consultations older than 2 hours
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      const result = await Consultation.updateMany(
        {
          status: 'active',
          updatedAt: { $lt: twoHoursAgo },
        },
        {
          $set: { status: 'abandoned' },
        }
      );

      logger.info(`Marked ${result.modifiedCount} consultations as abandoned`);
      logger.separator();
    } catch (error) {
      logger.error('Error in cleanup abandoned consultations job:', error.message);
      logger.separator();
    }
  },
  {
    scheduled: false,
  }
);

/**
 * Send daily appointment summary email
 * Runs every day at 8 AM
 * Sends summary of appointments for the day to clinic staff
 */
const sendDailyAppointmentSummary = cron.schedule(
  '0 8 * * *', // Every day at 8:00 AM
  async () => {
    try {
      logger.section('CRON: DAILY APPOINTMENT SUMMARY');
      logger.info('Starting daily appointment summary job');

      // Get today's appointments
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAppointments = await Appointment.find({
        scheduled_start_time: { $gte: today, $lt: tomorrow },
      })
        .populate('patient_id', 'name email phone age')
        .populate('doctor_id', 'name specialization department')
        .sort({ scheduled_start_time: 1 })
        .lean();

      if (todayAppointments.length === 0) {
        logger.info('No appointments scheduled for today');
        logger.separator();
        return;
      }

      // Calculate summary stats
      const scheduledCount = todayAppointments.filter((a) => a.status === 'scheduled').length;
      const completedCount = todayAppointments.filter((a) => a.status === 'completed').length;
      const cancelledCount = todayAppointments.filter((a) => a.status === 'cancelled').length;
      const noShowCount = todayAppointments.filter((a) => a.status === 'no_show').length;

      // Group by department
      const departmentGroups = {};
      todayAppointments.forEach((apt) => {
        if (!departmentGroups[apt.department]) {
          departmentGroups[apt.department] = [];
        }
        departmentGroups[apt.department].push(apt);
      });

      // Build summary email
      const subject = `📅 Daily Appointment Summary - ${today.toLocaleDateString()} (${todayAppointments.length} appointments)`;

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .stat-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; border-radius: 4px; }
    .stat-label { font-weight: bold; color: #667eea; }
    .stat-value { font-size: 24px; font-weight: bold; color: #333; }
    .appointment-list { background: white; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .appointment-item { padding: 10px; border-bottom: 1px solid #eee; }
    .time { font-weight: bold; color: #667eea; }
    .status-scheduled { color: #10b981; }
    .status-completed { color: #6b7280; }
    .status-cancelled { color: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Daily Appointment Summary</h1>
      <p>${today.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
    <div class="content">
      <h2>Summary Statistics</h2>
      
      <div class="stat-box">
        <div class="stat-label">Total Appointments</div>
        <div class="stat-value">${todayAppointments.length}</div>
      </div>
      
      <div class="stat-box">
        <div class="stat-label">Status Breakdown</div>
        <div>✅ Scheduled: ${scheduledCount} | ✔️ Completed: ${completedCount} | ❌ Cancelled: ${cancelledCount} | 👻 No-show: ${noShowCount}</div>
      </div>
      
      ${Object.keys(departmentGroups)
        .map(
          (dept) => `
        <h2>${dept} (${departmentGroups[dept].length})</h2>
        <div class="appointment-list">
          ${departmentGroups[dept]
            .map(
              (apt) => `
            <div class="appointment-item">
              <span class="time">${new Date(apt.scheduled_start_time).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}</span> - 
              <strong>${apt.patient_id?.name || 'Unknown Patient'}</strong> 
              (${apt.patient_id?.age || 'N/A'}y, ${apt.patient_id?.gender || 'N/A'})<br>
              Doctor: ${apt.doctor_id?.name || 'Unknown'} | 
              Status: <span class="status-${apt.status}">${apt.status}</span><br>
              ${apt.chief_complaint ? `Complaint: ${apt.chief_complaint}` : ''}
            </div>
          `
            )
            .join('')}
        </div>
      `
        )
        .join('')}
      
      <p style="margin-top: 20px; font-size: 12px; color: #666;">
        Automated daily summary from MediFlow Clinic Management System
      </p>
    </div>
  </div>
</body>
</html>`;

      const textContent = `
Daily Appointment Summary - ${today.toLocaleDateString()}

Total Appointments: ${todayAppointments.length}
Scheduled: ${scheduledCount} | Completed: ${completedCount} | Cancelled: ${cancelledCount} | No-show: ${noShowCount}

${Object.keys(departmentGroups)
  .map(
    (dept) => `
${dept} (${departmentGroups[dept].length}):
${departmentGroups[dept]
  .map(
    (apt) =>
      `${new Date(apt.scheduled_start_time).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })} - ${apt.patient_id?.name || 'Unknown'} with Dr. ${apt.doctor_id?.name || 'Unknown'} (${apt.status})`
  )
  .join('\n')}
`
  )
  .join('\n')}
`;

      // Send summary email to clinic admin
      const adminEmail = process.env.CLINIC_ADMIN_EMAIL || process.env.SMTP_FROM_EMAIL;
      
      const result = await emailService.sendEmail(
        adminEmail,
        subject,
        htmlContent,
        textContent
      );

      if (result.success) {
        logger.success('✅ Daily appointment summary sent successfully');
      } else {
        logger.error('❌ Failed to send daily appointment summary:', result.error);
      }

      logger.separator();
    } catch (error) {
      logger.error('Error in daily appointment summary job:', error.message);
      logger.separator();
    }
  },
  {
    scheduled: false,
  }
);

/**
 * Start all cron jobs
 */
const startAllJobs = () => {
  try {
    logger.section('STARTING EMAIL CRON JOBS');

    sendAppointmentReminders.start();
    logger.success('✅ Appointment reminder emails job started (every hour)');

    retryFailedAppointmentEmails.start();
    logger.success('✅ Retry failed appointment emails job started (every 30 minutes)');

    cleanupAbandonedConsultations.start();
    logger.success('✅ Cleanup abandoned consultations job started (daily at 3 AM)');

    sendDailyAppointmentSummary.start();
    logger.success('✅ Daily appointment summary job started (daily at 8 AM)');

    logger.separator();
  } catch (error) {
    logger.error('Error starting email cron jobs:', error.message);
  }
};

/**
 * Stop all cron jobs
 */
const stopAllJobs = () => {
  try {
    logger.info('Stopping all email cron jobs');

    sendAppointmentReminders.stop();
    retryFailedAppointmentEmails.stop();
    cleanupAbandonedConsultations.stop();
    sendDailyAppointmentSummary.stop();

    logger.success('All email cron jobs stopped');
  } catch (error) {
    logger.error('Error stopping email cron jobs:', error.message);
  }
};

export default {
  startAllJobs,
  stopAllJobs,
};
