'use client';

import type { ApiError } from '@worldroot/contracts';
import { Button, buttonClass } from '@worldroot/ui';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { Picture } from '@/features/shell/picture';
import { ImageCropper } from './image-cropper';

interface ImageUploadProps {
  /** The API address that takes the image with PUT and removes it with DELETE. */
  url: string;
  /** The image in place now, if any. */
  mediaId: string | null;
  /** Whose picture this is, for the placeholder letter. */
  name: string;
  /** What to call it: "Profile picture", "Portrait". */
  label: string;
  /** Shows "Remove" without an upload control, for staff acting on someone else's picture. */
  removeOnly?: boolean;
  /** A round picture, or a wide banner. */
  shape?: 'round' | 'banner';
}

/** A still picture is cut and shrunk here first, so the original may be much larger than what is sent. */
const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;

/** Shows a picture with controls to upload a new one or remove it. The change is saved at once. */
export function ImageUpload({ url, mediaId, name, label, removeOnly = false, shape = 'round' }: ImageUploadProps) {
  const router = useRouter();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** A still picture waiting to be adjusted before it is sent. */
  const [adjusting, setAdjusting] = useState<File | null>(null);

  const request = async (init: RequestInit) => {
    setPending(true);
    setError(null);
    const response = await fetch(url, init).catch(() => null);
    setPending(false);
    if (input.current) input.current.value = '';
    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as ApiError | null;
      return setError(body?.error.message ?? 'Could not save the image. Check your connection and try again.');
    }
    router.refresh();
  };

  const upload = (body: Blob) => request({ method: 'PUT', headers: { 'content-type': 'application/octet-stream' }, body });

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    // Animated pictures are switched off here for now. The server refuses them too.
    if (file.type === 'image/gif') {
      event.target.value = '';
      return setError('Animated GIFs cannot be used here for now. Use a PNG, JPEG or WebP image.');
    }
    event.target.value = '';
    if (file.size > MAX_ORIGINAL_BYTES) return setError('Use an image under 25 MB.');
    setAdjusting(file);
  };

  return (
    <div className="flex flex-wrap items-center gap-5">
      {shape === 'round' ? (
        <Picture mediaId={mediaId} name={name} className="size-20 text-3xl" />
      ) : mediaId ? (
        <img src={`/api/v1/media/${mediaId}`} alt="" className="h-20 w-56 rounded-xl bg-surface-sunken object-cover" />
      ) : (
        <span aria-hidden="true" className="h-20 w-56 rounded-xl bg-linear-to-br from-accent-soft to-accent" />
      )}
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-sm font-medium text-ink">{label}</p>
        <div className="flex flex-wrap items-center gap-2">
          {removeOnly ? null : (
            <>
              <label htmlFor={inputId} className={`${buttonClass('secondary')} cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus`}>
                {pending ? 'Saving…' : mediaId ? 'Change' : 'Upload'}
                <input ref={input} id={inputId} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={choose} disabled={pending} />
              </label>
            </>
          )}
          {mediaId ? (
            <Button variant="ghost" onClick={() => void request({ method: 'DELETE' })} disabled={pending}>
              Remove
            </Button>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : removeOnly ? null : (
          <p className="text-sm text-ink-muted">
            PNG, JPEG or WebP. You can move and zoom the picture before it is saved. Location and camera details are removed.
          </p>
        )}
      </div>
      {adjusting ? (
        <ImageCropper
          file={adjusting}
          shape={shape}
          label={label}
          onCancel={() => setAdjusting(null)}
          onDone={(image) => {
            setAdjusting(null);
            void upload(image);
          }}
        />
      ) : null}
    </div>
  );
}
