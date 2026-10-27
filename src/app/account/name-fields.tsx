"use client";

import { useActionState, useState } from "react";
import { saveName } from "@/app/account/actions";
import { FieldErrors, SectionForm, TextInput } from "@/components/form";
import { Button } from "@/components/ui/button";
import type { Name } from "@/lib/name";

function NameInputs({ value, onChange }: { value: Name; onChange: (value: Name) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextInput
        label="First name"
        name="firstName"
        autoComplete="given-name"
        maxLength={50}
        value={value.firstName}
        onChange={(firstName) => onChange({ ...value, firstName })}
      />
      <TextInput
        label="Last name"
        name="lastName"
        autoComplete="family-name"
        maxLength={50}
        value={value.lastName}
        onChange={(lastName) => onChange({ ...value, lastName })}
      />
    </div>
  );
}

// The name section of settings.
export function NameSection({ initial }: { initial: Name }) {
  const [name, setName] = useState(initial);
  return (
    <SectionForm id="name" title="Your name" description="Shown to companies you match with and to teammates." action={saveName} data={name}>
      <NameInputs value={name} onChange={setName} />
    </SectionForm>
  );
}

// The first step of /welcome for accounts that signed up without a name. Saving re-renders the page.
export function NameStep({ initial }: { initial: Name }) {
  const [name, setName] = useState(initial);
  const [state, action, pending] = useActionState(saveName, { status: "idle" });
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={action} noValidate className="flex flex-col gap-5 text-left">
      <input type="hidden" name="data" value={JSON.stringify(name)} />
      <FieldErrors.Provider value={fieldErrors}>
        <NameInputs value={name} onChange={setName} />
      </FieldErrors.Provider>
      {state.status === "error" && !state.fieldErrors && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending || !name.firstName.trim() || !name.lastName.trim()}>
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
