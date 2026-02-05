import axios from 'axios';
import logger from '../utils/logger.js';

/**
 * Zoom Service
 * - Uses Server-to-Server OAuth (recommended by Zoom for backend integrations)
 * - Creates Zoom meetings and returns join/start URLs
 *
 * Required .env values:
 * ZOOM_ACCOUNT_ID
 * ZOOM_CLIENT_ID
 * ZOOM_CLIENT_SECRET
 */

class ZoomService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
    this.baseUrl = 'https://api.zoom.us/v2';
  }

  /**
   * Get OAuth Access Token (Server-to-Server OAuth)
   * Reuses token until close to expiry for efficiency
   */
  async getAccessToken() {
    try {
      // Reuse token if still valid
      if (this.accessToken && Date.now() < this.tokenExpiresAt) {
        return this.accessToken;
      }

      if (!process.env.ZOOM_ACCOUNT_ID ||
          !process.env.ZOOM_CLIENT_ID ||
          !process.env.ZOOM_CLIENT_SECRET) {
        throw new Error('Zoom credentials (ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET) are not set in .env');
      }

      const auth = Buffer.from(
        `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
      ).toString('base64');

      logger.info('🔐 Requesting new Zoom access token');

      const response = await axios.post(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
        {},
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Zoom usually gives 1 hour; refresh 5 min before expiry
      this.tokenExpiresAt = Date.now() + (response.data.expires_in - 300) * 1000;

      logger.success('✅ Zoom access token obtained');
      return this.accessToken;
    } catch (error) {
      const details = error.response?.data || error.message;
      logger.error('❌ Zoom auth error:', details);
      throw new Error('Failed to authenticate with Zoom. Check Zoom credentials and app config.');
    }
  }

  /**
   * Create a Zoom Meeting
   * @param {Object} params
   * @param {String} params.topic        - Meeting topic/title
   * @param {Date|String} params.startTime - JS Date or ISO string
   * @param {Number} params.duration     - Duration in minutes (default 15)
   * @param {String} params.timezone     - IANA timezone (default Asia/Kolkata)
   *
   * Returns:
   * {
   *   join_url: string,  // For lead
   *   start_url: string, // For you (host)
   *   password: string | undefined
   * }
   */
  async createMeeting({ topic, startTime, duration = 15, timezone = 'Asia/Kolkata' }) {
    try {
      const token = await this.getAccessToken();

      if (!startTime) {
        throw new Error('startTime is required to create a Zoom meeting');
      }

      const start = new Date(startTime);
      if (isNaN(start.getTime())) {
        throw new Error(`Invalid startTime provided to ZoomService: ${startTime}`);
      }

      const payload = {
        topic: topic || 'LSOptimaize Consultation',
        type: 2, // Scheduled meeting
        start_time: start.toISOString().replace(/\.\d{3}Z$/, 'Z'), // Zoom prefers this format
        duration, // minutes
        timezone,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          waiting_room: false,
          mute_upon_entry: false,
          approval_type: 2, // No registration required
          audio: 'both',
          auto_recording: 'none',
        },
      };

      logger.info(`📡 Creating Zoom meeting: "${payload.topic}" at ${start.toISOString()} (${timezone})`);

      const response = await axios.post(
        `${this.baseUrl}/users/me/meetings`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const meeting = response.data;

      logger.success(`✅ Zoom meeting created: ID=${meeting.id}`);
      logger.info(`🔗 Zoom join URL: ${meeting.join_url}`);

      return {
        meeting_id: meeting.id?.toString(),
        join_url: meeting.join_url,
        start_url: meeting.start_url,
        password: meeting.password,
      };
    } catch (error) {
      const details = error.response?.data || error.message;
      logger.error('❌ Error creating Zoom meeting:', details);
      throw new Error('Failed to create Zoom meeting');
    }
  }
}

export default new; ZoomService();
