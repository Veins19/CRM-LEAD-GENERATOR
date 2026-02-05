import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';

// Use Key 3 specifically for emails to distribute load
const API_KEY = process.env.GEMINI_API_KEY_3 || process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error('Gemini API Key for copywriting not found');
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });


/**
 * Generate a personalized appointment reminder email
 * Uses a clean, professional medical aesthetic (HIPAA-compliant)
 */
const generateAppointmentReminderEmail = async (appointment, patient, doctor) => {
  try {
    logger.info(`✍️ Generating appointment reminder email for: ${patient.email}`);

    const appointmentDate = new Date(appointment.scheduled_start_time);
    const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = appointmentDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const clinicName = process.env.CLINIC_NAME || 'MediFlow Clinic';
    const clinicPhone = process.env.CLINIC_PHONE || '+91-80-12345678';
    const clinicAddress = process.env.CLINIC_ADDRESS || '123 Medical Center, Bangalore, Karnataka 560001';

    const prompt = `
      You are a professional medical copywriter for "${clinicName}".
      
      **Goal:** Write a warm, professional appointment reminder email for:
      - Patient Name: ${patient.name}
      - Doctor: Dr. ${doctor.name} (${doctor.specialization})
      - Department: ${appointment.department}
      - Appointment Date: ${formattedDate}
      - Appointment Time: ${formattedTime}
      - Chief Complaint: ${appointment.chief_complaint || 'General consultation'}
      
      **The Aesthetic:**
      Think clean, professional, trustworthy medical communication.
      Friendly but professional. Clear and concise.
      
      **Instructions:**
      1. **Subject Line:** Write 1 professional subject line for appointment reminder.
      2. **Greeting:** Warm, professional greeting using patient's first name.
      3. **Reminder:** Clear statement about the upcoming appointment.
      4. **Preparation Tips:** 2-3 helpful tips for preparing for the appointment (e.g., bring medical records, list medications, arrive early).
      5. **Closing:** Professional, caring closing statement.

      **HIPAA Compliance:**
      - Do NOT mention specific diagnoses or sensitive medical conditions
      - Keep it general and professional
      - Focus on appointment logistics

      **Output Requirement:**
      Return ONLY a valid JSON object.
      {
        "subject": "...",
        "greeting": "...",
        "reminder": "...",
        "preparation_tips": ["...", "...", "..."],
        "closing": "..."
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // ROBUST CLEANING (Remove markdown code blocks)
    let cleanText = responseText.replace(/``````/g, '').trim();
    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
    }

    let content;
    try {
      content = JSON.parse(cleanText);
    } catch (parseError) {
      logger.error('JSON Parse Error (Raw Text):', responseText);
      throw new Error('Failed to parse AI response');
    }

    // ---------------------------------------------------------
    // HTML TEMPLATE: Clean Medical Aesthetic
    // ---------------------------------------------------------
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f0f9ff; color: #1e293b; }
          .container { max-width: 600px; margin: 40px auto; background: #FFFFFF; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 40px; text-align: center; color: white; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; }
          .content { padding: 40px; font-size: 16px; line-height: 1.7; color: #334155; }
          .greeting { font-weight: 600; margin-bottom: 20px; color: #0f172a; font-size: 18px; }
          
          .appointment-card { background: #f0fdf4; border-left: 4px solid #10b981; padding: 24px; margin: 24px 0; border-radius: 8px; }
          .appointment-card h3 { margin: 0 0 16px; color: #059669; font-size: 16px; }
          .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #d1fae5; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: 600; width: 140px; color: #047857; }
          .detail-value { flex: 1; color: #0f172a; }
          
          .tips-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 24px 0; border-radius: 8px; }
          .tips-box h3 { margin: 0 0 12px; color: #92400e; font-size: 16px; }
          .tips-box ul { margin: 0; padding-left: 20px; }
          .tips-box li { margin: 8px 0; color: #78350f; }
          
          .cta-container { margin-top: 32px; text-align: center; }
          .btn { background: #10b981; color: #FFFFFF !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 500; font-size: 16px; display: inline-block; transition: all 0.2s; }
          .btn:hover { background: #059669; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
          
          .footer { padding: 30px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 14px; color: #64748b; text-align: center; }
          .footer a { color: #3b82f6; text-decoration: none; }
          .footer a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 ${clinicName}</h1>
            <p>Appointment Reminder</p>
          </div>
          
          <div class="content">
            <div class="greeting">${content.greeting}</div>
            
            <p>${content.reminder}</p>
            
            <div class="appointment-card">
              <h3>📅 Your Appointment Details</h3>
              <div class="detail-row">
                <div class="detail-label">Date & Time:</div>
                <div class="detail-value"><strong>${formattedDate}</strong> at <strong>${formattedTime}</strong></div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Doctor:</div>
                <div class="detail-value">Dr. ${doctor.name}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Specialization:</div>
                <div class="detail-value">${doctor.specialization}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Department:</div>
                <div class="detail-value">${appointment.department}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Location:</div>
                <div class="detail-value">${clinicAddress}</div>
              </div>
            </div>
            
            <div class="tips-box">
              <h3>⏰ Before Your Appointment</h3>
              <ul>
                ${content.preparation_tips.map(tip => `<li>${tip}</li>`).join('')}
              </ul>
            </div>
            
            <p>${content.closing}</p>
            
            <div class="cta-container">
              <a href="tel:${clinicPhone}" class="btn">
                📞 Call to Reschedule
              </a>
            </div>
            
            <p style="margin-top: 40px; font-size: 14px; color: #64748b; text-align: center;">
              <strong>Need to reschedule?</strong><br>
              Please call us at <a href="tel:${clinicPhone}" style="color: #10b981; text-decoration: none;">${clinicPhone}</a> at least 24 hours in advance.
            </p>
          </div>
          
          <div class="footer">
            <strong>${clinicName}</strong><br>
            📍 ${clinicAddress}<br>
            📞 ${clinicPhone}<br>
            <br>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">
              This is an automated appointment reminder. Please do not reply to this email.<br>
              For assistance, please contact us at ${clinicPhone}.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    logger.success(`✅ Appointment reminder email generated for ${patient.email}`);
    return {
      subject: content.subject,
      html_body: htmlBody
    };

  } catch (error) {
    logger.error('Error generating appointment reminder email:', error.message);
    
    // Fallback email
    const appointmentDate = new Date(appointment.scheduled_start_time);
    const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = appointmentDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return {
      subject: `Appointment Reminder - ${formattedDate}`,
      html_body: `
        <p>Dear ${patient.name},</p>
        <p>This is a reminder about your upcoming appointment:</p>
        <p><strong>Date:</strong> ${formattedDate}<br>
        <strong>Time:</strong> ${formattedTime}<br>
        <strong>Doctor:</strong> Dr. ${doctor.name}<br>
        <strong>Department:</strong> ${appointment.department}</p>
        <p>Please arrive 10-15 minutes early for registration.</p>
        <p>Best regards,<br>${process.env.CLINIC_NAME || 'MediFlow Clinic'}</p>
      `
    };
  }
};

/**
 * Generate a personalized welcome email for new patients
 * (Optional - can be used for patient onboarding)
 */
const generateWelcomeEmail = async (patient) => {
  try {
    logger.info(`✍️ Generating welcome email for new patient: ${patient.email}`);

    const clinicName = process.env.CLINIC_NAME || 'MediFlow Clinic';
    const clinicPhone = process.env.CLINIC_PHONE || '+91-80-12345678';

    // Simple welcome email without AI (faster and more reliable)
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f0f9ff; }
          .container { max-width: 600px; margin: 40px auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px; text-align: center; color: white; }
          .content { padding: 40px; font-size: 16px; line-height: 1.7; color: #334155; }
          .footer { padding: 30px; background: #f8fafc; text-align: center; font-size: 14px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${clinicName}! 🏥</h1>
          </div>
          <div class="content">
            <p>Dear ${patient.name},</p>
            <p>Thank you for choosing ${clinicName} for your healthcare needs. We're honored to be your healthcare partner.</p>
            <p><strong>What's Next?</strong></p>
            <ul>
              <li>Your patient profile has been created</li>
              <li>You can schedule appointments by calling ${clinicPhone}</li>
              <li>Bring your ID and previous medical records to your first visit</li>
            </ul>
            <p>We look forward to serving you!</p>
            <p>Best regards,<br><strong>${clinicName} Team</strong></p>
          </div>
          <div class="footer">
            ${clinicName} | ${clinicPhone}
          </div>
        </div>
      </body>
      </html>
    `;

    logger.success(`✅ Welcome email generated for ${patient.email}`);
    return {
      subject: `Welcome to ${clinicName}!`,
      html_body: htmlBody
    };

  } catch (error) {
    logger.error('Error generating welcome email:', error.message);
    return {
      subject: `Welcome to ${process.env.CLINIC_NAME || 'MediFlow Clinic'}!`,
      html_body: `<p>Dear ${patient.name},</p><p>Welcome to our clinic! We look forward to serving you.</p>`
    };
  }
};

module.exports = {
  generateAppointmentReminderEmail,
  generateWelcomeEmail
};
