import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getMissingItems } from "@/lib/candidate/completeness";
import { getCandidateProfile } from "@/lib/candidate/queries";
import { signOut } from "./auth/actions";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm gap-6 p-8">
        <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
          <Welcome />
        </Suspense>
      </Card>
    </main>
  );
}

async function Welcome() {
  const user = await getCurrentUser();
  // Candidates can't be matched until their profile is complete.
  if (user.type === "candidate" && getMissingItems(await getCandidateProfile(user.id)).length > 0) {
    redirect("/profile");
  }

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
          <h1 className="text-xl font-semibold">
            Welcome{user.fullName ? `, ${user.fullName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>
      {user.type === "candidate" && (
        <Button asChild size="lg" className="w-full">
          <Link href="/profile">Edit your profile</Link>
        </Button>
      )}
      <form action={signOut}>
        <Button type="submit" variant="outline" size="lg" className="w-full">
          Sign out
        </Button>
      </form>
    </>
  );
}
