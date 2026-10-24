import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GoogleButton } from "@/components/google-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { safeNextPath } from "@/lib/auth";
import { authErrorMessage, HOME_PATH, LOGIN_PATH } from "@/lib/portal";
import { SITE_NAME } from "@/lib/site";
import { EmailForm } from "./email-form";

export const metadata: Metadata = {
  title: "Employer sign in",
};

export default function EmployerLoginPage({ searchParams }: PageProps<"/employers/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 pb-16">
      <div className="flex w-full max-w-sm flex-col gap-10 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">{SITE_NAME} for employers</h1>
          <p className="text-base text-muted-foreground">Sign in with your work email to hire.</p>
        </div>
        {/* searchParams are request data, so they stream in behind a boundary. */}
        <Suspense fallback={<SignInOptions disabled />}>
          <SignInOptionsFromParams searchParams={searchParams} />
        </Suspense>
        <Button asChild variant="link" size="sm">
          <Link href={LOGIN_PATH.candidate}>Looking for a job? Sign in here</Link>
        </Button>
      </div>
    </main>
  );
}

async function SignInOptionsFromParams({ searchParams }: Pick<PageProps<"/employers/login">, "searchParams">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null, HOME_PATH.employer);
  return <SignInOptions next={next} message={authErrorMessage(params.error)} />;
}

function SignInOptions({ next, message, disabled }: { next?: string; message?: string | null; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      {message && <Alert variant="destructive">{message}</Alert>}
      <EmailForm next={next} disabled={disabled} />
      <GoogleButton portal="employer" next={next} disabled={disabled} />
    </div>
  );
}
