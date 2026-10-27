import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { PageLoading } from "@/components/page-loading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getMembership, requireEmployerAccount } from "@/lib/auth";
import { isFreeMailDomain, ROLE_LABELS } from "@/lib/employer/company";
import { invitesForEmail } from "@/lib/employer/companies";
import { emailDomain } from "@/lib/employer/work-email";
import { HOME_PATH } from "@/lib/portal";
import { acceptInviteAction } from "../actions";
import { NewCompanyForm } from "./new-company-form";

export const metadata: Metadata = {
  title: "Set up your company",
};

export default function NewCompanyPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <NewCompany />
    </Suspense>
  );
}

// Where an employer without a company lands: join one they're invited to, or create their own.
async function NewCompany() {
  const user = await requireEmployerAccount();
  if (await getMembership(user.id)) redirect(HOME_PATH.employer);
  const invites = await invitesForEmail(user.email);
  const ownDomain = emailDomain(user.email);

  return (
    <>
      <AppHeader user={user} />
      <main className="flex justify-center px-4 pt-6 pb-16">
        <div className="flex w-full max-w-xl flex-col gap-8">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-4xl font-semibold tracking-tight text-balance">Set up your company</h1>
            <p className="text-base text-muted-foreground">
              {invites.length > 0 ? "Join your team, or create a new company." : "Tell candidates who's hiring. You can change this later."}
            </p>
          </div>

          {invites.length > 0 && (
            <section aria-labelledby="invites-title" className="flex flex-col gap-3">
              <h2 id="invites-title" className="text-lg font-semibold">
                Your invites
              </h2>
              <ul className="flex flex-col gap-3">
                {invites.map((invite) => (
                  <li key={invite.id}>
                    <Card size="sm" className="flex-row flex-wrap items-center justify-between gap-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-base font-medium">{invite.companyName}</span>
                        <span className="text-sm text-muted-foreground">
                          {invite.companyDomain} · {ROLE_LABELS[invite.role]}
                        </span>
                      </div>
                      <form action={acceptInviteAction}>
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <Button type="submit">Join {invite.companyName}</Button>
                      </form>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-label="Create a company" className="flex flex-col gap-4">
            {invites.length > 0 && <h2 className="text-lg font-semibold">Create a company</h2>}
            <NewCompanyForm domain={isFreeMailDomain(ownDomain) ? "" : ownDomain} />
          </section>
        </div>
      </main>
    </>
  );
}
