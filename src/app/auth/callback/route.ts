import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { safeNextPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Google redirects here (via Supabase) with a one-time code, or with an error if the user cancelled.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (!code) {
    // Supabase sends `error=access_denied` when the user cancels on Google's consent screen.
    const reason = searchParams.get("error") === "access_denied" ? "cancelled" : "failed";
    return loginWithError(request, reason);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return loginWithError(request, "failed");

  try {
    await createCandidateProfile(data.user);
  } catch (err) {
    console.error("Failed to create profile", err);
    await supabase.auth.signOut();
    return loginWithError(request, "failed");
  }

  return NextResponse.redirect(new URL(next, request.url));
}

// First sign-in creates the profile; later sign-ins leave it as is.
async function createCandidateProfile(user: User) {
  if (!user.email) throw new Error(`User ${user.id} has no email`);
  const meta = user.user_metadata;
  await db
    .insert(profiles)
    .values({
      id: user.id,
      type: "candidate",
      email: user.email,
      fullName: meta.full_name ?? meta.name ?? null,
      avatarUrl: meta.avatar_url ?? meta.picture ?? null,
    })
    .onConflictDoNothing({ target: profiles.id });
}

function loginWithError(request: NextRequest, reason: "cancelled" | "failed") {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}
