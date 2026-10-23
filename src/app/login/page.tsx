import type { Metadata } from "next";
import { Suspense } from "react";
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
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-950">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Sign in
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Find jobs where both sides say yes.
          </p>
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
  const message = error && error in ERROR_MESSAGES
    ? ERROR_MESSAGES[error as keyof typeof ERROR_MESSAGES]
    : error && ERROR_MESSAGES.failed;

  return (
    <>
      {message && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {message}
        </p>
      )}
      <GoogleButton next={next} />
    </>
  );
}
