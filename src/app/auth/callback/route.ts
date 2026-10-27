import type { EmailOtpType, User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth";
import { LOGIN_PATH, type AuthError } from "@/lib/portal";
import { ensureProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

// Email links: sign-in, "Confirm signup" (`signup`) and "Reset password" (`recovery`, with `next` set to
// the new-password page by the reset request).
const EMAIL_OTP_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "recovery"];

// Google (via Supabase), sign-up confirmations, password resets and email links land here. Google sends a
// one-time `code` (or an error if the user cancelled); email links send a `code` too, or a `token_hash` when
// the email template links here directly. Without `next` the user goes to `/`, which opens their
// default view, or asks for one on the first sign-in.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
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
    return loginWithError(request, searchParams.get("error") === "access_denied" ? "cancelled" : "failed");
  }
  if (!user) return loginWithError(request, "failed");

  try {
    await ensureProfile(user);
  } catch (err) {
    console.error("Failed to create profile", err);
    // Local only: a failed sign-in mustn't end the user's sessions on other devices.
    await supabase.auth.signOut({ scope: "local" });
    return loginWithError(request, "failed");
  }

  return NextResponse.redirect(new URL(next, request.url));
}

function loginWithError(request: NextRequest, reason: AuthError) {
  const url = new URL(LOGIN_PATH, request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}
