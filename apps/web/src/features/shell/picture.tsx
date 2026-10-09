import { cn } from '@worldroot/ui';

interface PictureProps {
  /** The uploaded image's id, or null to show the first letter of the name instead. */
  mediaId: string | null | undefined;
  name: string;
  /** Size and text size, such as `size-12 text-lg`. */
  className?: string;
}

/** A round picture of a person or a character. Decorative: the name is always written beside it. */
export function Picture({ mediaId, name, className = 'size-12 text-lg' }: PictureProps) {
  if (mediaId) {
    return (
      // A plain img: these are small, already-sized uploads served by our own route, which the image optimizer cannot fetch without the session.
      <img src={`/api/v1/media/${mediaId}`} alt="" loading="lazy" decoding="async" className={cn('shrink-0 rounded-full bg-surface-sunken object-cover', className)} />
    );
  }
  return (
    <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-display font-semibold text-accent-text', className)}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
