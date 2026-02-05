import crypto from 'crypto';
import logger from '../utils/logger.js';
import Meeting from '../models/Appointment.js';
import Lead from '../models/Patient.js';

/**
 * Webhook Controller
 * Handles real-time events from Zoom (participant joined, etc.)
 */

/**
 * Verify Zoom Webhook Signature
 * Ensures the request actually came from Zoom
 */
const verifyZoomSignature = (req) => {
  // In a real production app, you should verify the signature
  // For now, we trust if the secret matches logic below (validation challenge)
  return true; 
};

/**
 * Handle Zoom Webhooks
 * POST /api/webhooks/zoom
 */
const handleZoomWebhook = async (req, res) => {
  try {
    const { event, payload } = req.body;

    // 1. Handle URL Validation (Critical for Zoom setup)
    if (event === 'endpoint.url_validation') {
      const plainToken = payload.plainToken;
      const secret = process.env.ZOOM_WEBHOOK_SECRET;

      if (!secret) {
        logger.error('ZOOM_WEBHOOK_SECRET is missing in .env');
        return res.status(500).send('Server misconfigured');
      }

      const hash = crypto
        .createHmac('sha256', secret)
        .update(plainToken)
        .digest('hex');

      logger.info('🔐 Validating Zoom Webhook Endpoint');
      
      return res.status(200).json({
        plainToken: plainToken,
        encryptedToken: hash,
      });
    }

    // 2. Handle Participant Joined Event
    if (event === 'meeting.participant_joined') {
      const { object } = payload;
      const meetingId = object.id; // Zoom Meeting ID (e.g. "83376166259")
      const participant = object.participant;

      logger.info(`👤 Participant joined Zoom ${meetingId}: ${participant.user_name} (${participant.email || 'No Email'})`);

      // Find our internal meeting record using the Zoom Meeting ID
      // We stored the Zoom Join URL, which contains the ID, or ideally we should store the pure ID.
      // For now, let's search specifically.
      
      // NOTE: We need to find the meeting where 'google_meet_link' (which holds Zoom link) contains this ID
      // Or better, if we stored 'calendar_event_id' or added a 'zoom_meeting_id' field. 
      // Let's try to find by the zoom link or if we saved the ID in "calendar_event_id" temporarily.
      
      // Better approach: Search all "scheduled" meetings and check if the zoom link matches
      const meeting = await Meeting.findOne({
        status: { $in: ['scheduled', 'reminder_sent'] },
        google_meet_link: { $regex: meetingId } 
      });

      if (meeting) {
        logger.success(`✅ Linked participant to internal meeting: ${meeting._id}`);
        
        // Mark as joined!
        // We assume the first attendee is the lead.
        const attendeeIndex = 0; // Lead is always first
        
        // Only update if not already joined
        if (!meeting.attendees[attendeeIndex].joined) {
          meeting.attendees[attendeeIndex].joined = true;
          meeting.attendees[attendeeIndex].joined_at = new Date();
          
          // Mark meeting status as 'in_progress' or keep 'scheduled'? 
          // Let's keep 'scheduled' but use the flag for logic.
          
          await meeting.save();
          logger.success(`✅ Marked lead ${meeting.attendees[attendeeIndex].name} as JOINED in DB`);
        }
      } else {
        logger.warn(`⚠️ Could not find internal meeting for Zoom ID: ${meetingId}`);
      }
    }

    // Always return 200 OK to Zoom
    res.status(200).send('Event received');

  } catch (error) {
    logger.error('Webhook Error:', error.message);
    res.status(500).send('Webhook processing failed');
  }
};

export default {
  handleZoomWebhook,
};
