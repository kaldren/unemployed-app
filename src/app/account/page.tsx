import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { DeleteAccount } from "@/components/delete-account";
import { PageLoading } from "@/components/page-loading";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { splitFullName } from "@/lib/name";
import { PASSWORD_PATH } from "@/lib/portal";
import { NameSection } from "./name-fields";

export const metadata: Metadata = {
  title: "Settings",
};

// The account menu's "Settings": the user's name, password and account.
export default function SettingsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  const user = await getCurrentUser();
  const split = splitFullName(user.fullName);
  return (
    <>
      <AppHeader user={user} />
      <main className="flex justify-center px-4 pt-6 pb-16">
        <div className="flex w-full max-w-xl flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-4xl font-semibold tracking-tight">Settings</h1>
            <p className="text-base text-muted-foreground break-all">{user.email}</p>
          </div>
          <NameSection
            initial={{ firstName: user.firstName ?? split.firstName ?? "", lastName: user.lastName ?? split.lastName ?? "" }}
          />
          <Card asChild>
            <section aria-labelledby="password-title">
              <CardHeader>
                <CardTitle asChild>
                  <h2 id="password-title">Password</h2>
                </CardTitle>
                <CardDescription>Sign in with your email and a password, as well as Google.</CardDescription>
              </CardHeader>
              <CardFooter className="border-t-0 bg-transparent pb-6">
                <Button asChild variant="outline">
                  <Link href={PASSWORD_PATH}>
                    <KeyRound aria-hidden />
                    Set a new password
                  </Link>
                </Button>
              </CardFooter>
            </section>
          </Card>
          <DeleteAccount description="Deleting your account removes your profile, likes and matches for good. A company you're the only member of goes too." />
        </div>
      </main>
    </>
  );
}
