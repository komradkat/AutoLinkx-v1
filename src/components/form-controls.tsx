'use client';

/**
 * Shared form primitives (part of B-02, built alongside A-06's screens).
 *
 * Every control carries a visible label, ties its error to the input with
 * `aria-describedby`, and marks invalid state with `aria-invalid` rather than
 * colour alone. Submit buttons report pending state in text, not just a spinner.
 */
import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';

import type { ActionResult, FieldErrors } from '@/contracts';

export function fieldErrorsOf(result: ActionResult<unknown> | null): FieldErrors {
  if (!result || result.ok) return {};
  return result.error.fieldErrors ?? {};
}

interface FieldProps {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel';
  errors?: readonly string[];
  hint?: string;
  optional?: boolean;
  defaultValue?: string;
  autoComplete?: string;
  maxLength?: number;
}

export function Field({
  name,
  label,
  type = 'text',
  errors,
  hint,
  optional = false,
  defaultValue,
  autoComplete,
  maxLength,
}: FieldProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const invalid = Boolean(errors?.length);
  const describedBy = [hint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="field">
      <label className="field__label" htmlFor={name}>
        {label}
        {optional && <span className="field__optional"> (optional)</span>}
      </label>
      {hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      <input
        className="field__control"
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy || undefined}
      />
      {invalid && (
        <p className="field__error" id={errorId}>
          {errors?.join(' ')}
        </p>
      )}
    </div>
  );
}

export function Checkbox({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  const hintId = `${name}-hint`;
  return (
    <div className="checkbox">
      <input
        id={name}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        aria-describedby={hint ? hintId : undefined}
      />
      <div>
        <label className="field__label" htmlFor={name}>
          {label}
        </label>
        {hint && (
          <p className="field__hint" id={hintId}>
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

export function SubmitButton({ children, pendingLabel }: { children: ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="button button--primary" type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function Notice({
  tone,
  title,
  children,
}: {
  tone: 'error' | 'success' | 'info';
  title: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`notice notice--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <p className="notice__title">{title}</p>
      {children}
    </div>
  );
}

/**
 * Error summary above a form. Repeats the per-field messages so a screen
 * reader announces the failure without hunting through the form.
 */
export function FormErrors({ result }: { result: ActionResult<unknown> | null }) {
  if (!result || result.ok) return null;

  const fieldErrors = result.error.fieldErrors ?? {};
  const entries = Object.entries(fieldErrors);

  return (
    <Notice tone="error" title={result.error.message}>
      {entries.length > 0 && (
        <ul>
          {entries.map(([field, messages]) => (
            <li key={field}>
              <a href={`#${field}`}>{messages.join(' ')}</a>
            </li>
          ))}
        </ul>
      )}
      {result.error.retryAfterSeconds !== null && (
        <p style={{ marginBottom: 0 }}>
          Try again in about {Math.ceil(result.error.retryAfterSeconds / 60)} minute(s).
        </p>
      )}
    </Notice>
  );
}
