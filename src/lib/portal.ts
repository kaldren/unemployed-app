import type { AppView } from "@/db/schema";

// One sign-in page for everyone. Each user has two views (finding a job, hiring); `profiles.default_view`
// picks the one they land on, and the nav switches between them.
export const LOGIN_PATH = "/login";
export const WELCOME_PATH = "/welcome";
export const PASSWORD_PATH = "/account/password";
export const HOME_PATH = { candidate: "/", employer: "/employers" } as const satisfies Record<AppView, string>;
export const NEW_COMPANY_PATH = "/employers/company/new";
export const COMPANY_PATH = "/employers/company";
export const MATCHES_PATH = { candidate: "/matches", employer: "/employers/matches" } as const satisfies Record<
  AppView,
  string
>;

// Only allow same-origin relative paths, so `next` can't become an open redirect.
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}

export function parseView(value: unknown): AppView | null {
  return value === "candidate" || value === "employer" ? value : null;
}

// Error codes the sign-in page understands, passed as `?error=`.
export const AUTH_ERRORS = {
  cancelled: "Sign-in was cancelled. Try again when you're ready.",
  failed: "Something went wrong while signing you in. Please try again.",
  session: "Your session has ended. Please sign in again.",
} as const;

export type AuthError = keyof typeof AUTH_ERRORS;

// Unknown codes fall back to the generic message. Own keys only, so "constructor" isn't a known code.
export function authErrorMessage(code: unknown): string | null {
  if (typeof code !== "string") return null;
  return Object.hasOwn(AUTH_ERRORS, code) ? AUTH_ERRORS[code as AuthError] : AUTH_ERRORS.failed;
}
