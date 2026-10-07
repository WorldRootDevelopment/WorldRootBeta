import { Button, buttonClass } from '@worldroot/ui';
import Link from 'next/link';

interface FormFooterProps {
  error: string | null;
  pending: boolean;
  submitLabel: string;
  cancelHref: string;
}

/** The error line and the save and cancel actions shared by every edit form. */
export function FormFooter({ error, pending, submitLabel, cancelHref }: FormFooterProps) {
  return (
    <>
      {error ? (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
        <Link href={cancelHref} className={buttonClass('ghost', 'lg')}>
          Cancel
        </Link>
      </div>
    </>
  );
}
