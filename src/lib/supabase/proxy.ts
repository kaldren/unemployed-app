import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/env";
import { HOME_PATH, LOGIN_PATH, type Portal } from "@/lib/portal";

const LOGIN_PATHS: string[] = Object.values(LOGIN_PATH);

// Paths a signed-out visitor may open, with everything under them. Everything else requires a session.
// Cron routes check their own secret.
const PUBLIC_PATHS = [...LOGIN_PATHS, "/auth", "/privacy", "/terms", "/api/cron"];
// The home page is the landing page for visitors; it's public by itself, not with what's under it.
const PUBLIC_PAGES = ["/"];

const isUnder = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);
const isPublic = (pathname: string) =>
  PUBLIC_PAGES.includes(pathname) || PUBLIC_PATHS.some((path) => isUnder(pathname, path));
const portalOf = (pathname: string): Portal => (isUnder(pathname, HOME_PATH.employer) ? "employer" : "candidate");

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

  if (!signedIn && !isPublic(pathname)) {
    const url = new URL(LOGIN_PATH[portalOf(pathname)], request.url);
    url.searchParams.set("next", pathname + search);
    return redirectWithCookies(url, response);
  }

  if (signedIn && LOGIN_PATHS.includes(pathname)) {
    return redirectWithCookies(new URL(HOME_PATH[portalOf(pathname)], request.url), response);
  }

  return response;
}

// Keeps any refreshed session cookies on the redirect.
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
