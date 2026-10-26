import Link from "next/link";
import { Brand, SparkText } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { LOGIN_PATH } from "@/lib/portal";

const STEPS = [
  {
    title: "Build your profile",
    body: "Your skills, experience and what you want next: pay, place and how you like to work.",
  },
  {
    title: "Get matched",
    body: "AI checks every job against your profile and shows only the ones you really fit, with the reason why.",
  },
  {
    title: "Both say yes",
    body: "Like a job to apply. When the company likes you back, it's a match and you can talk.",
  },
];

const PROMISES = [
  {
    title: "For candidates",
    body: "No applications into the void. Every job you see shows its pay, and your current employer never sees you.",
  },
  {
    title: "For employers",
    body: "Only qualified people, on anonymous cards with no name or photo, so you judge the work. A human makes every decision.",
  },
];

// What a visitor sees on the home page.
export function Landing() {
  return (
    <>
      <header className="flex justify-center px-4">
        <div className="flex h-16 w-full max-w-5xl items-center gap-2">
          <span className="mr-auto">
            <Brand />
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link href={LOGIN_PATH.employer}>For employers</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={LOGIN_PATH.candidate}>Sign in</Link>
          </Button>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-4 pt-16 pb-24">
        <div className="flex w-full max-w-3xl flex-col gap-20">
          <section className="flex flex-col items-center gap-6 text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Jobs where <SparkText>both sides say yes</SparkText>
            </h1>
            <p className="max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
              A hiring app that works like matchmaking. You only see jobs you fit, companies only see people who
              fit, and a conversation starts when you both say yes.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="spark">
                <Link href={LOGIN_PATH.candidate}>Find a job</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={LOGIN_PATH.employer}>Hire with us</Link>
              </Button>
            </div>
          </section>

          <section aria-labelledby="how-title" className="flex flex-col gap-8">
            <h2 id="how-title" className="text-center text-2xl font-semibold tracking-tight">
              How it works
            </h2>
            <ol className="grid gap-8 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex flex-col gap-2">
                  <span className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">
                    <span className="sr-only">Step </span>
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-label="Why it's better" className="grid gap-8 sm:grid-cols-2">
            {PROMISES.map((promise) => (
              <div key={promise.title} className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold">{promise.title}</h2>
                <p className="text-sm text-muted-foreground">{promise.body}</p>
              </div>
            ))}
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
