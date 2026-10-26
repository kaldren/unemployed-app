"use server";

import { redirect } from "next/navigation";
import { deleteUser } from "@/lib/account";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const RESUME_BUCKET = "resumes";

// Deletes the signed-in user's account and everything in it, then signs them out to the home page.
export async function deleteAccount() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  if (user.type === "candidate") {
    // Their own session: Storage policies limit them to their own folder. Nothing there is fine.
    const { data: files } = await supabase.storage.from(RESUME_BUCKET).list(user.id);
    if (files?.length) {
      const { error } = await supabase.storage.from(RESUME_BUCKET).remove(files.map((f) => `${user.id}/${f.name}`));
      if (error) console.error("Resume delete failed", error);
    }
  }

  await deleteUser(user.id);
  // Local only: the user is gone, so there's no server session left to end.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}
