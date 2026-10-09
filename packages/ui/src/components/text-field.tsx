import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../cn';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
}

/** A labeled input with an optional hint and an error announced to screen readers. */
export function TextField({ label, hint, error, className, id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-medium capitalize text-ink">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(hint ? hintId : undefined, error ? errorId : undefined) || undefined}
        className={cn(
          'min-h-11 rounded-lg border bg-surface-raised px-3 text-base text-ink placeholder:text-ink-muted',
          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus',
          error ? 'border-danger' : 'border-line-strong',
        )}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
