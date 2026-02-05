import { google } from 'googleapis';
import logger from '../utils/logger.js';

/**
 * Google Calendar Service
 * Handles all interactions with Google Calendar API for meeting scheduling
 */

class GoogleCalendarService {
  constructor() {
    this.calendar = null;
    this.initialized = false;
  }

  /**
   * Initialize Google Calendar client with service account
   */
  async initialize() {
    try {
      if (this.initialized) {
        return true;
      }

      // Validate environment variables
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL is not set in environment variables');
      }

      if (!process.env.GOOGLE_PRIVATE_KEY) {
        throw new Error('GOOGLE_PRIVATE_KEY is not set in environment variables');
      }

      if (!process.env.GOOGLE_CALENDAR_ID) {
        throw new Error('GOOGLE_CALENDAR_ID is not set in environment variables');
      }

      // Create JWT client for service account authentication
      const auth = new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Fix newlines
        scopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events',
        ],
      });

      // Initialize calendar API
      this.calendar = google.calendar({ version: 'v3', auth });

      // Test connection
      await this.testConnection();

      this.initialized = true;
      logger.info('✅ Google Calendar Service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Google Calendar Service:', error.message);
      throw error;
    }
  }

  /**
   * Test calendar connection
   */
  async testConnection() {
    try {
      const response = await this.calendar.calendarList.list();
      logger.info(`✅ Google Calendar connection test successful. Found ${response.data.items.length} calendars.`);
      return true;
    } catch (error) {
      logger.error('Google Calendar connection test failed:', error.message);
      throw new Error('Failed to connect to Google Calendar. Please check your credentials.');
    }
  }

  /**
   * Generate available time slots
   * Returns 3 available 15-minute slots in the next 7 days during business hours
   */
  async generateTimeSlots(durationMinutes = 15, slotsNeeded = 3) {
    try {
      await this.initialize();

      const timezone = 'Asia/Kolkata';
      const now = new Date();
      const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      logger.info(`Generating ${slotsNeeded} time slots of ${durationMinutes} minutes...`);

      // Get busy times from calendar
      const busyTimes = await this.getFreeBusy(now, endDate);

      // Generate available slots
      const availableSlots = [];
      let currentDate = new Date(now);

      // Business hours: 9 AM to 6 PM IST
      const businessStart = 9; // 9 AM
      const businessEnd = 18; // 6 PM

      while (availableSlots.length < slotsNeeded && currentDate < endDate) {
        // Skip to next day if past business hours
        const currentHour = currentDate.getHours();
        if (currentHour < businessStart) {
          currentDate.setHours(businessStart, 0, 0, 0);
        } else if (currentHour >= businessEnd) {
          currentDate.setDate(currentDate.getDate() + 1);
          currentDate.setHours(businessStart, 0, 0, 0);
          continue;
        }

        // Skip weekends
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          currentDate.setDate(currentDate.getDate() + 1);
          currentDate.setHours(businessStart, 0, 0, 0);
          continue;
        }

        // Create potential slot
        const slotStart = new Date(currentDate);
        const slotEnd = new Date(currentDate.getTime() + durationMinutes * 60 * 1000);

        // Check if slot is available (not conflicting with busy times)
        const isAvailable = !this.hasConflict(slotStart, slotEnd, busyTimes);

        if (isAvailable && slotStart > now) {
          availableSlots.push({
            slot_id: `slot_${Date.now()}_${availableSlots.length}`,
            start_time: slotStart,
            end_time: slotEnd,
            timezone: timezone,
            is_available: true,
          });

          logger.info(`✅ Available slot found: ${slotStart.toLocaleString('en-IN', { timeZone: timezone })}`);
        }

        // Move to next 15-minute interval
        currentDate = new Date(currentDate.getTime() + 15 * 60 * 1000);
      }

      if (availableSlots.length === 0) {
        logger.warn('⚠️ No available time slots found in the next 7 days');
        throw new Error('No available time slots found. Please try again later.');
      }

      logger.success(`✅ Generated ${availableSlots.length} available time slots`);
      return availableSlots;
    } catch (error) {
      logger.error('Error generating time slots:', error.message);
      throw error;
    }
  }

  /**
   * Get free/busy information from calendar
   */
  async getFreeBusy(timeMin, timeMax) {
    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          timeZone: 'Asia/Kolkata',
          items: [{ id: process.env.GOOGLE_CALENDAR_ID }],
        },
      });

      const busyTimes = response.data.calendars[process.env.GOOGLE_CALENDAR_ID]?.busy || [];
      logger.info(`Found ${busyTimes.length} busy time blocks in calendar`);
      return busyTimes;
    } catch (error) {
      logger.error('Error fetching free/busy data:', error.message);
      throw error;
    }
  }

  /**
   * Check if a time slot conflicts with busy times
   */
  hasConflict(slotStart, slotEnd, busyTimes) {
    for (const busy of busyTimes) {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);

      // Check for overlap
      if (slotStart < busyEnd && slotEnd > busyStart) {
        return true;
      }
    }
    return false;
  }

  /**
   * Create a calendar event (without Google Meet conference data)
   */
  async createEvent(eventDetails) {
    try {
      await this.initialize();

      const { summary, description, location, start, end, timezone = 'Asia/Kolkata' } = eventDetails;

      logger.info(`Creating Google Calendar event: "${summary}" at ${start.toLocaleString('en-IN', { timeZone: timezone })}`);

      const event = {
        summary: summary || 'LSOptimaize Consultation',
        description: description || 'Scheduled consultation with LSOptimaize',
        location: location || '', // For Zoom link
        start: {
          dateTime: start.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: end.toISOString(),
          timeZone: timezone,
        },
        attendees: [], // Keep empty
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        requestBody: event,
        sendUpdates: 'none', // Do not send invites
      });

      const createdEvent = response.data;

      logger.success(`✅ Google Calendar event created: ${createdEvent.id}`);
      logger.info(`📅 Google Calendar event link: ${createdEvent.htmlLink}`);

      return {
        event_id: createdEvent.id,
        html_link: createdEvent.htmlLink,
      };
    } catch (error) {
      logger.error('Error creating Google Calendar event:', error.message);
      throw error;
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(eventId, updates) {
    try {
      await this.initialize();
      logger.info(`Updating calendar event: ${eventId}`);
      const existingEvent = await this.calendar.events.get({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        eventId: eventId,
      });
      const updatedEvent = { ...existingEvent.data, ...updates };
      const response = await this.calendar.events.update({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        eventId: eventId,
        requestBody: updatedEvent,
        sendUpdates: 'none',
      });
      logger.success(`✅ Calendar event updated: ${eventId}`);
      return response.data;
    } catch (error) {
      logger.error('Error updating calendar event:', error.message);
      throw error;
    }
  }

  /**
   * Cancel/delete a calendar event
   */
  async cancelEvent(eventId) {
    try {
      await this.initialize();
      logger.info(`Cancelling calendar event: ${eventId}`);
      await this.calendar.events.delete({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        eventId: eventId,
        sendUpdates: 'none',
      });
      logger.success(`✅ Calendar event cancelled: ${eventId}`);
      return true;
    } catch (error) {
      logger.error('Error cancelling calendar event:', error.message);
      throw error;
    }
  }

  /**
   * Get event details
   */
  async getEvent(eventId) {
    try {
      await this.initialize();
      const response = await this.calendar.events.get({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        eventId: eventId,
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching calendar event:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
const googleCalendarService = new GoogleCalendarService();

export default googleCalendarService;
