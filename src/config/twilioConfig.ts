import twilio, { Twilio } from "twilio";
import dotenv from "dotenv";

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
const authToken = process.env.TWILIO_AUTH_TOKEN as string;

if (!accountSid || !authToken) {
  throw new Error("Twilio credentials missing in environment variables");
}

export const twilioClient: Twilio = twilio(accountSid, authToken);
export const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER as string;
export const TWILIO_SMS_NUMBER = process.env.TWILIO_SMS_NUMBER as string;
export const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID as string;
export const TWILIO_CONTENT_SID_JOB_CREATED = process.env.TWILIO_CONTENT_SID_JOB_CREATED as string;
export const TWILIO_CONTENT_SID_MANAGER_JOB_CREATED = process.env.TWILIO_CONTENT_SID_MANAGER_JOB_CREATED as string;
