import type { EmailOtpType, User } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { companies, companyMembers, profiles } from "@/db/schema";
import { safeNextPath } from "@/lib/auth";
import { companyNameFromDomain, emailDomain, isWorkEmail } from "@/lib/employer/work-email";
import { HOME_PATH, LOGIN_PATH, parsePortal, type AuthError, type Portal } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

// New users may get the "Confirm signup" email, whose link carries `type=signup`.
const EMAIL_OTP_TYPES: EmailOtpType[] = ["email", "magiclink", "signup"];

// Google (via Supabase) and magic links land here. Google sends a one-time `code` (or an error if the
// user cancelled); magic links send a `code` too, or a `token_hash` when the email template links here directly.
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
    result = portal === "employer" ? await createEmployer(user) : await createCandidateProfile(user);
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

function requireEmail(user: User): string {
  if (!user.email) throw new Error(`User ${user.id} has no email`);
  return user.email;
}

function profileValues(user: User, type: Portal) {
  const meta = user.user_metadata;
  return {
    id: user.id,
    type,
    email: requireEmail(user),
    fullName: meta.full_name ?? meta.name ?? null,
    avatarUrl: meta.avatar_url ?? meta.picture ?? null,
  };
}

// First sign-in creates the profile; later sign-ins leave it as is.
async function createCandidateProfile(user: User): Promise<null> {
  await db.insert(profiles).values(profileValues(user, "candidate")).onConflictDoNothing({ target: profiles.id });
  return null;
}

// First sign-in creates the employer profile and joins the company for the email's domain,
// creating the company (as its owner) if this is the first person from that domain.
async function createEmployer(user: User): Promise<AuthError | null> {
  const email = requireEmail(user);
  const [existing] = await db.select({ type: profiles.type }).from(profiles).where(eq(profiles.id, user.id));
  if (existing) return existing.type === "employer" ? null : "candidate_account";
  if (!isWorkEmail(email)) return "personal_email";

  const domain = emailDomain(email);
  await db.transaction(async (tx) => {
    // The same link opened twice at once: the second request waits here, then finds the profile made.
    const [inserted] = await tx
      .insert(profiles)
      .values(profileValues(user, "employer"))
      .onConflictDoNothing({ target: profiles.id })
      .returning({ id: profiles.id });
    if (!inserted) return;
    const [created] = await tx
      .insert(companies)
      .values({ domain, name: companyNameFromDomain(domain) })
      .onConflictDoNothing({ target: companies.domain })
      .returning({ id: companies.id });
    const companyId =
      created?.id ??
      (await tx.select({ id: companies.id }).from(companies).where(eq(companies.domain, domain)))[0]!.id;
    await tx.insert(companyMembers).values({ profileId: user.id, companyId, role: created ? "owner" : "member" });
  });
  return null;
}

function loginWithError(request: NextRequest, portal: Portal, reason: AuthError) {
  const url = new URL(LOGIN_PATH[portal], request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}
