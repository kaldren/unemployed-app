"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LOGIN_PATH } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

// Each kind of user goes back to their own sign-in page.
export async function signOut() {
  const { type } = await getCurrentUser();
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(LOGIN_PATH[type]);
}
