import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '../cn';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
}

/** A labeled multi-line field. Set in the story typeface, since what goes here is prose. */
export function TextArea({ label, hint, error, className, id, rows = 5, ...props }: TextAreaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(hint ? hintId : undefined, error ? errorId : undefined) || undefined}
        className={cn(
          'min-h-28 resize-y rounded-lg border bg-surface-raised px-3 py-2.5 font-serif text-[1.0625rem] leading-relaxed text-ink',
          'placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus',
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
