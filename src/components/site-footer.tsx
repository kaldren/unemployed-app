import Link from "next/link";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

const linkClass = "rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

// Legal links and contact, on public pages.
export function SiteFooter() {
  return (
    <footer className="flex justify-center px-4 pb-8">
      <div className="flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="mr-auto">{SITE_NAME}</span>
        <Link href="/privacy" className={linkClass}>
          Privacy
        </Link>
        <Link href="/terms" className={linkClass}>
          Terms
        </Link>
        <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
          Contact
        </a>
      </div>
    </footer>
  );
}

// Under every sign-in button: signing up means accepting the terms.
export function ConsentNote() {
  return (
    <p className="text-xs text-muted-foreground">
      By continuing you agree to our{" "}
      <Link href="/terms" className="underline underline-offset-4">
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="underline underline-offset-4">
        Privacy Policy
      </Link>
      .
    </p>
  );
}
