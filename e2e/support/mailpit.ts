import { expect } from "@playwright/test";

// The local Supabase stack catches every email in Mailpit (supabase/config.toml, [local_smtp]): Supabase's
// auth emails, and the app's own (lib/email/send.ts) through MAILPIT_URL.
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:55324";

const search = (email: string) => `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`;

export async function clearInbox(email: string) {
  await fetch(search(email), { method: "DELETE" });
}

// Waits for the newest email to `email` and returns the first Supabase auth link in it.
export const latestAuthLink = (email: string) => latestLink(email, /href="([^"]*\/auth\/v1\/verify[^"]*)"/);

// Waits for the newest email to `email` and returns the first link matching `pattern` (one capture group).
export async function latestLink(email: string, pattern: RegExp): Promise<string> {
  let id: string | undefined;
  await expect(async () => {
    const { messages } = (await (await fetch(search(email))).json()) as { messages: { ID: string }[] };
    id = messages[0]?.ID;
    expect(id).toBeTruthy();
  }).toPass({ timeout: 15_000 });
  const message = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${id}`)).json()) as { HTML: string };
  const href = message.HTML.match(pattern)?.[1];
  if (!href) throw new Error(`No link matching ${pattern} in the email to ${email}`);
  return href.replaceAll("&amp;", "&");
}
