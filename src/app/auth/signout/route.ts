import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Clears a session that can't be used (e.g. a user without a profile) and sends them to sign in again.
// Server Components can't write cookies, so they redirect here instead.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const url = new URL("/login", request.url);
  url.searchParams.set("error", "session");
  return NextResponse.redirect(url);
}
