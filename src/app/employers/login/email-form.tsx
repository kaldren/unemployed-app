"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMagicLink, type MagicLinkState } from "./actions";

const IDLE: MagicLinkState = { status: "idle" };

// `disabled` while the page is still reading `next` from the URL.
export function EmailForm({ next, disabled = false }: { next?: string; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState(sendMagicLink, IDLE);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Show "check your inbox" once per send; "Use a different email" goes back to the form.
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.status === "sent") setSentTo(state.email);
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4" aria-live="polite">
        <p className="text-base">
          We sent a sign-in link to <span className="font-medium break-all">{sentTo}</span>.
        </p>
        <p className="text-sm text-muted-foreground">Open it in this browser to continue.</p>
        <Button type="button" variant="ghost" onClick={() => setSentTo(null)}>
          Use a different email
        </Button>
      </div>
    );
  }

  const error = state.status === "error" && !pending ? state.message : null;
  return (
    <form action={formAction} className="flex flex-col gap-4 text-left">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "email-error" : undefined}
        />
        {error && (
          <p id="email-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" disabled={disabled || pending || !email.trim()}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
