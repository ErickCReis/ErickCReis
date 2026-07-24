import { Resend } from "resend";

type EmailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
};

const RESEND_API_KEY = Bun.env.RESEND_API_KEY?.trim() || null;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export function isEmailConfigured() {
  return resend !== null;
}

export async function sendEmail(message: EmailMessage) {
  if (!resend) return false;

  try {
    const { error } = await resend.emails.send({
      from: "Erick <erick@erickr.dev>",
      ...message,
    });

    if (error) {
      console.error("Unable to send email", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Unable to send email", error);
    return false;
  }
}
