import 'server-only';
import type { EmailMessage, SendEmail } from '@worldroot/core';

/**
 * How WorldRoot's email leaves the server. With RESEND_API_KEY and
 * WORLDROOT_EMAIL_FROM set it goes through Resend (resend.com). Without them,
 * while developing, the message and its link are written to the server log so
 * the flow can still be tried; in production nothing is sent and the log says so.
 */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.WORLDROOT_EMAIL_FROM);
}

export const sendEmail: SendEmail = async (message: EmailMessage) => {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.WORLDROOT_EMAIL_FROM;
  if (!key || !from) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[worldroot] Email is not set up (RESEND_API_KEY, WORLDROOT_EMAIL_FROM), so "${message.subject}" was not sent.`);
    } else {
      console.info(`[worldroot] Email not set up; would have sent to ${message.to}:\n${message.subject}\n${message.text}`);
    }
    return;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
  }).catch((error: unknown) => {
    console.error('[worldroot] Could not reach the email service.', error);
    return null;
  });
  if (response && !response.ok) console.error(`[worldroot] The email service refused "${message.subject}": ${response.status} ${await response.text().catch(() => '')}`);
};
