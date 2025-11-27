import { twilioClient, TWILIO_WHATSAPP_NUMBER, TWILIO_SMS_NUMBER, TWILIO_MESSAGING_SERVICE_SID, TWILIO_CONTENT_SID_JOB_CREATED } from "../config/twilioConfig";

export class NotificationService {
  /**
   * Send WhatsApp message using Twilio
   * @param to Recipient phone number (e.g., +919876543210)
   * @param message Message text
   */
  static async sendWhatsApp(to: string, message: string): Promise<void> {
    try {
      const response = await twilioClient.messages.create({
        from: TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${to}`,
        body: message,
      });

      console.log("✅ WhatsApp message sent:", response.sid);
    } catch (error: any) {
      console.error("❌ Error sending WhatsApp message:", error.message);
      throw error;
    }
  }

  /**
   * Send SMS message using Twilio
   * @param to Recipient phone number (e.g., +919876543210)
   * @param message Message text
   */
  static async sendSMS(to: string, message: string): Promise<void> {
    try {
      const response = await twilioClient.messages.create({
        from: TWILIO_SMS_NUMBER,
        to,
        body: message,
      });

      console.log("✅ SMS message sent:", response.sid);
    } catch (error: any) {
      console.error("❌ Error sending SMS:", error.message);
      throw error;
    }
  }

  static async sendWhatsAppJobCreatedTemplate(
    to: string,
    variables: {
      manager_name: string;
      action_type: string;
      truck_type: string;
      job_priority: string;
      job_items: string;
    }
  ): Promise<void> {
    try {
      if (!TWILIO_MESSAGING_SERVICE_SID || !TWILIO_CONTENT_SID_JOB_CREATED) {
        throw new Error("Twilio Messaging Service SID or Content SID missing in environment variables");
      }

      const response = await twilioClient.messages.create({
        contentSid: TWILIO_CONTENT_SID_JOB_CREATED,
        contentVariables: JSON.stringify({
          1: variables.manager_name,
          2: variables.action_type,
          3: variables.truck_type,
          4: variables.job_priority,
          5: variables.job_items,
        }),
        from: TWILIO_WHATSAPP_NUMBER,
        messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
        to: `whatsapp:${to}`,
      });

      console.log("✅ WhatsApp template message sent:", response.sid);
    } catch (error: any) {
      console.error("❌ Error sending WhatsApp template message:", error.message);
      throw error;
    }
  }
}
