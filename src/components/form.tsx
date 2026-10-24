"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox as CheckboxControl } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/candidate/schemas";
import { cleanName } from "@/lib/candidate/slug";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const FieldErrors = createContext<Record<string, string>>({});

// Lets a parent (e.g. section tabs) hear which forms have unsaved edits.
export const ReportDirty = createContext<((id: string, dirty: boolean) => void) | null>(null);

function useReportDirty(id: string, dirty: boolean) {
  const report = useContext(ReportDirty);
  useEffect(() => {
    report?.(id, dirty);
  }, [report, id, dirty]);
}

// A form section: a card with its own form that posts `data` as JSON to `action`.
export function SectionForm({
  id,
  title,
  description,
  action,
  data,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  action: Action;
  data: unknown;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const json = JSON.stringify(data);
  const [savedJson, setSavedJson] = useState(json);
  const [lastSaveAt, setLastSaveAt] = useState(0);

  // Remember what was saved, so "Saved" only shows until the next edit.
  if (state.status === "saved" && state.at !== lastSaveAt) {
    setLastSaveAt(state.at);
    setSavedJson(json);
  }
  const dirty = json !== savedJson;
  useReportDirty(id, dirty);
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <Card asChild>
      <section id={id} aria-labelledby={`${id}-title`}>
        <form action={formAction} className="flex flex-col gap-6">
          <CardHeader>
            <CardTitle asChild>
              <h2 id={`${id}-title`}>{title}</h2>
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <input type="hidden" name="data" value={json} />
          <CardContent className="flex flex-col gap-5">
            <FieldErrors.Provider value={fieldErrors}>{children}</FieldErrors.Provider>
          </CardContent>
          <CardFooter className="flex-wrap justify-end gap-3 border-t-0 bg-transparent pt-2 pb-6">
            <p aria-live="polite" className="mr-auto text-sm">
              {state.status === "saved" && !dirty && !pending && <span className="text-success">Saved</span>}
              {dirty && !pending && state.status !== "error" && (
                <span className="text-muted-foreground">Changes to save</span>
              )}
              {state.status === "error" && !pending && (
                <span role="alert" className="text-destructive">
                  {state.message}
                </span>
              )}
            </p>
            {/* Nothing to send until something changes. */}
            <Button type="submit" disabled={pending || !dirty}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </CardFooter>
        </form>
      </section>
    </Card>
  );
}

export function useFieldError(name: string): string | undefined {
  return useContext(FieldErrors)[name];
}

// The server's message for `name`, shown under its control.
export function FieldError({ name, id }: { name: string; id?: string }) {
  const error = useFieldError(name);
  return error ? (
    <p id={id} className="text-sm text-destructive">
      {error}
    </p>
  ) : null;
}

export function updateAt<T>(items: T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, i) => (i === index ? { ...item, ...patch } : item));
}

