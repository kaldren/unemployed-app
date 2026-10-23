import type { Metadata } from "next";
import { Suspense } from "react";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth";
import { GoogleButton } from "./google-button";

export const metadata: Metadata = {
  title: "Sign in",
};

const ERROR_MESSAGES = {
  cancelled: "Sign-in was cancelled. Try again when you're ready.",
  failed: "Something went wrong while signing you in. Please try again.",
  session: "Your session has ended. Please sign in again.",
} as const;

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm gap-6 p-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-base text-muted-foreground">
            Find jobs where both sides say yes.
          </p>
        </div>
        {/* searchParams are request data, so they stream in behind a boundary. */}
        <Suspense fallback={<GoogleButton />}>
          <SignInOptions searchParams={searchParams} />
        </Suspense>
      </Card>
    </main>
  );
}

async function SignInOptions({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? params.error : null;
  const message = error && error in ERROR_MESSAGES
    ? ERROR_MESSAGES[error as keyof typeof ERROR_MESSAGES]
    : error && ERROR_MESSAGES.failed;

  return (
    <>
      {message && (
        <Alert variant="destructive">{message}</Alert>
      )}
      <GoogleButton next={next} />
    </>
  );
}
