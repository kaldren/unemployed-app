"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PASSWORD_MIN } from "@/lib/password";
import {
  requestPasswordReset,
  signInWithPassword,
  signUpWithPassword,
  type PasswordAuthState,
} from "./actions";

type Mode = "signin" | "signup" | "reset";

const IDLE: PasswordAuthState = { status: "idle" };

const COPY = {
  signin: { submit: "Sign in", pending: "Signing in…" },
  signup: { submit: "Create account", pending: "Creating account…" },
  reset: { submit: "Email me a reset link", pending: "Sending…" },
} as const;

// Email + password: sign in, create an account (confirmed by email) or reset a forgotten password.
// `disabled` while the page is still reading `next` from the URL.
export function PasswordForm({ next, disabled = false }: { next?: string; disabled?: boolean }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signIn, signInAction, signingIn] = useActionState(signInWithPassword, IDLE);
  const [signUp, signUpAction, signingUp] = useActionState(signUpWithPassword, IDLE);
  const [reset, resetAction, resetting] = useActionState(requestPasswordReset, IDLE);
  const forms: Record<Mode, [PasswordAuthState, (payload: FormData) => void, boolean]> = {
    signin: [signIn, signInAction, signingIn],
    signup: [signUp, signUpAction, signingUp],
    reset: [reset, resetAction, resetting],
  };
  const [state, action, pending] = forms[mode];

  // Show "check your inbox" once per send; going back shows the form again.
  const [sent, setSent] = useState<{ mode: Mode; email: string } | null>(null);
  // Each mode keeps its own result, so switching modes only resyncs: a link sent earlier mustn't show again.
  const [last, setLast] = useState({ mode, state });
  if (last.mode !== mode || last.state !== state) {
    setLast({ mode, state });
    if (last.mode === mode && state.status === "sent") setSent({ mode, email: state.email });
  }

  function switchTo(next: Mode) {
    setMode(next);
    setSent(null);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4" aria-live="polite">
        <p className="text-base">
          {sent.mode === "signup" ? "Check your inbox to confirm " : "If there's an account for "}
          <span className="font-medium break-all">{sent.email}</span>
          {sent.mode === "signup" ? "." : ", we sent it a link to reset the password."}
        </p>
        <p className="text-sm text-muted-foreground">
          {sent.mode === "signup"
            ? "Open the link in this browser. Already have an account with this email? Sign in, or reset your password."
            : "Open the link in this browser to choose a new password."}
        </p>
        <Button type="button" variant="ghost" onClick={() => switchTo("signin")}>
          Back to sign in
        </Button>
      </div>
    );
  }

  const error = state.status === "error" && !pending ? state.message : null;
  const ready = email.trim() && (mode === "reset" || password);
  return (
    <form action={action} className="flex flex-col gap-4 text-left" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "auth-error" : undefined}
        />
      </div>
      {mode !== "reset" && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="password">Password</Label>
            {mode === "signin" && (
              <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => switchTo("reset")}>
                Forgot password?
              </Button>
            )}
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={mode === "signup" ? PASSWORD_MIN : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={mode === "signup" ? "password-hint" : undefined}
          />
          {mode === "signup" && (
            <p id="password-hint" className="text-sm text-muted-foreground">
              At least {PASSWORD_MIN} characters.
            </p>
          )}
        </div>
      )}
      {error && (
        <p id="auth-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={disabled || pending || !ready}>
        {pending ? COPY[mode].pending : COPY[mode].submit}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "signin" ? "New here? " : mode === "signup" ? "Have an account? " : "Remembered it? "}
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0"
          onClick={() => switchTo(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </Button>
      </p>
    </form>
  );
}
