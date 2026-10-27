"use client";

import { ChevronDown, LogOut, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CurrentUser } from "@/lib/auth";
import { displayName, initials } from "@/lib/name";
import { SETTINGS_PATH } from "@/lib/portal";

// The header's account button: the user's picture and name, opening Settings and Sign out.
export function AccountMenu({ user }: { user: CurrentUser }) {
  const [signingOut, startSignOut] = useTransition();
  const name = displayName(user);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="ml-1 max-w-48 gap-2 pl-1 max-sm:pr-1" aria-label={`Account: ${name}`}>
          {user.avatarUrl ? (
            <Image src={user.avatarUrl} alt="" width={28} height={28} unoptimized className="size-7 rounded-full" />
          ) : (
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-spark-1 to-spark-2 text-xs font-semibold text-primary-foreground"
            >
              {initials(user)}
            </span>
          )}
          <span className="truncate max-sm:hidden">{name}</span>
          <ChevronDown aria-hidden className="text-muted-foreground max-sm:hidden" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
          {name !== user.email && <span className="truncate text-xs text-muted-foreground">{user.email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={SETTINGS_PATH}>
            <Settings aria-hidden />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={signingOut} onSelect={() => startSignOut(() => signOut())}>
          <LogOut aria-hidden />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
