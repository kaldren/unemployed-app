import "server-only";
import type { Email } from "./templates";

// Email goes out through Resend once RESEND_API_KEY and EMAIL_FROM are set; until then it's skipped.
export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(to: string, email: Email) {
  if (!isEmailConfigured()) {
    console.info(`Email not configured; skipped "${email.subject}"`);
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
