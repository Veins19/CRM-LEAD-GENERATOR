import logger from './logger.js';

/**
 * Time Slot Generator Utility for MediFlow
 * Helper functions for formatting and managing appointment time slots
 * 
 * Medical clinic specific:
 * - Clinic hours: 8 AM - 8 PM IST (7 days a week)
 * - 30-minute appointment slots
 * - 15-minute buffer between appointments
 */

/**
 * Format date to readable string in IST
 * Example: "Monday, November 25, 2025 at 2:30 PM IST"
 */
const formatDateTime = (date, timezone = 'Asia/Kolkata') => {
  try {
    const options = {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };

    const formatted = new Intl.DateTimeFormat('en-IN', options).format(new Date(date));
    return `${formatted} IST`;
  } catch (error) {
    logger.error('Error formatting date time:', error.message);
    return date.toString();
  }
};

/**
 * Format time only
 * Example: "2:30 PM"
 */
const formatTime = (date, timezone = 'Asia/Kolkata') => {
  try {
    const options = {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };

    return new Intl.DateTimeFormat('en-IN', options).format(new Date(date));
  } catch (error) {
    logger.error('Error formatting time:', error.message);
    return date.toString();
  }
};

/**
 * Format date only
 * Example: "Monday, November 25, 2025"
 */
