import type { Metadata } from "next";
import { Suspense } from "react";
import { Alert } from "@/components/ui/alert";
import { safeNextPath } from "@/lib/auth";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { GoogleButton } from "./google-button";

export const metadata: Metadata = {
  title: "Sign in",
};

const ERROR_MESSAGES = {
  cancelled: "Sign-in was cancelled. Try again when you're ready.",
  failed: "Something went wrong while signing you in. Please try again.",
  session: "Your session has ended. Please sign in again.",
} as const;

// Own keys only, so prototype keys like "constructor" don't count as known codes.
const isKnownError = (code: string): code is keyof typeof ERROR_MESSAGES => Object.hasOwn(ERROR_MESSAGES, code);

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 pb-16">
      <div className="flex w-full max-w-sm flex-col gap-10 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">{SITE_NAME}</h1>
          <p className="text-base text-muted-foreground">{SITE_TAGLINE}</p>
        </div>
        {/* searchParams are request data, so they stream in behind a boundary. */}
        <Suspense fallback={<GoogleButton />}>
          <SignInOptions searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function SignInOptions({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? params.error : null;
  const message = error && (isKnownError(error) ? ERROR_MESSAGES[error] : ERROR_MESSAGES.failed);

  return (
    <>
      {message && <Alert variant="destructive">{message}</Alert>}
      <GoogleButton next={next} />
    </>
  );
}
