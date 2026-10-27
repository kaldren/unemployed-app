"use server";

import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { emailSchema } from "@/lib/employer/company";
import { newPasswordSchema } from "@/lib/password";
import { AUTH_ERRORS, PASSWORD_PATH, safeNextPath } from "@/lib/portal";
import { ensureProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export type PasswordAuthState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

const credentials = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
  next: z.string().nullable(),
});

const newCredentials = credentials.extend({
  password: newPasswordSchema,
});

const TOO_MANY = "Too many attempts. Wait a minute and try again.";

function parse<S extends z.ZodType>(schema: S, formData: FormData) {
  return schema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    next: formData.get("next"),
  });
}

// Email links land on /auth/callback, which creates the profile and then opens `next`.
async function callbackUrl(next: string) {
  // Next.js only runs Server Actions whose Origin matches the host, so this is our own site.
  const origin = (await headers()).get("origin");
  if (!origin) return null;
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", next);
  return url.toString();
}

export async function signInWithPassword(_prev: PasswordAuthState, formData: FormData): Promise<PasswordAuthState> {
  const parsed = parse(credentials, formData);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]!.message };
  const { email, password, next } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") {
      return { status: "error", message: "Confirm your email first. Check your inbox for the link we sent." };
    }
    if (error?.status === 429) return { status: "error", message: TOO_MANY };
    // The same message for an unknown email, a wrong password, or a Google-only account.
    return { status: "error", message: "Wrong email or password. Signed up with Google? Use Continue with Google, or reset your password." };
  }

  try {
    await ensureProfile(data.user);
  } catch (err) {
    console.error("Failed to create profile", err);
    await supabase.auth.signOut({ scope: "local" });
    return { status: "error", message: AUTH_ERRORS.failed };
  }
  // safeNextPath keeps it a same-site path; typed routes can't check a path from the URL.
  redirect(safeNextPath(next) as Route);
}

// Supabase emails a confirmation link. For an email that already has an account it either says so
// (`user_already_exists`) or, with enumeration protection, sends nothing and returns a look-alike user;
// then the "check your inbox" reply also says what to do if they already have an account.
export async function signUpWithPassword(_prev: PasswordAuthState, formData: FormData): Promise<PasswordAuthState> {
  const parsed = parse(newCredentials, formData);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]!.message };
  const { email, password, next } = parsed.data;

  const emailRedirectTo = await callbackUrl(safeNextPath(next));
  if (!emailRedirectTo) return { status: "error", message: AUTH_ERRORS.failed };
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo } });
  if (error) {
    if (error.status === 429) return { status: "error", message: TOO_MANY };
    if (error.code === "weak_password") return { status: "error", message: "Choose a stronger password." };
    if (error.code === "user_already_exists") {
      return { status: "error", message: "This email already has an account. Sign in, continue with Google, or reset your password." };
    }
    console.error("Sign-up failed", error);
    return { status: "error", message: AUTH_ERRORS.failed };
  }
  return { status: "sent", email };
}

// Emails a reset link that signs the user in and opens the new-password page. Works for Google-only
// accounts too: setting a password adds email sign-in to the same account.
export async function requestPasswordReset(_prev: PasswordAuthState, formData: FormData): Promise<PasswordAuthState> {
  const parsed = emailSchema.safeParse(formData.get("email") ?? "");
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]!.message };

  const redirectTo = await callbackUrl(PASSWORD_PATH);
  if (!redirectTo) return { status: "error", message: AUTH_ERRORS.failed };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo });
  if (error) {
    if (error.status === 429) return { status: "error", message: TOO_MANY };
    console.error("Password reset failed", error);
    return { status: "error", message: AUTH_ERRORS.failed };
  }
  return { status: "sent", email: parsed.data };
}
