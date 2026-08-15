import type { ReactNode } from "react";

/** Shared styling for the form controls, so every input looks the same. */
export const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm " +
  "placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300 " +
  "aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-200";

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/**
 * Label + hint + control + error message. `error` is wired to the control's
 * `aria-describedby` by the caller passing the same id (`${htmlFor}-error`).
 */
export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A titled group of related fields within the form. */
export function FieldSet({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <legend className="px-1 text-sm font-semibold tracking-wide text-slate-900 uppercase">
        {title}
      </legend>
      {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      {children}
    </fieldset>
  );
}
