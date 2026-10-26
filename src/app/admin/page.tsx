import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { PageLoading } from "@/components/page-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { listCompaniesToReview } from "@/lib/employer/queries";
import { setCompanyStatus } from "./actions";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false },
};

const STATUS_LABELS = {
  pending: "Pending",
  needs_review: "Needs review",
  rejected: "Rejected",
  approved: "Approved",
} as const;

export default function AdminPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Companies />
    </Suspense>
  );
}

async function Companies() {
  const user = await requireAdmin();
  const companies = await listCompaniesToReview();

  return (
    <>
      <AppHeader user={user} />
      <main className="flex justify-center px-4 pt-6 pb-16">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-4xl font-semibold tracking-tight text-balance">Companies</h1>
            <p className="text-base text-muted-foreground">
              Companies the AI didn&apos;t approve. Candidates see a company&apos;s jobs once it&apos;s approved.
            </p>
          </div>

          {companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing to review.</p>
          ) : (
            <ul className="flex flex-col gap-3" aria-label="Companies">
              {companies.map((company) => (
                <li key={company.id}>
                  <Card asChild size="sm" className="px-4">
                    <section aria-label={company.domain}>
                      <CardHeader className="px-0">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle>{company.name}</CardTitle>
                          <Badge variant={company.status === "rejected" ? "destructive" : "secondary"}>
                            {STATUS_LABELS[company.status]}
                          </Badge>
                        </div>
                        <CardDescription>
                          <a
                            href={`https://${company.domain}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="underline underline-offset-4"
                          >
                            {company.domain}
                          </a>{" "}
                          · {company.members} {company.members === 1 ? "member" : "members"} · joined{" "}
                          {company.createdAt.toLocaleDateString("en-GB")}
                        </CardDescription>
                      </CardHeader>
                      <p className="text-sm">{company.vettingReason ?? "Not vetted yet."}</p>
                      <form action={setCompanyStatus} className="flex items-center gap-3">
                        <input type="hidden" name="companyId" value={company.id} />
                        <Button type="submit" name="status" value="approved" variant="outline" size="sm">
                          Approve
                        </Button>
                        {company.status !== "rejected" && (
                          <Button
                            type="submit"
                            name="status"
                            value="rejected"
                            variant="link"
                            size="sm"
                            className="text-destructive"
                          >
                            Reject
                          </Button>
                        )}
                      </form>
                    </section>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
