"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { FieldErrors, keepValuesOnReset, SectionForm, Select, SelectOptions, TextArea, TextInput } from "@/components/form";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { ActionState } from "@/lib/candidate/schemas";
import { ASSIGNABLE_ROLES, COMPANY_DESCRIPTION_MAX, COMPANY_NAME_MAX, URL_MAX, type AssignableRole } from "@/lib/employer/limits";
import { changeRoleAction, deleteCompanyAction, inviteAction, sendVerificationAction, updateCompanyAction } from "./actions";

const IDLE: ActionState = { status: "idle" };

type Profile = { name: string; website: string; logoUrl: string; description: string };

export function CompanyProfileForm({ initial }: { initial: Profile }) {
  const [values, setValues] = useState(initial);
  const set = (key: keyof Profile) => (value: string) => setValues((v) => ({ ...v, [key]: value }));
  return (
    <SectionForm id="profile" title="Company profile" description="Candidates see this with your jobs." action={updateCompanyAction} data={values}>
      <TextInput label="Company name" name="name" value={values.name} onChange={set("name")} maxLength={COMPANY_NAME_MAX} />
      <TextInput label="Website" name="website" type="url" value={values.website} onChange={set("website")} placeholder="https://acme.com" maxLength={URL_MAX} />
      <TextInput label="Logo link" name="logoUrl" type="url" value={values.logoUrl} onChange={set("logoUrl")} placeholder="https://acme.com/logo.png" maxLength={URL_MAX} />
      <TextArea label="About the company" name="description" value={values.description} onChange={set("description")} maxLength={COMPANY_DESCRIPTION_MAX} rows={4} />
    </SectionForm>
  );
}

// Sends a one-time link to an address on the company's domain; opening it verifies the company.
export function VerifyDomainForm({ domain, suggestedEmail }: { domain: string; suggestedEmail: string }) {
  const [state, action, pending] = useActionState(sendVerificationAction, IDLE);
  const [email, setEmail] = useState(suggestedEmail);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.status === "saved") setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-start gap-2" aria-live="polite">
        <p className="text-sm">
          We sent a link to <span className="font-medium break-all">{sentTo}</span>. Open it to verify {domain}.
        </p>
        <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => setSentTo(null)}>
          Use a different address
        </Button>
      </div>
    );
  }

  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={action} onResetCapture={keepValuesOnReset} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="data" value={JSON.stringify({ email })} />
      <FieldErrors.Provider value={fieldErrors}>
        <TextInput
          label={`Email on ${domain}`}
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          placeholder={`you@${domain}`}
        />
      </FieldErrors.Provider>
      {state.status === "error" && !pending && !fieldErrors.email && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <Button type="submit" className="self-start" disabled={pending || !email.trim()}>
        {pending ? "Sending…" : "Send verification link"}
      </Button>
    </form>
  );
}

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteAction, IDLE);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("recruiter");
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.status === "saved") setEmail("");
  }
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} onResetCapture={keepValuesOnReset} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="data" value={JSON.stringify({ email, role })} />
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <FieldErrors.Provider value={fieldErrors}>
          <TextInput label="Invite by email" name="email" type="email" value={email} onChange={setEmail} placeholder="teammate@company.com" />
          <Select label="Role" name="role" value={role} onChange={(value) => setRole(value as AssignableRole)} options={ASSIGNABLE_ROLES} placeholder={null} />
        </FieldErrors.Provider>
      </div>
      <p aria-live="polite" className="text-sm">
        {state.status === "saved" && !pending && <span className="text-success">Invite sent</span>}
        {state.status === "error" && !pending && !fieldErrors.email && (
          <span role="alert" className="text-destructive">
            {state.message}
          </span>
        )}
      </p>
      <Button type="submit" variant="outline" className="self-start" disabled={pending || !email.trim()}>
        {pending ? "Inviting…" : "Send invite"}
      </Button>
    </form>
  );
}

// Saves as soon as a new role is picked.
export function RoleSelect({ profileId, role, label }: { profileId: string; role: AssignableRole; label: string }) {
  return (
    <form action={changeRoleAction} onResetCapture={keepValuesOnReset}>
      <input type="hidden" name="profileId" value={profileId} />
      <NativeSelect
        name="role"
        size="sm"
        aria-label={label}
        defaultValue={role}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <SelectOptions options={ASSIGNABLE_ROLES} placeholder={null} />
      </NativeSelect>
    </form>
  );
}

export function DeleteCompany({ name }: { name: string }) {
  return (
    <form
      action={deleteCompanyAction}
      onSubmit={(event) => {
        if (!confirm(`Delete ${name}, its jobs and its team? This can't be undone.`)) event.preventDefault();
      }}
      className="flex flex-col items-start gap-1.5"
    >
      <p className="text-sm text-muted-foreground">Deletes the company profile, every job and every match. Your teammates keep their accounts.</p>
      <DeleteButton />
    </form>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="link" className="h-auto px-0 text-destructive" disabled={pending}>
      {pending ? "Deleting…" : "Delete company"}
    </Button>
  );
}
