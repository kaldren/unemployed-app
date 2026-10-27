"use client";

import { useActionState, useState } from "react";
import { FieldErrors, keepValuesOnReset, TextArea, TextInput } from "@/components/form";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/candidate/schemas";
import { COMPANY_DESCRIPTION_MAX, COMPANY_NAME_MAX, URL_MAX } from "@/lib/employer/limits";
import { createCompanyAction } from "../actions";

const IDLE: ActionState = { status: "idle" };

// `domain` starts as the employer's own email domain when it's a work address.
export function NewCompanyForm({ domain: initialDomain }: { domain: string }) {
  const [state, action, pending] = useActionState(createCompanyAction, IDLE);
  const [values, setValues] = useState({ name: "", domain: initialDomain, website: "", logoUrl: "", description: "" });
  const set = (key: keyof typeof values) => (value: string) => setValues((v) => ({ ...v, [key]: value }));
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} onResetCapture={keepValuesOnReset} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="data" value={JSON.stringify(values)} />
      <FieldErrors.Provider value={fieldErrors}>
        <TextInput label="Company name" name="name" value={values.name} onChange={set("name")} maxLength={COMPANY_NAME_MAX} autoComplete="organization" required />
        <TextInput
          label="Domain"
          name="domain"
          value={values.domain}
          onChange={set("domain")}
          placeholder="acme.com"
          hint="You'll verify it with an email address on this domain before publishing jobs."
          autoCapitalize="none"
          required
        />
        <TextInput label="Website" name="website" type="url" value={values.website} onChange={set("website")} placeholder="https://acme.com" maxLength={URL_MAX} />
        <TextInput label="Logo link" name="logoUrl" type="url" value={values.logoUrl} onChange={set("logoUrl")} placeholder="https://acme.com/logo.png" maxLength={URL_MAX} hint="Optional. A square image works best." />
        <TextArea label="About the company" name="description" value={values.description} onChange={set("description")} maxLength={COMPANY_DESCRIPTION_MAX} rows={4} />
      </FieldErrors.Provider>
      {state.status === "error" && !pending && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending || !values.name.trim() || !values.domain.trim()}>
        {pending ? "Creating…" : "Create company"}
      </Button>
    </form>
  );
}
