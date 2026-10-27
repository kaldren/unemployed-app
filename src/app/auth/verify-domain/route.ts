import { NextResponse, type NextRequest } from "next/server";
import { verifyDomainToken } from "@/lib/employer/companies";
import { COMPANY_PATH } from "@/lib/portal";

// The link in the domain verification email. The token proves access to an address on the domain, so
// whoever opens it needn't be signed in. Then on to company settings, which say how it went.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const result = token ? await verifyDomainToken(token) : "invalid";
  const url = new URL(COMPANY_PATH, request.url);
  url.searchParams.set("verify", result);
  return NextResponse.redirect(url);
}
