import { Briefcase, Search } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { openView } from "@/app/account/actions";
import { SparkText } from "@/components/brand";
import { PageLoading } from "@/components/page-loading";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Welcome",
};

const CHOICES = [
  {
    view: "candidate",
    icon: Search,
    title: "Find a job",
    detail: "Build your profile and see jobs our AI matched to you.",
  },
  {
    view: "employer",
    icon: Briefcase,
    title: "Hire",
    detail: "Set up your company, post jobs and meet people who fit.",
  },
] as const;

// Asked once, after the first sign-in. The answer only picks the landing dashboard: the nav switches views.
export default function WelcomePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  const user = await getCurrentUser();
  const firstName = user.fullName?.trim().split(/\s+/)[0];

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-xl flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <p className="text-sm font-medium text-primary">{firstName ? `Welcome, ${firstName}` : "Welcome"}</p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance">
            What do you want to do <SparkText>first</SparkText>?
          </h1>
          <p className="text-base text-muted-foreground">You can do both. Switch anytime from the top bar.</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {CHOICES.map(({ view, icon: Icon, title, detail }) => (
            <li key={view}>
              <form action={openView} className="h-full">
                <input type="hidden" name="view" value={view} />
                <button
                  type="submit"
                  className="flex h-full w-full flex-col items-start gap-3 rounded-2xl bg-card p-6 text-left shadow-sm ring-1 ring-border transition-shadow outline-none hover:ring-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="flex size-11 items-center justify-center rounded-full bg-accent text-primary">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="text-lg font-semibold">{title}</span>
                  <span className="text-sm text-muted-foreground">{detail}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
