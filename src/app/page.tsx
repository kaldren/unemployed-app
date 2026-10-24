import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { PageLoading } from "@/components/page-loading";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getMissingItems } from "@/lib/candidate/completeness";
import { getCandidateProfile } from "@/lib/candidate/queries";

export default function Home() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Welcome />
    </Suspense>
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
      <AppHeader user={user} />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-16 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-balance">
            Welcome{user.fullName ? `, ${user.fullName}` : ""}
          </h1>
          <p className="text-base break-all text-muted-foreground">{user.email}</p>
        </div>
        {user.type === "candidate" && (
          <Button asChild size="lg">
            <Link href="/profile">Edit your profile</Link>
          </Button>
        )}
      </main>
    </>
  );
}
