import { ArrowLeftRight, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { openView } from "@/app/account/actions";
import { signOut } from "@/app/auth/actions";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import type { AppView } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";
import { COMPANY_PATH, HOME_PATH, MATCHES_PATH } from "@/lib/portal";

const navItem = "aria-[current=page]:bg-accent aria-[current=page]:text-primary";

// The one bar on every signed-in page: brand (home of this view) on the left, the view's pages, a switch to
// the other view (finding a job ↔ hiring), and the account on the right. `view` defaults to the user's own.
export function AppHeader({
  user,
  view = user.defaultView ?? "candidate",
  current,
}: {
  user: CurrentUser;
  view?: AppView;
  current?: "profile" | "matches" | "company";
}) {
  const other: AppView = view === "candidate" ? "employer" : "candidate";
  return (
    <header className="flex justify-center px-4">
      <nav aria-label="Main" className="flex h-16 w-full max-w-5xl items-center gap-1 sm:gap-2">
        <Link
          href={HOME_PATH[view]}
          className="mr-auto rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {/* The nav doesn't fit beside the name at phone width; the mark still links home. */}
          <Brand nameClassName="max-sm:sr-only" />
        </Link>
        <Button asChild variant="ghost" size="sm" className={navItem}>
          <Link href={MATCHES_PATH[view]} aria-current={current === "matches" ? "page" : undefined}>
            Matches
          </Link>
        </Button>
        {view === "candidate" ? (
          <Button asChild variant="ghost" size="sm" className={navItem}>
            <Link href="/profile" aria-current={current === "profile" ? "page" : undefined}>
              Profile
            </Link>
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm" className={navItem}>
            <Link href={COMPANY_PATH} aria-current={current === "company" ? "page" : undefined}>
              Company
            </Link>
          </Button>
        )}
        <form action={openView}>
          <input type="hidden" name="view" value={other} />
          <Button type="submit" variant="outline" size="sm">
            <ArrowLeftRight aria-hidden />
            {other === "employer" ? "Hire" : "Find jobs"}
          </Button>
        </form>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm" aria-label="Sign out" className="max-sm:px-2.5">
            <LogOut aria-hidden className="sm:hidden" />
            <span className="max-sm:sr-only">Sign out</span>
          </Button>
        </form>
        {user.avatarUrl && (
          <Image src={user.avatarUrl} alt="" width={32} height={32} unoptimized className="ml-1 size-8 rounded-full ring-2 ring-brand ring-offset-2 ring-offset-background max-sm:hidden" />
        )}
      </nav>
    </header>
  );
}