export function Field({
  label,
  name,
  hint,
  children,
}: {
  label: string;
  name: string;
  hint?: ReactNode;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const error = useFieldError(name);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error ? (
        <FieldError name={name} id={`${id}-error`} />
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function TextInput({
  label,
  name,
  hint,
  value,
  onChange,
  ...props
}: {
  label: string;
  name: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "name">) {
  return (
    <Field label={label} name={name} hint={hint}>
      {(a11y) => (
        <Input {...a11y} {...props} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

export function TextArea({
  label,
  name,
  hint,
  value,
  onChange,
  ...props
}: {
  label: string;
  name: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "name">) {
  return (
    <Field label={label} name={name} hint={hint}>
      {(a11y) => (
        <Textarea {...a11y} {...props} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

export function Select({
  label,
  name,
  hint,
  value,
  onChange,
  options,
  placeholder = "Select…",
  ...props
}: {
  label: string;
  name: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: Options;
  placeholder?: string | null;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "name" | "size">) {
  return (
    <Field label={label} name={name} hint={hint}>
      {(a11y) => (
        <NativeSelect {...a11y} {...props} value={value} onChange={(e) => onChange(e.target.value)}>
          <SelectOptions options={options} placeholder={placeholder} />
        </NativeSelect>
      )}
    </Field>
  );
}

type Options = Record<string, string> | [string, string][];

// Options for a NativeSelect, with an empty first option unless `placeholder` is null.
export function SelectOptions({ options, placeholder }: { options: Options; placeholder: string | null }) {
  const entries = Array.isArray(options) ? options : Object.entries(options);
  return (
    <>
      {placeholder !== null && <NativeSelectOption value="">{placeholder}</NativeSelectOption>}
      {entries.map(([key, text]) => (
        <NativeSelectOption key={key} value={key}>
          {text}
        </NativeSelectOption>
      ))}
    </>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <CheckboxControl id={id} checked={checked} onCheckedChange={(on) => onChange(on === true)} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );
}

export function CheckboxGroup<K extends string>({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: Record<K, string>;
  value: K[];
  onChange: (value: K[]) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {(Object.entries(options) as [K, string][]).map(([key, text]) => (
          <Checkbox
            key={key}
            label={text}
            checked={value.includes(key)}
            onChange={(on) => onChange(on ? [...value, key] : value.filter((v) => v !== key))}
          />
        ))}
      </div>
      <FieldError name={name} />
    </fieldset>
  );
}

// Free-text tags with suggestions from a catalog. Enter or comma adds the typed value.
export function TagInput({
  label,
  name,
  hint,
  value,
  onChange,
  suggestions = [],
  max,
  placeholder,
}: {
  label: string;
  name: string;
  hint?: ReactNode;
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: string[];
  max?: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const listId = useId();
  const full = max !== undefined && value.length >= max;

  function add(raw: string) {
    const tag = cleanName(raw);
    if (!tag || full || value.some((v) => v.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
    setDraft("");
  }

  return (
    <Field label={label} name={name} hint={hint}>
      {(a11y) => (
        <div className="flex flex-col gap-2">
          {value.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label={`Selected ${label.toLowerCase()}`}>
              {value.map((tag) => (
                <Badge asChild key={tag} variant="secondary" className="h-8 gap-1 pr-1 pl-3 text-sm font-normal">
                  <li>
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onChange(value.filter((v) => v !== tag))}
                      aria-label={`Remove ${tag}`}
                      className="text-muted-foreground hover:bg-accent"
                    >
                      ×
                    </Button>
                  </li>
                </Badge>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Input
              {...a11y}
              list={listId}
              value={draft}
              disabled={full}
              placeholder={full ? `Up to ${max}` : placeholder}
              onChange={(e) => {
                // Picking a datalist option replaces the text in one go; add it right away.
                const next = e.target.value;
                const { inputType } = e.nativeEvent as InputEvent;
                const picked = !inputType || inputType === "insertReplacementText";
                if (picked && suggestions.includes(next)) {
                  add(next);
                } else {
                  setDraft(next);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  add(draft);
                }
              }}
            />
            <Button type="button" variant="outline" onClick={() => add(draft)} disabled={!draft.trim() || full}>
              Add
            </Button>
          </div>
          <datalist id={listId}>
            {suggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      )}
    </Field>
  );
}

// Repeating entries (jobs, schools…) with add and remove.
export function ListEditor<T>({
  items,
  onChange,
  empty,
  addLabel,
  newItem,
  max,
  renderItem,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  empty: ReactNode;
  addLabel: string;
  newItem: () => T;
  max: number;
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 && <p className="text-sm text-muted-foreground">{empty}</p>}
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-xl border p-4">
          {renderItem(item, (patch) => onChange(updateAt(items, i, patch)), i)}
          <Button
            type="button"
            variant="link"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="h-auto self-start px-0 text-destructive"
          >
            Remove
          </Button>
        </div>
      ))}
      {items.length < max && (
        <Button type="button" variant="outline" onClick={() => onChange([...items, newItem()])} className="self-start">
          {addLabel}
        </Button>
      )}
    </div>
  );
}
