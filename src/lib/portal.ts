// Candidates and employers sign in on separate pages. The page decides a new user's profile type.
export type Portal = "candidate" | "employer";

export const LOGIN_PATH = { candidate: "/login", employer: "/employers/login" } as const;
export const HOME_PATH = { candidate: "/", employer: "/employers" } as const;
export const MATCHES_PATH = { candidate: "/matches", employer: "/employers/matches" } as const;

export function parsePortal(value: string | null | undefined): Portal {
  return value === "employer" ? "employer" : "candidate";
}

// Error codes the sign-in pages understand, passed as `?error=`.
export const AUTH_ERRORS = {
  cancelled: "Sign-in was cancelled. Try again when you're ready.",
  failed: "Something went wrong while signing you in. Please try again.",
  session: "Your session has ended. Please sign in again.",
  personal_email: "Use your work email. Personal addresses like Gmail can't sign in as a company.",
  candidate_account: "This email already has a candidate account. Use a different work email.",
} as const;

export type AuthError = keyof typeof AUTH_ERRORS;

// Unknown codes fall back to the generic message. Own keys only, so "constructor" isn't a known code.
export function authErrorMessage(code: unknown): string | null {
  if (typeof code !== "string") return null;
  return Object.hasOwn(AUTH_ERRORS, code) ? AUTH_ERRORS[code as AuthError] : AUTH_ERRORS.failed;
}
