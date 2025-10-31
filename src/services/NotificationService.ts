import { twilioClient, TWILIO_WHATSAPP_NUMBER, TWILIO_SMS_NUMBER } from "../config/twilioConfig";

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
}
