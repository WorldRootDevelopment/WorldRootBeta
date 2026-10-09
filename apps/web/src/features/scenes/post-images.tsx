'use client';

import type { ApiError } from '@worldroot/contracts';
import { ImagePlus, X } from 'lucide-react';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { shrinkImage } from '@/features/media/shrink-image';

/** The most pictures one post can carry. Matches MAX_POST_IMAGES on the server, which has the final say. */
const MAX_IMAGES = 4;
const MAX_GIF_BYTES = 5 * 1024 * 1024;
const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;

/** The pictures under a story post. Each opens at full size in a new tab. */
export function PostImages({ images }: { images: string[] }) {
  if (images.length === 0) return null;
  return (
    <ul className={`mt-4 grid max-w-[68ch] gap-2 ${images.length === 1 ? '' : 'grid-cols-2'}`}>
      {images.map((id) => (
        <li key={id}>
          <a
            href={`/api/v1/media/${id}`}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-xl bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {/* A plain img: served by our own route, which the image optimizer cannot fetch without the session. */}
            <img
              src={`/api/v1/media/${id}`}
              alt="Picture attached to this post. Opens at full size."
              loading="lazy"
              decoding="async"
              className={images.length === 1 ? 'max-h-[32rem] w-auto max-w-full' : 'aspect-square w-full object-cover'}
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

interface ImagePickerProps {
  sceneId: string;
  /** The ids of the pictures waiting to go out with the post. */
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
}

/**
 * In the composer: add pictures to the post being written. Each is made
 * smaller in the browser and uploaded straight away, then shown as a
 * thumbnail until the post is sent.
 */
export function ImagePicker({ sceneId, images, onChange, disabled = false }: ImagePickerProps) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = images.length >= MAX_IMAGES;

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    if (input.current) input.current.value = '';
    if (files.length === 0) return;
    setError(null);
    setBusy(true);
    let next = images;
    for (const file of files) {
      if (next.length >= MAX_IMAGES) {
        setError(`A post can carry at most ${MAX_IMAGES} images.`);
        break;
      }
      if (file.type === 'image/gif' ? file.size > MAX_GIF_BYTES : file.size > MAX_ORIGINAL_BYTES) {
        setError(file.type === 'image/gif' ? 'Use a GIF under 5 MB.' : 'Use an image under 25 MB.');
        continue;
      }
      try {
        const body = await shrinkImage(file);
        const response = await fetch(`/api/v1/scenes/${sceneId}/images`, { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body });
        const result = (await response.json().catch(() => null)) as ({ media?: { id: string } } & Partial<ApiError>) | null;
        if (!response.ok || !result?.media) {
          setError(result?.error?.message ?? 'Could not add that image. Check your connection and try again.');
          continue;
        }
        next = [...next, result.media.id];
        onChange(next);
      } catch {
        setError('That picture could not be opened. Try a PNG, JPEG, WebP or GIF image.');
      }
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {images.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {images.map((id, index) => (
            <li key={id} className="relative">
              <img src={`/api/v1/media/${id}`} alt={`Image ${index + 1} Of ${images.length}`} className="size-20 rounded-xl bg-surface-sunken object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((other) => other !== id))}
                disabled={disabled}
                className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-surface-raised text-ink shadow-raised hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">Take Out Image {index + 1}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={inputId}
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface-raised px-3 text-sm font-medium text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus ${busy || full || disabled ? 'opacity-50' : 'cursor-pointer hover:bg-surface-sunken'}`}
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          {busy ? 'Adding…' : 'Add Image'}
          <input
            ref={input}
            id={inputId}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="sr-only"
            onChange={choose}
            disabled={busy || full || disabled}
          />
        </label>
        <p className="text-xs text-ink-muted">Up to {MAX_IMAGES} per post. PNG, JPEG, WebP or GIF.</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
