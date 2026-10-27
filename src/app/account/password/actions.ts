"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import type { ActionState } from "@/lib/candidate/schemas";
import { newPasswordSchema } from "@/lib/password";
import { createClient } from "@/lib/supabase/server";

// Sets the signed-in user's password: after a reset link, or to add email sign-in to a Google account.
export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await getCurrentUser();
  const parsed = newPasswordSchema.safeParse(formData.get("password") ?? "");
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]!.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    if (error.code === "same_password") return { status: "error", message: "Choose a password you haven't used here before." };
    if (error.code === "weak_password") return { status: "error", message: "Choose a stronger password." };
    console.error("Password update failed", error);
    return { status: "error", message: "Something went wrong. Please try again." };
  }
  redirect("/");
}
