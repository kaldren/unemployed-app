import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/auth";

// The one bar on every signed-in page: brand (home) on the left, account on the right.
export function AppHeader({ user }: { user: CurrentUser }) {
  return (
    <header className="flex justify-center px-4">
      <div className="flex h-16 w-full max-w-5xl items-center gap-2">
        <Link
          href="/"
          className="mr-auto rounded-md text-base font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Unemployed
        </Link>
        {user.type === "candidate" && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/profile">Profile</Link>
          </Button>
        )}
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
        {user.avatarUrl && (
          <Image src={user.avatarUrl} alt="" width={32} height={32} unoptimized className="ml-1 size-8 rounded-full" />
        )}
      </div>
    </header>
  );
}
