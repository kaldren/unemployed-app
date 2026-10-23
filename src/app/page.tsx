import Image from "next/image";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "./auth/actions";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-950">
        <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
          <Welcome />
        </Suspense>
      </div>
    </main>
  );
}

async function Welcome() {
  const user = await getCurrentUser();

  return (
    <>
      <div className="flex items-center gap-4">
        {user.avatarUrl && (
          <Image
            src={user.avatarUrl}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="h-12 w-12 rounded-full"
          />
        )}
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            Welcome{user.fullName ? `, ${user.fullName}` : ""}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>
        </div>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="h-11 w-full rounded-full border border-black/[.12] font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-white/[.18] dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Sign out
        </button>
      </form>
    </>
  );
}
