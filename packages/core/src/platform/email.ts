/**
 * Email WorldRoot sends: confirming an address and resetting a password. The
 * app decides how a message actually leaves (an email service in production,
 * the server log while developing); everything here is the wording.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  /** The plain-text version, which every mail program can show. */
  text: string;
  html: string;
}

export type SendEmail = (message: EmailMessage) => Promise<void>;

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

/** A short message with one button. The link is also written out, for mail programs that hide buttons. */
function message(to: string, subject: string, greeting: string, lines: string[], action: { label: string; url: string }, footer: string): EmailMessage {
  const text = [greeting, '', ...lines, '', `${action.label}: ${action.url}`, '', footer, '', '— WorldRoot'].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#fff8f2;font-family:Arial,Helvetica,sans-serif;color:#3d3027">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<p style="font-size:22px;font-weight:bold;color:#8a6a52;margin:0 0 24px">WorldRoot</p>
<p style="font-size:16px;line-height:1.5">${escape(greeting)}</p>
${lines.map((line) => `<p style="font-size:16px;line-height:1.5">${escape(line)}</p>`).join('\n')}
<p style="margin:28px 0"><a href="${escape(action.url)}" style="background:#b58e70;color:#1f1712;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;display:inline-block">${escape(action.label)}</a></p>
<p style="font-size:13px;line-height:1.5;color:#6b5b4f">If the button does not work, copy this address into your browser:<br><span style="word-break:break-all">${escape(action.url)}</span></p>
<p style="font-size:13px;line-height:1.5;color:#6b5b4f">${escape(footer)}</p>
</div></body></html>`;
  return { to, subject, text, html };
}

const hello = (name: string | null | undefined) => (name ? `Hello ${name},` : 'Hello,');

export function verificationEmail(to: string, name: string | null | undefined, url: string): EmailMessage {
  return message(
    to,
    'Confirm your email address for WorldRoot',
    hello(name),
    ['Please confirm that this is your email address, so you can always get back into your WorldRoot account.'],
    { label: 'Confirm My Email', url },
    'If you did not make a WorldRoot account, you can ignore this email and nothing will happen.',
  );
}

export function passwordResetEmail(to: string, name: string | null | undefined, url: string): EmailMessage {
  return message(
    to,
    'Reset your WorldRoot password',
    hello(name),
    ['Someone asked to reset the password for the WorldRoot account that uses this email address. The link works for one hour.'],
    { label: 'Choose A New Password', url },
    'If this was not you, you can ignore this email. Your password stays as it is.',
  );
}

/** Addresses that can never receive mail: the demo accounts use the reserved .test domain. */
export const undeliverable = (email: string) => /\.test$/i.test(email.trim());
