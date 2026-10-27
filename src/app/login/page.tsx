import type { Metadata } from "next";
import { Suspense } from "react";
import { Alert } from "@/components/ui/alert";
import { SparkText } from "@/components/brand";
import { GoogleButton } from "@/components/google-button";
import { ConsentNote, SiteFooter } from "@/components/site-footer";
import { safeNextPath } from "@/lib/auth";
import { authErrorMessage } from "@/lib/portal";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = {
  title: "Sign in",
};

// The one sign-in page: one account finds jobs and hires, whichever method it signs in with.
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="flex w-full max-w-sm flex-col gap-10 text-center">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-semibold tracking-tight">
              <SparkText>{SITE_NAME}</SparkText>
            </h1>
            <p className="text-base text-muted-foreground">{SITE_TAGLINE}</p>
          </div>
          {/* searchParams are request data, so they stream in behind a boundary. */}
          <Suspense fallback={<SignInOptions disabled />}>
            <SignInOptionsFromParams searchParams={searchParams} />
          </Suspense>
          <ConsentNote />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

async function SignInOptionsFromParams({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  return <SignInOptions next={next} message={authErrorMessage(params.error)} />;
}

function SignInOptions({ next, message, disabled }: { next?: string; message?: string | null; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      {message && <Alert variant="destructive">{message}</Alert>}
      <GoogleButton next={next} disabled={disabled} />
      <p className="text-sm text-muted-foreground">or use your email</p>
      <PasswordForm next={next} disabled={disabled} />
    </div>
  );
}