const formatDate = (date, timezone = 'Asia/Kolkata') => {
  try {
    const options = {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    return new Intl.DateTimeFormat('en-IN', options).format(new Date(date));
  } catch (error) {
    logger.error('Error formatting date:', error.message);
    return date.toString();
  }
};

/**
 * Get relative day label
 * Returns "Today", "Tomorrow", or the date
 */
const getRelativeDayLabel = (date, timezone = 'Asia/Kolkata') => {
  try {
    const targetDate = new Date(date);
    const now = new Date();

    // Convert to IST for comparison
    const targetIST = new Date(
      targetDate.toLocaleString('en-US', { timeZone: timezone })
    );
    const nowIST = new Date(now.toLocaleString('en-US', { timeZone: timezone }));

    // Reset times for date comparison
    targetIST.setHours(0, 0, 0, 0);
    nowIST.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((targetIST - nowIST) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';

    return formatDate(date, timezone);
  } catch (error) {
    logger.error('Error getting relative day label:', error.message);
    return formatDate(date, timezone);
  }
};

/**
 * Format time slot for display
 * Example: "Today at 2:30 PM - 3:00 PM IST"
 */
const formatTimeSlot = (startTime, endTime, timezone = 'Asia/Kolkata') => {
  try {
    const dayLabel = getRelativeDayLabel(startTime, timezone);
    const startFormatted = formatTime(startTime, timezone);
    const endFormatted = formatTime(endTime, timezone);

    return `${dayLabel} at ${startFormatted} - ${endFormatted} IST`;
  } catch (error) {
    logger.error('Error formatting time slot:', error.message);
    return `${startTime} - ${endTime}`;
  }
};

/**
 * Format time slots array for email
 * Returns HTML formatted string of all slots
 */
const formatTimeSlotsForEmail = (timeSlots, timezone = 'Asia/Kolkata') => {
  try {
    if (!timeSlots || timeSlots.length === 0) {
      return '<p>No available time slots at the moment.</p>';
    }

    let html = '<ul style="list-style: none; padding: 0; margin: 20px 0;">';

    timeSlots.forEach((slot, index) => {
      const formatted = formatTimeSlot(slot.start_time, slot.end_time, timezone);
      html += `
        <li style="margin: 10px 0; padding: 15px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981;">
          <strong>Option ${index + 1}:</strong> ${formatted}
        </li>
      `;
    });

    html += '</ul>';
    return html;
  } catch (error) {
    logger.error('Error formatting time slots for email:', error.message);
    return '<p>Time slots available. Please check your email.</p>';
  }
};

/**
 * Calculate duration in minutes between two dates
 */
const calculateDuration = (startTime, endTime) => {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    return Math.floor(durationMs / (1000 * 60)); // Convert to minutes
  } catch (error) {
    logger.error('Error calculating duration:', error.message);
    return 0;
  }
};

/**
 * Format duration in human-readable format
 * Example: "15 minutes", "1 hour", "1 hour 30 minutes"
 */
const formatDuration = (minutes) => {
  try {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
  } catch (error) {
    logger.error('Error formatting duration:', error.message);
    return `${minutes} minutes`;
  }
};

/**
 * Check if a time is within clinic hours (8 AM - 8 PM IST, 7 days a week)
 */
const isClinicHours = (date, timezone = 'Asia/Kolkata') => {
  try {
    const dateIST = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const hour = dateIST.getHours();

    // Clinic hours: 8 AM - 8 PM IST (20:00)
    // Medical clinics often operate 7 days a week
    const isClinicTime = hour >= 8 && hour < 20;

    return isClinicTime;
  } catch (error) {
    logger.error('Error checking clinic hours:', error.message);
    return false;
  }
};

/**
 * Check if a time is within emergency hours (24/7)
 * For emergency departments
 */
const isEmergencyHours = () => {
  return true; // Emergency department is always open
};

/**
 * Calculate time until appointment starts (in minutes)
 */
const getMinutesUntilAppointment = (appointmentTime) => {
  try {
    const now = new Date();
    const appointment = new Date(appointmentTime);
    const diffMs = appointment - now;
    return Math.floor(diffMs / (1000 * 60));
  } catch (error) {
    logger.error('Error calculating minutes until appointment:', error.message);
    return 0;
  }
};

/**
 * Check if appointment is starting soon (within X minutes)
 */
const isAppointmentStartingSoon = (appointmentTime, thresholdMinutes = 15) => {
  try {
    const minutesUntil = getMinutesUntilAppointment(appointmentTime);
    return minutesUntil > 0 && minutesUntil <= thresholdMinutes;
  } catch (error) {
    logger.error('Error checking if appointment is starting soon:', error.message);
    return false;
  }
};

/**
 * Check if patient is late for appointment
 */
const isPatientLate = (appointmentTime, minutesLate = 10) => {
  try {
    const now = new Date();
    const appointment = new Date(appointmentTime);
    const diffMs = now - appointment;
    const minutesPassed = Math.floor(diffMs / (1000 * 60));
    
    return minutesPassed >= minutesLate;
  } catch (error) {
    logger.error('Error checking if patient is late:', error.message);
    return false;
  }
};

/**
 * Add buffer time to a date
 * Example: Add 15 minutes buffer between appointments
 */
const addBufferTime = (date, bufferMinutes = 15) => {
  try {
    const newDate = new Date(date);
    newDate.setMinutes(newDate.getMinutes() + bufferMinutes);
    return newDate;
  } catch (error) {
    logger.error('Error adding buffer time:', error.message);
    return date;
  }
};

/**
 * Get next available clinic day
 * Medical clinics operate 7 days a week
 */
const getNextClinicDay = (fromDate = new Date(), timezone = 'Asia/Kolkata') => {
  try {
    const date = new Date(fromDate);
    date.setDate(date.getDate() + 1);
    date.setHours(8, 0, 0, 0); // Start at 8 AM

    // Medical clinics are open 7 days a week
    // No need to skip weekends

    return date;
  } catch (error) {
    logger.error('Error getting next clinic day:', error.message);
    return new Date();
  }
};

/**
 * Parse slot ID to extract timestamp
 */
const parseSlotId = (slotId) => {
  try {
    // Format: slot_1234567890_0
    const parts = slotId.split('_');
    if (parts.length >= 2) {
      return parseInt(parts[1], 10);
    }
    return null;
  } catch (error) {
    logger.error('Error parsing slot ID:', error.message);
    return null;
  }
};

/**
 * Generate appointment time slots for a day
 * @param {Date} date - Date to generate slots for
 * @param {number} slotDuration - Duration of each slot in minutes (default: 30)
 * @param {number} startHour - Start hour (default: 8 AM)
 * @param {number} endHour - End hour (default: 8 PM)
 * @returns {Array} - Array of time slot objects
 */
const generateDailyTimeSlots = (
  date,
  slotDuration = 30,
  startHour = 8,
  endHour = 20
) => {
  try {
    const slots = [];
    const currentDate = new Date(date);
    currentDate.setHours(startHour, 0, 0, 0);

    while (currentDate.getHours() < endHour) {
      const startTime = new Date(currentDate);
      const endTime = new Date(currentDate);
      endTime.setMinutes(endTime.getMinutes() + slotDuration);

      // Don't add slot if it goes beyond clinic hours
      if (endTime.getHours() <= endHour) {
        slots.push({
          start_time: startTime,
          end_time: endTime,
          duration: slotDuration,
          formatted: formatTimeSlot(startTime, endTime)
        });
      }

      currentDate.setMinutes(currentDate.getMinutes() + slotDuration);
    }

    return slots;
  } catch (error) {
    logger.error('Error generating daily time slots:', error.message);
    return [];
  }
};

/**
 * Check if appointment needs reminder (1 day or 2 hours before)
 */
const needsReminder = (appointmentTime, reminderType = '1day') => {
  try {
    const minutesUntil = getMinutesUntilAppointment(appointmentTime);
    
    if (reminderType === '1day') {
      // 1-day reminder: between 22-26 hours before (±2 hour window)
      return minutesUntil >= 1320 && minutesUntil <= 1560; // 22-26 hours
    } else if (reminderType === '2hour') {
      // 2-hour reminder: between 105-135 minutes before (±15 min window)
      return minutesUntil >= 105 && minutesUntil <= 135;
    }
    
    return false;
  } catch (error) {
    logger.error('Error checking if appointment needs reminder:', error.message);
    return false;
  }
};


// Named exports (so you can do: import { formatDateTime } from './file.js')
export {
  formatDateTime,
  formatTime,
  formatDate,
  getRelativeDayLabel,
  formatTimeSlot,
  formatTimeSlotsForEmail,
  calculateDuration,
  formatDuration,
  isClinicHours,
  isEmergencyHours,
  getMinutesUntilAppointment,
  isAppointmentStartingSoon,
  isPatientLate,
  addBufferTime,
  getNextClinicDay,
  parseSlotId,
  generateDailyTimeSlots,
  needsReminder,
};

// Also export as default for backward compatibility
export default {
  formatDateTime,
  formatTime,
  formatDate,
  getRelativeDayLabel,
  formatTimeSlot,
  formatTimeSlotsForEmail,
  calculateDuration,
  formatDuration,
  isClinicHours,
  isEmergencyHours,
  getMinutesUntilAppointment,
  isAppointmentStartingSoon,
  isPatientLate,
  addBufferTime,
  getNextClinicDay,
  parseSlotId,
  generateDailyTimeSlots,
  needsReminder,
};

