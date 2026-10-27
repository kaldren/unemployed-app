"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/candidate/schemas";
import { PASSWORD_MIN } from "@/lib/password";
import { updatePassword } from "./actions";

const IDLE: ActionState = { status: "idle" };

export function PasswordUpdateForm() {
  const [state, action, pending] = useActionState(updatePassword, IDLE);
  const [password, setPassword] = useState("");
  const error = state.status === "error" && !pending ? state.message : null;

  return (
    <form action={action} className="flex flex-col gap-4 text-left" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="text-sm text-muted-foreground">
          At least {PASSWORD_MIN} characters.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" disabled={pending || !password}>
        {pending ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
