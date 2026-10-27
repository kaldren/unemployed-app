"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { deleteUser } from "@/lib/account";
import { getCurrentUser, getMembership, getSessionUserId } from "@/lib/auth";
import { parseFormJson, toActionError, type ActionState } from "@/lib/candidate/schemas";
import { isCandidateComplete } from "@/lib/matching/queries";
import { joinName, nameSchema } from "@/lib/name";
import { HOME_PATH, LOGIN_PATH, NEW_COMPANY_PATH, parseView } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";

const RESUME_BUCKET = "resumes";

// Opens a view (finding a job or hiring) and makes it the one the user lands on next time.
// The first-sign-in question and the nav's view switcher both post here.
export async function openView(formData: FormData) {
  // Not getCurrentUser: its per-request cache would hand the redirect's render the old view.
  const userId = await getSessionUserId();
  if (!userId) redirect(LOGIN_PATH);
  const view = parseView(formData.get("view")) ?? "candidate";
  await db.update(profiles).set({ defaultView: view }).where(eq(profiles.id, userId));
  // Straight to the page they'll see: `/` redirects by view, and the client router may replay where it
  // redirected to before the switch.
  revalidatePath("/", "layout");
  if (view === "employer") redirect((await getMembership(userId)) ? HOME_PATH.employer : NEW_COMPANY_PATH);
  redirect((await isCandidateComplete(userId)) ? HOME_PATH.candidate : "/profile");
}

// Saves the user's first and last name, from /welcome or settings. full_name follows them.
export async function saveName(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const parsed = parseFormJson(nameSchema, formData);
  if (!parsed) return { status: "error", message: "Something went wrong. Please try again." };
  if (!parsed.success) return toActionError(parsed.error);
  await db
    .update(profiles)
    .set({ ...parsed.data, fullName: joinName(parsed.data) })
    .where(eq(profiles.id, user.id));
  // The name shows in the header on every page.
  revalidatePath("/", "layout");
  return { status: "saved", at: Date.now() };
}

// Deletes the signed-in user's account and everything in it, then signs them out to the home page.
export async function deleteAccount() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  // Their own session: Storage policies limit them to their own folder. Nothing there is fine.
  const { data: files } = await supabase.storage.from(RESUME_BUCKET).list(user.id);
  if (files?.length) {
    const { error } = await supabase.storage.from(RESUME_BUCKET).remove(files.map((f) => `${user.id}/${f.name}`));
    if (error) console.error("Resume delete failed", error);
  }

  await deleteUser(user.id);
  // Local only: the user is gone, so there's no server session left to end.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}
