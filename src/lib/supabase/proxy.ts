import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/env";
import { LOGIN_PATH, safeNextPath } from "@/lib/portal";

// Employers used to sign in here; old links (invite emails) forward to the one sign-in page.
const OLD_EMPLOYER_LOGIN = "/employers/login";

// Paths a signed-out visitor may open, with everything under them. Everything else requires a session.
// Cron routes check their own secret.
const PUBLIC_PATHS = [LOGIN_PATH, "/auth", "/privacy", "/terms", "/api/cron"];
// The home page is the landing page for visitors; it's public by itself, not with what's under it.
const PUBLIC_PAGES = ["/"];

const isUnder = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);
const isPublic = (pathname: string) =>
  PUBLIC_PAGES.includes(pathname) || PUBLIC_PATHS.some((path) => isUnder(pathname, path));

// Refreshes the Supabase session cookie and does optimistic auth redirects.
// Pages still verify the user themselves (see src/lib/auth.ts).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = supabaseEnv();

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Don't run code between createServerClient and getClaims: it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;

  if (pathname === OLD_EMPLOYER_LOGIN) {
    return redirectWithCookies(new URL(LOGIN_PATH + search, request.url), response);
  }

  if (!signedIn && !isPublic(pathname)) {
    const url = new URL(LOGIN_PATH, request.url);
    url.searchParams.set("next", pathname + search);
    return redirectWithCookies(url, response);
  }

  if (signedIn && pathname === LOGIN_PATH) {
    // Already signed in: open `next` (e.g. an invite email's link), never the sign-in page itself.
    const next = new URL(safeNextPath(request.nextUrl.searchParams.get("next")), request.url);
    const isLogin = next.pathname === LOGIN_PATH || next.pathname === OLD_EMPLOYER_LOGIN;
    return redirectWithCookies(isLogin ? new URL("/", request.url) : next, response);
  }

  return response;
}

// Keeps any refreshed session cookies on the redirect.
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
