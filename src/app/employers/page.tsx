import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { PageLoading } from "@/components/page-loading";
import { requireEmployer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Employer",
};

export default function EmployerHome() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  const user = await requireEmployer();

  return (
    <>
      <AppHeader user={user} />
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 pb-16 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-balance">
          Welcome{user.fullName ? `, ${user.fullName}` : ""}
        </h1>
        <p className="text-base text-muted-foreground">
          Hiring for <span className="font-medium text-foreground">{user.company.name}</span>
        </p>
        <p className="text-sm break-all text-muted-foreground">{user.email}</p>
      </main>
    </>
  );
}
