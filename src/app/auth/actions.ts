"use server";

import { redirect } from "next/navigation";
import { LOGIN_PATH, parsePortal } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

// Each kind of user goes back to their own sign-in page; the form says which (it only picks the page).
export async function signOut(formData: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(LOGIN_PATH[parsePortal(formData.get("portal")?.toString())]);
}
