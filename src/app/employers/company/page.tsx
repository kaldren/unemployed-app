import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { PageLoading } from "@/components/page-loading";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireEmployer } from "@/lib/auth";
import { canManageCompany, isEmailOnDomain, ROLE_LABELS } from "@/lib/employer/company";
import { getCompany, listInvites, listMembers } from "@/lib/employer/companies";
import { removeMemberAction, revokeInviteAction } from "./actions";
import { CompanyProfileForm, DeleteCompany, InviteForm, RoleSelect, VerifyDomainForm } from "./company-forms";

export const metadata: Metadata = {
  title: "Company",
};

// What /auth/verify-domain reports back as `?verify=`.
const VERIFY_RESULTS = {
  verified: { variant: "default", text: "Domain verified. You can publish jobs now." },
  invalid: { variant: "destructive", text: "That verification link has expired or was already used. Send a new one." },
  taken: { variant: "destructive", text: "Another company already verified this domain. If that's a mistake, contact us." },
} as const;

export default function CompanyPage({ searchParams }: PageProps<"/employers/company">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <CompanySettings searchParams={searchParams} />
    </Suspense>
  );
}

async function CompanySettings({ searchParams }: Pick<PageProps<"/employers/company">, "searchParams">) {
  const [user, params] = await Promise.all([requireEmployer(), searchParams]);
  const manager = canManageCompany(user.role);
  const [company, members, invites] = await Promise.all([
    getCompany(user.company.id),
    listMembers(user.company.id),
    manager ? listInvites(user.company.id) : [],
  ]);
  if (!company) return null;
  // A spent link reads "invalid", e.g. when a mail scanner opened it first; if the company is verified, it worked.
  const verify = typeof params.verify === "string" && Object.hasOwn(VERIFY_RESULTS, params.verify)
    ? (params.verify as keyof typeof VERIFY_RESULTS)
    : null;
  const result = verify === "invalid" && company.verifiedAt ? VERIFY_RESULTS.verified : verify && VERIFY_RESULTS[verify];

  return (
    <>
      <AppHeader user={user} view="employer" current="company" />
      <main className="flex justify-center px-4 pt-6 pb-16">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-tight text-balance">{company.name}</h1>
              {company.verifiedAt ? (
                <Badge className="bg-success-soft text-success-soft-foreground">Verified</Badge>
              ) : (
                <Badge variant="secondary">Unverified</Badge>
              )}
            </div>
            <p className="text-base text-muted-foreground">{company.domain}</p>
          </div>

          {result && (
            <Alert variant={result.variant} aria-live="polite">
              {result.text}
            </Alert>
          )}

          {!company.verifiedAt && (
            <Card asChild>
              <section aria-labelledby="verify-title">
                <CardHeader>
                  <CardTitle asChild>
                    <h2 id="verify-title">Verify {company.domain}</h2>
                  </CardTitle>
                  <CardDescription>
                    Only verified companies can publish jobs. We&apos;ll email a link to an address on your domain.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VerifyDomainForm
                    domain={company.domain}
                    suggestedEmail={isEmailOnDomain(user.email, company.domain) ? user.email : ""}
                  />
                </CardContent>
              </section>
            </Card>
          )}

          {manager ? (
            <CompanyProfileForm
              initial={{
                name: company.name,
                website: company.website ?? "",
                logoUrl: company.logoUrl ?? "",
                description: company.description ?? "",
              }}
            />
          ) : (
            company.description && <p className="text-sm whitespace-pre-line">{company.description}</p>
          )}

          <Card asChild>
            <section aria-labelledby="team-title">
              <CardHeader>
                <CardTitle asChild>
                  <h2 id="team-title">Team</h2>
                </CardTitle>
                <CardDescription>
                  Admins manage the profile and the team. Recruiters post jobs and review candidates.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <ul className="flex flex-col divide-y divide-border" aria-label="Members">
                  {members.map((member) => {
                    const name = member.fullName || member.email;
                    return (
                      <li key={member.profileId} className="flex flex-wrap items-center gap-3 py-3">
                        <div className="mr-auto flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {name}
                            {member.profileId === user.id && <span className="text-muted-foreground"> (you)</span>}
                          </span>
                          {member.fullName && <span className="truncate text-muted-foreground">{member.email}</span>}
                        </div>
                        {manager && member.role !== "owner" ? (
                          <>
                            <div className="w-36">
                              <RoleSelect profileId={member.profileId} role={member.role} label={`Role for ${name}`} />
                            </div>
                            <form action={removeMemberAction}>
                              <input type="hidden" name="profileId" value={member.profileId} />
                              <Button type="submit" variant="ghost" size="sm" className="text-destructive" aria-label={`Remove ${name}`}>
                                Remove
                              </Button>
                            </form>
                          </>
                        ) : (
                          <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {manager && (
                  <>
                    {invites.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-medium">Invited</h3>
                        <ul className="flex flex-col divide-y divide-border" aria-label="Pending invites">
                          {invites.map((invite) => (
                            <li key={invite.id} className="flex flex-wrap items-center gap-3 py-2">
                              <span className="mr-auto truncate">{invite.email}</span>
                              <Badge variant="secondary">{ROLE_LABELS[invite.role]}</Badge>
                              <form action={revokeInviteAction}>
                                <input type="hidden" name="inviteId" value={invite.id} />
                                <Button type="submit" variant="ghost" size="sm" aria-label={`Cancel invite for ${invite.email}`}>
                                  Cancel
                                </Button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <InviteForm />
                  </>
                )}
              </CardContent>
            </section>
          </Card>

          {user.role === "owner" && (
            <section aria-label="Delete company" className="pt-10">
              <DeleteCompany name={company.name} />
            </section>
          )}
        </div>
      </main>
    </>
  );
}
