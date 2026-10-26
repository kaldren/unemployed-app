import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "@/components/google-button";
import { ConsentNote, SiteFooter } from "@/components/site-footer";
import { safeNextPath } from "@/lib/auth";
import { authErrorMessage, LOGIN_PATH } from "@/lib/portal";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="flex w-full max-w-sm flex-col gap-10 text-center">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-semibold tracking-tight">{SITE_NAME}</h1>
            <p className="text-base text-muted-foreground">{SITE_TAGLINE}</p>
          </div>
          {/* searchParams are request data, so they stream in behind a boundary. */}
          <Suspense fallback={<GoogleButton disabled />}>
            <SignInOptions searchParams={searchParams} />
          </Suspense>
          <ConsentNote />
          <Button asChild variant="link" size="sm">
            <Link href={LOGIN_PATH.employer}>Hiring? Sign in as an employer</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

async function SignInOptions({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const message = authErrorMessage(params.error);

  return (
    <>
      {message && <Alert variant="destructive">{message}</Alert>}
      <GoogleButton next={next} />
    </>
  );
}
