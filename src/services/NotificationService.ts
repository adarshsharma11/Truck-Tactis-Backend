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
      try {
        const status = await NotificationService.getMessageStatus(response.sid);
        console.log("ℹ️ WhatsApp delivery status:", status);
      } catch {}
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

      try {
        const status = await NotificationService.getMessageStatus(response.sid);
        console.log("ℹ️ SMS delivery status:", status);
      } catch {}
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
      priority: string;
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
        manager_name: variables.manager_name,
        action_type: variables.action_type,
        truck_type: variables.truck_type,
        priority: variables.priority,
        job_items: Array.isArray(variables.job_items)
          ? variables.job_items.join(", ")
          : variables.job_items,
      }),
        from: TWILIO_WHATSAPP_NUMBER,
        messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
        to: `whatsapp:${to}`,
      });

  
      try {
        const status = await NotificationService.getMessageStatus(response.sid);
        console.log("ℹ️ WhatsApp template delivery status:", status);
      } catch {}
    } catch (error: any) {
      console.error("❌ Error sending WhatsApp template message:", error.message);
      throw error;
    }
  }

  static async getMessageStatus(messageSid: string): Promise<{ sid: string; status: string; errorCode: number | null; errorMessage: string | null; to: string; from: string; }> {
    try {
      const msg = await twilioClient.messages(messageSid).fetch();
      console.log("ℹ️ Twilio message status:", { sid: msg.sid, status: msg.status, errorCode: msg.errorCode, errorMessage: msg.errorMessage });
      return { sid: msg.sid, status: msg.status as string, errorCode: msg.errorCode ?? null, errorMessage: (msg as any).errorMessage ?? null, to: msg.to as string, from: msg.from as string };
    } catch (error: any) {
      console.error("❌ Error fetching Twilio message status:", error.message);
      throw error;
    }
  }
}
