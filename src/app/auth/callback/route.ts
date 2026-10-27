import type { EmailOtpType, User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { safeNextPath } from "@/lib/auth";
import { ensureEmployerProfile, profileValues } from "@/lib/employer/profile";
import { HOME_PATH, LOGIN_PATH, parsePortal, type AuthError, type Portal } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

// Email links: sign-in, "Confirm signup" (`signup`) and "Reset password" (`recovery`, with `next` set to
// the new-password page by the reset request).
const EMAIL_OTP_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "recovery"];

// Google (via Supabase), magic links, sign-up confirmations and password resets land here. Google sends a
// one-time `code` (or an error if the user cancelled); email links send a `code` too, or a `token_hash` when
// the email template links here directly.
// `portal` says which sign-in page the user came from.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const portal = parsePortal(searchParams.get("portal"));
  const next = safeNextPath(searchParams.get("next"), HOME_PATH[portal]);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let user: User | null = null;
  if (code) {
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    user = data.user;
  } else if (tokenHash && otpType && EMAIL_OTP_TYPES.includes(otpType)) {
    const { data } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash });
    user = data.user;
  } else {
    // Supabase sends `error=access_denied` when the user cancels on Google's consent screen.
    return loginWithError(request, portal, searchParams.get("error") === "access_denied" ? "cancelled" : "failed");
  }
  if (!user) return loginWithError(request, portal, "failed");

  let result: AuthError | null;
  try {
    result = portal === "employer" ? await ensureEmployerProfile(user) : await createCandidateProfile(user);
  } catch (err) {
    console.error("Failed to create profile", err);
    result = "failed";
  }
  if (result) {
    // Local only: a refused sign-in mustn't end the user's sessions on other devices.
    await supabase.auth.signOut({ scope: "local" });
    return loginWithError(request, portal, result);
  }

  return NextResponse.redirect(new URL(next, request.url));
}

// First sign-in creates the profile; later sign-ins leave it as is.
async function createCandidateProfile(user: User): Promise<null> {
  await db.insert(profiles).values(profileValues(user, "candidate")).onConflictDoNothing({ target: profiles.id });
  return null;
}

function loginWithError(request: NextRequest, portal: Portal, reason: AuthError) {
  const url = new URL(LOGIN_PATH[portal], request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}
