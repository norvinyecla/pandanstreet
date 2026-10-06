import type { InputHTMLAttributes } from 'react';

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint?: string;
}

/** Labelled text input shared by the login and sign-up forms. */
export function AuthField({ id, label, hint, ...inputProps }: AuthFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-base-content/80">
        {label}
      </label>
      <input
        id={id}
        name={id}
        aria-describedby={hintId}
        className="input min-h-11 w-full text-base"
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="text-xs text-base-content/70">
          {hint}
        </p>
      )}
    </div>
  );
}
