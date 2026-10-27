import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/auth";
import { COMPANY_PATH, HOME_PATH, MATCHES_PATH } from "@/lib/portal";

// The one bar on every signed-in page: brand (home) on the left, account on the right.
export function AppHeader({ user, current }: { user: CurrentUser; current?: "profile" | "matches" | "company" }) {
  return (
    <header className="flex justify-center px-4">
      <div className="flex h-16 w-full max-w-5xl items-center gap-2">
        <Link
          href={HOME_PATH[user.type]}
          className="mr-auto rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {/* Three nav items don't fit beside the name at phone width; the mark still links home. */}
          <Brand nameClassName="max-sm:sr-only" />
        </Link>
        <Button asChild variant="ghost" size="sm" className="aria-[current=page]:bg-accent aria-[current=page]:text-primary">
          <Link href={MATCHES_PATH[user.type]} aria-current={current === "matches" ? "page" : undefined}>
            Matches
          </Link>
        </Button>
        {user.type === "candidate" && (
          <Button asChild variant="ghost" size="sm" className="aria-[current=page]:bg-accent aria-[current=page]:text-primary">
            <Link href="/profile" aria-current={current === "profile" ? "page" : undefined}>
              Profile
            </Link>
          </Button>
        )}
        {user.type === "employer" && (
          <Button asChild variant="ghost" size="sm" className="aria-[current=page]:bg-accent aria-[current=page]:text-primary">
            <Link href={COMPANY_PATH} aria-current={current === "company" ? "page" : undefined}>
              Company
            </Link>
          </Button>
        )}
        <form action={signOut}>
          <input type="hidden" name="portal" value={user.type} />
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
        {user.avatarUrl && (
          <Image src={user.avatarUrl} alt="" width={32} height={32} unoptimized className="ml-1 size-8 rounded-full ring-2 ring-brand ring-offset-2 ring-offset-background" />
        )}
      </div>
    </header>
  );
}
