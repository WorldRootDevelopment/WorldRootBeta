'use client';

import type { ApiError } from '@worldroot/contracts';
import { ImagePlus, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { shrinkImage } from '@/features/media/shrink-image';

const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;

/** A character's pictures, for anyone who can see the character. Each opens at full size in a new tab. */
export function CharacterGallery({ name, images }: { name: string; images: string[] }) {
  if (images.length === 0) return null;
  return (
    <ul className={`grid gap-3 ${images.length === 1 ? 'max-w-md' : 'grid-cols-2 sm:grid-cols-3'}`}>
      {images.map((id, index) => (
        <li key={id}>
          <a
            href={`/api/v1/media/${id}`}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-2xl bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {/* A plain img: served by our own route, which the image optimizer cannot fetch without the session. */}
            <img
              src={`/api/v1/media/${id}`}
              alt={`Picture ${index + 1} of ${images.length} of ${name}. Opens at full size.`}
              loading="lazy"
              decoding="async"
              className={images.length === 1 ? 'max-h-[28rem] w-full object-contain' : 'aspect-square w-full object-cover'}
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

interface GalleryEditorProps {
  characterId: string;
  name: string;
  images: string[];
  /** How many pictures this character may hold. */
  limit: number;
  /** Whether more would be allowed with Heartwood, so the note can say so. */
  canGrow: boolean;
}

/** On the edit page: add pictures to a character's gallery, or take them out. Each change is saved at once. */
export function GalleryEditor({ characterId, name, images, limit, canGrow }: GalleryEditorProps) {
  const router = useRouter();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = images.length >= limit;

  const fail = async (response: Response | null, fallback: string) => {
    const body = (await response?.json().catch(() => null)) as ApiError | null;
    setError(body?.error.message ?? fallback);
  };

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])].slice(0, limit - images.length);
    if (input.current) input.current.value = '';
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    for (const file of files) {
      if (file.type === 'image/gif') {
        setError('Animated GIFs cannot be used here for now. Use a PNG, JPEG or WebP image.');
        continue;
      }
      if (file.size > MAX_ORIGINAL_BYTES) {
        setError('Use an image under 25 MB.');
        continue;
      }
      try {
        const body = await shrinkImage(file);
        const response = await fetch(`/api/v1/characters/${characterId}/images`, { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body }).catch(() => null);
        if (!response?.ok) {
          await fail(response, 'Could not add that picture. Check your connection and try again.');
          break;
        }
      } catch {
        setError('That picture could not be opened. Try a PNG, JPEG or WebP image.');
      }
    }
    setBusy(false);
    router.refresh();
  };

  const remove = async (id: string) => {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/v1/characters/${characterId}/images/${id}`, { method: 'DELETE' }).catch(() => null);
    setBusy(false);
    if (!response?.ok) return fail(response, 'Could not remove that picture. Check your connection and try again.');
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-ink">
        Gallery <span className="font-normal text-ink-muted">· {images.length} Of {limit}</span>
      </p>
      {images.length > 0 ? (
        <ul className="flex flex-wrap gap-3">
          {images.map((id, index) => (
            <li key={id} className="relative">
              <img src={`/api/v1/media/${id}`} alt={`Picture ${index + 1} of ${images.length} of ${name}`} className="size-24 rounded-xl bg-surface-sunken object-cover" />
              <button
                type="button"
                onClick={() => remove(id)}
                disabled={busy}
                className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full bg-surface-raised text-ink shadow-raised hover:bg-surface-sunken disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">Remove Picture {index + 1}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={inputId}
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface-raised px-3 text-sm font-medium text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus ${busy || full ? 'opacity-50' : 'cursor-pointer hover:bg-surface-sunken'}`}
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          {busy ? 'Saving…' : 'Add Picture'}
          <input ref={input} id={inputId} type="file" multiple accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={choose} disabled={busy || full} />
        </label>
        <p className="text-sm text-ink-muted">
          {full ? 'The gallery is full. ' : 'Reference art, outfits, anything that shows who they are. No NSFW artwork. PNG, JPEG or WebP. '}
          {canGrow ? (
            <>
              WorldRoot Heartwood, which is coming soon, allows 10.{' '}
              <Link href="/store" className="font-medium text-accent-text underline">
                See The Store
              </Link>
            </>
          ) : null}
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
