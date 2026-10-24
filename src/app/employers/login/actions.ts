"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth";
import { isWorkEmail } from "@/lib/employer/work-email";
import { AUTH_ERRORS, HOME_PATH } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

export type MagicLinkState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

const schema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Enter a valid email address." }))
    .refine(isWorkEmail, { error: AUTH_ERRORS.personal_email }),
  next: z.string().nullable(),
});

// Emails an employer a one-time sign-in link to their work address.
export async function sendMagicLink(_prev: MagicLinkState, formData: FormData): Promise<MagicLinkState> {
  const parsed = schema.safeParse({ email: formData.get("email") ?? "", next: formData.get("next") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]!.message };
  const { email, next } = parsed.data;

  // Next.js only runs Server Actions whose Origin matches the host, so this is our own site.
  const origin = (await headers()).get("origin");
  if (!origin) return { status: "error", message: AUTH_ERRORS.failed };
  const redirectTo = new URL("/auth/callback", origin);
  redirectTo.searchParams.set("portal", "employer");
  redirectTo.searchParams.set("next", safeNextPath(next, HOME_PATH.employer));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo.toString(), shouldCreateUser: true },
  });
  if (error) {
    console.error("Failed to send magic link", error);
    const message =
      error.status === 429 ? "Too many sign-in emails. Wait a minute and try again." : AUTH_ERRORS.failed;
    return { status: "error", message };
  }
  return { status: "sent", email };
}
