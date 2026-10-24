import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/env";

// Paths a signed-out visitor may open. Everything else requires a session.
const PUBLIC_PATHS = ["/login", "/auth"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

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
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return redirectWithCookies(url, response);
  }

  if (signedIn && pathname === "/login") {
    return redirectWithCookies(new URL("/", request.url), response);
  }

  return response;
}

// Keeps any refreshed session cookies on the redirect.
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
