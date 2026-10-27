import "server-only";
import { isSeedEmail } from "@/lib/seed/domain";
import { SITE_NAME } from "@/lib/site";
import type { Email } from "./templates";

const isResendConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

// Email goes out through Resend once RESEND_API_KEY and EMAIL_FROM are set. Against the local Supabase
// stack it goes to Mailpit instead (MAILPIT_URL, written by scripts/db.mts). Otherwise it's skipped.
export function isEmailConfigured() {
  return isResendConfigured() || Boolean(process.env.MAILPIT_URL);
}

export async function sendEmail(to: string, email: Email) {
  if (!isResendConfigured() && process.env.MAILPIT_URL) return sendToMailpit(to, email);
  if (!isEmailConfigured()) {
    console.info(`Email not configured; skipped "${email.subject}"`);
    return;
  }
  if (isSeedEmail(to)) {
    console.info(`Seed address ${to}; skipped "${email.subject}"`);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, ...email }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Resend refused "${email.subject}": ${response.status} ${await response.text()}`);
}

// Mailpit's HTTP send API: the message shows up in its inbox, nothing leaves the machine.
async function sendToMailpit(to: string, email: Email) {
  const response = await fetch(`${process.env.MAILPIT_URL}/api/v1/send`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      From: { Email: "hello@unemployed.local", Name: SITE_NAME },
      To: [{ Email: to }],
      Subject: email.subject,
      Text: email.text,
      HTML: email.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Mailpit refused "${email.subject}": ${response.status} ${await response.text()}`);
}
