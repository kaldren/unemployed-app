import { Briefcase, Search } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { openView } from "@/app/account/actions";
import { NameStep } from "@/app/account/name-fields";
import { signOut } from "@/app/auth/actions";
import { SparkText } from "@/components/brand";
import { PageLoading } from "@/components/page-loading";
import { Button } from "@/components/ui/button";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { firstNameOf, hasName, splitFullName } from "@/lib/name";

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
  if (!hasName(user)) return <AskName user={user} />;
  const firstName = firstNameOf(user);

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
        <form action={signOut} className="text-center text-sm text-muted-foreground">
          Not {user.email}?{" "}
          <Button type="submit" variant="link" size="sm" className="h-auto px-0">
            Sign out
          </Button>
        </form>
      </div>
    </main>
  );
}

// Accounts from Google without a name (or from before names were asked) give it first.
function AskName({ user }: { user: CurrentUser }) {
  const split = splitFullName(user.fullName);
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <p className="text-sm font-medium text-primary">Welcome</p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance">
            What&apos;s your <SparkText>name</SparkText>?
          </h1>
          <p className="text-base text-muted-foreground">Companies and teammates see it.</p>
        </div>
        <NameStep initial={{ firstName: user.firstName ?? split.firstName ?? "", lastName: user.lastName ?? split.lastName ?? "" }} />
      </div>
    </main>
  );
}
