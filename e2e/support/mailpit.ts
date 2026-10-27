import { expect } from "@playwright/test";

// The local Supabase stack catches every auth email in Mailpit (supabase/config.toml, [local_smtp]).
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:55324";

const search = (email: string) => `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`;

export async function clearInbox(email: string) {
  await fetch(search(email), { method: "DELETE" });
}

// Waits for the newest email to `email` and returns the first Supabase auth link in it.
export async function latestAuthLink(email: string): Promise<string> {
  let id: string | undefined;
  await expect(async () => {
    const { messages } = (await (await fetch(search(email))).json()) as { messages: { ID: string }[] };
    id = messages[0]?.ID;
    expect(id).toBeTruthy();
  }).toPass({ timeout: 15_000 });
  const message = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${id}`)).json()) as { HTML: string };
  const href = message.HTML.match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/)?.[1];
  if (!href) throw new Error(`No auth link in the email to ${email}`);
  return href.replaceAll("&amp;", "&");
}
