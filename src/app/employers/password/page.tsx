import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { PageLoading } from "@/components/page-loading";
import { requireEmployerAccount } from "@/lib/auth";
import { PasswordUpdateForm } from "./password-update-form";

export const metadata: Metadata = {
  title: "Set a password",
};

// Password reset links open this page, signed in. Google users can also add a password here.
export default function PasswordPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SetPassword />
    </Suspense>
  );
}

async function SetPassword() {
  const user = await requireEmployerAccount();
  return (
    <>
      <AppHeader user={user} />
      <main className="flex justify-center px-4 pt-10 pb-16">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Set a password</h1>
            <p className="text-base text-muted-foreground">
              Then sign in with <span className="font-medium text-foreground break-all">{user.email}</span> and this
              password, or keep using Google.
            </p>
          </div>
          <PasswordUpdateForm />
        </div>
      </main>
    </>
  );
}
