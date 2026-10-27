import { NextResponse, type NextRequest } from "next/server";
import { verifyDomainToken } from "@/lib/employer/companies";
import { vetCompanySoon } from "@/lib/employer/vetting";
import { COMPANY_PATH } from "@/lib/portal";

// The link in the domain verification email. The token proves access to an address on the domain, so
// whoever opens it needn't be signed in. Then on to company settings, which say how it went.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const { result, company } = token ? await verifyDomainToken(token) : { result: "invalid" as const };
  // AI vetting starts once the domain is proved, so unverified claims cost nothing.
  if (company) vetCompanySoon(company.id, company.domain);
  const url = new URL(COMPANY_PATH, request.url);
  url.searchParams.set("verify", result);
  return NextResponse.redirect(url);
}
