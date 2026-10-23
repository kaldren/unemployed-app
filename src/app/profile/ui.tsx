"use client";

import {
  createContext,
  useActionState,
  useContext,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import type { ActionState } from "@/lib/candidate/schemas";
import { useReportDirty } from "./section-tabs";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const FieldErrors = createContext<Record<string, string>>({});

export const inputClass =
  "h-10 w-full rounded-lg border border-black/[.12] bg-white px-3 text-sm text-zinc-950 outline-none transition-colors focus:border-zinc-950 aria-invalid:border-red-600 dark:border-white/[.18] dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50";

export const secondaryButton =
  "h-9 rounded-full border border-black/[.12] px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-white/[.18] dark:text-zinc-50 dark:hover:bg-zinc-900";

const primaryButton =
  "h-10 rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200";

// A profile section: a card with its own form that posts `data` as JSON to `action`.
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
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/[.04] dark:bg-zinc-950 dark:ring-white/[.08]"
    >
      <form action={formAction}>
        <div className="flex flex-col gap-1 border-b border-black/[.06] px-6 py-5 dark:border-white/[.08]">
          <h2 id={`${id}-title`} className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {title}
          </h2>
          {description && <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>}
        </div>
        <input type="hidden" name="data" value={json} />
        <div className="flex flex-col gap-5 px-6 py-6">
          <FieldErrors.Provider value={fieldErrors}>{children}</FieldErrors.Provider>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-black/[.06] bg-zinc-50/60 px-6 py-4 dark:border-white/[.08] dark:bg-zinc-900/40">
          <p aria-live="polite" className="mr-auto text-sm">
            {state.status === "saved" && !dirty && !pending && (
              <span className="text-green-700 dark:text-green-400">Saved</span>
            )}
            {dirty && !pending && state.status !== "error" && (
              <span className="text-zinc-500 dark:text-zinc-400">Changes to save</span>
            )}
            {state.status === "error" && !pending && (
              <span role="alert" className="text-red-700 dark:text-red-400">
                {state.message}
              </span>
            )}
          </p>
          <button type="submit" disabled={pending} className={primaryButton}>
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function useFieldError(name: string): string | undefined {
  return useContext(FieldErrors)[name];
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
      <label htmlFor={id} className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {label}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-zinc-500 dark:text-zinc-400">
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
        <input
          {...a11y}
          {...props}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
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
        <textarea
          {...a11y}
          {...props}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} h-auto min-h-28 py-2`}
        />
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
  options: Record<string, string> | [string, string][];
  placeholder?: string | null;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "name">) {
  const entries = Array.isArray(options) ? options : Object.entries(options);
  return (
    <Field label={label} name={name} hint={hint}>
      {(a11y) => (
        <select {...a11y} {...props} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          {placeholder !== null && <option value="">{placeholder}</option>}
          {entries.map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
        </select>
      )}
    </Field>
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
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-900 dark:text-zinc-100">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-zinc-950 dark:accent-zinc-50"
      />
      {label}
    </label>
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
  const error = useFieldError(name);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</legend>
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
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
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
    const tag = raw.trim().replace(/\s+/g, " ");
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
                <li
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-zinc-100 py-1 pl-3 pr-1 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((v) => v !== tag))}
                    aria-label={`Remove ${tag}`}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
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
              className={inputClass}
            />
            <button type="button" onClick={() => add(draft)} disabled={!draft.trim() || full} className={secondaryButton}>
              Add
            </button>
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
      {items.length === 0 && <p className="text-sm text-zinc-600 dark:text-zinc-400">{empty}</p>}
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-xl border border-black/[.08] p-4 dark:border-white/[.12]">
          {renderItem(item, (patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it))), i)}
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="self-start text-sm font-medium text-red-700 hover:underline dark:text-red-400"
          >
            Remove
          </button>
        </div>
      ))}
      {items.length < max && (
        <button type="button" onClick={() => onChange([...items, newItem()])} className={`${secondaryButton} self-start`}>
          {addLabel}
        </button>
      )}
    </div>
  );
}
