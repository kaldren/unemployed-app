import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SITE_NAME } from "@/lib/site";

// A readable page of legal text, public, with the brand linking home.
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <header className="flex justify-center px-4">
        <div className="flex h-16 w-full max-w-5xl items-center">
          <Link
            href="/"
            className="rounded-md text-base font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {SITE_NAME}
          </Link>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-4 pt-6 pb-16">
        <article className="flex w-full max-w-2xl flex-col gap-6 text-sm leading-6 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_h2]:pt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">Last updated {updated}</p>
          </div>
          {children}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
