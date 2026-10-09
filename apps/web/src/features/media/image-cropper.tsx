'use client';

import { Button } from '@worldroot/ui';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import { createPortal } from 'react-dom';

export type CropShape = 'round' | 'banner';

/** What each shape is cut to: the frame's proportions, and the most pixels worth keeping. */
const SHAPES: Record<CropShape, { aspect: number; width: number; frame: number }> = {
  round: { aspect: 1, width: 512, frame: 288 },
  banner: { aspect: 4, width: 1600, frame: 520 },
};

const MAX_ZOOM = 4;

interface ImageCropperProps {
  file: File;
  shape: CropShape;
  /** What is being set, for the heading: "Profile Picture", "Banner". */
  label: string;
  onCancel: () => void;
  /** Receives the cut picture, ready to upload. */
  onDone: (image: Blob) => void;
}

/**
 * Lets someone choose which part of a picture to keep before it is uploaded:
 * drag to move it, zoom with the slider, the mouse wheel or the plus and minus
 * keys. The cutting is done here in the browser, so only the part they chose
 * is ever sent, and a large photo becomes a small upload.
 */
export function ImageCropper({ file, shape, label, onCancel, onDone }: ImageCropperProps) {
  const { aspect, width: targetWidth, frame: maxFrame } = SHAPES[shape];
  const dialog = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const [source, setSource] = useState<{ url: string; width: number; height: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [frameWidth, setFrameWidth] = useState(maxFrame);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const frameHeight = frameWidth / aspect;

  // Read the chosen file into a picture the browser can draw.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const element = new Image();
    element.onload = () => {
      image.current = element;
      setSource({ url, width: element.naturalWidth, height: element.naturalHeight });
    };
    element.onerror = () => setFailed(true);
    element.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // The frame shrinks to fit a narrow screen.
  useEffect(() => {
    const fit = () => setFrameWidth(Math.min(maxFrame, window.innerWidth - 64));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [maxFrame]);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  // At zoom 1 the picture just covers the frame; it can never be moved so far that the frame shows a gap.
  const cover = source ? Math.max(frameWidth / source.width, frameHeight / source.height) : 1;
  const scale = cover * zoom;
  const clamp = useCallback(
    (next: { x: number; y: number }, atZoom: number) => {
      if (!source) return next;
      const limitX = Math.max(0, (source.width * cover * atZoom - frameWidth) / 2);
      const limitY = Math.max(0, (source.height * cover * atZoom - frameHeight) / 2);
      return { x: Math.min(limitX, Math.max(-limitX, next.x)), y: Math.min(limitY, Math.max(-limitY, next.y)) };
    },
    [source, cover, frameWidth, frameHeight],
  );
  const zoomTo = (next: number) => {
    const value = Math.min(MAX_ZOOM, Math.max(1, next));
    setZoom(value);
    setOffset((current) => clamp(current, value));
  };

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: offset.x, y: offset.y, startX: event.clientX, startY: event.clientY };
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const from = drag.current;
    if (!from) return;
    setOffset(clamp({ x: from.x + event.clientX - from.startX, y: from.y + event.clientY - from.startY }, zoom));
  };
  const pointerUp = () => {
    drag.current = null;
  };
  const wheel = (event: WheelEvent<HTMLDivElement>) => zoomTo(zoom - event.deltaY * 0.002);

  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      // Only this dialog closes, not a pop-up it may be sitting on.
      event.stopPropagation();
      return onCancel();
    }
    const step = event.shiftKey ? 40 : 10;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const move = moves[event.key];
    // Arrow keys move the picture only while the frame has focus, so they still work the zoom slider.
    if (move && (event.target as HTMLElement).hasAttribute('data-crop-frame')) {
      event.preventDefault();
      setOffset((current) => clamp({ x: current.x + move[0], y: current.y + move[1] }, zoom));
    } else if (event.key === '+' || event.key === '=') zoomTo(zoom + 0.1);
    else if (event.key === '-') zoomTo(zoom - 0.1);
  };

  const save = () => {
    const picture = image.current;
    if (!picture || !source) return;
    setSaving(true);
    // The part of the original picture inside the frame.
    const cutWidth = frameWidth / scale;
    const cutHeight = frameHeight / scale;
    const cutX = source.width / 2 - offset.x / scale - cutWidth / 2;
    const cutY = source.height / 2 - offset.y / scale - cutHeight / 2;
    // Never made larger than the pixels that are there.
    const outWidth = Math.max(1, Math.round(Math.min(targetWidth, cutWidth)));
    const outHeight = Math.max(1, Math.round(outWidth / aspect));
    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const context = canvas.getContext('2d');
    if (!context) return setFailed(true);
    context.imageSmoothingQuality = 'high';
    context.drawImage(picture, cutX, cutY, cutWidth, cutHeight, 0, 0, outWidth, outHeight);
    // WebP keeps transparency and is small. A browser that cannot write it gives PNG instead, which is also accepted.
    canvas.toBlob((blob) => (blob ? onDone(blob) : setFailed(true)), 'image/webp', 0.9);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <div aria-hidden="true" onClick={onCancel} className="fixed inset-0 bg-black/55 backdrop-blur-sm" />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`Adjust ${label}`}
        tabIndex={-1}
        onKeyDown={keyDown}
        className="wr-popover relative my-auto flex max-w-full flex-col gap-4 rounded-3xl p-5 outline-none"
      >
        <h2 className="font-display text-xl font-semibold text-ink">Adjust {label}</h2>

        {failed ? (
          <p role="alert" className="max-w-sm text-sm text-danger">
            That picture could not be opened. Try a PNG, JPEG or WebP image.
          </p>
        ) : (
          <>
            <div
              tabIndex={0}
              role="group"
              aria-label="Drag to move the picture. Arrow keys also move it; plus and minus zoom."
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerUp}
              onWheel={wheel}
              data-crop-frame
              className={`relative mx-auto cursor-grab touch-none select-none overflow-hidden bg-surface-sunken outline-none ring-2 ring-line-strong focus-visible:ring-4 focus-visible:ring-focus active:cursor-grabbing ${shape === 'round' ? 'rounded-full' : 'rounded-2xl'}`}
              style={{ width: frameWidth, height: frameHeight }}
            >
              {source ? (
                <img
                  src={source.url}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute max-w-none"
                  style={{
                    width: source.width * scale,
                    height: source.height * scale,
                    left: frameWidth / 2 - (source.width * scale) / 2 + offset.x,
                    top: frameHeight / 2 - (source.height * scale) / 2 + offset.y,
                  }}
                />
              ) : null}
            </div>

            <label className="flex items-center gap-3 text-sm text-ink">
              <span className="shrink-0 font-medium">Zoom</span>
              <input
                type="range"
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(event) => zoomTo(Number(event.target.value))}
                className="min-w-0 flex-1 cursor-pointer accent-accent"
              />
            </label>
            <p className="text-sm text-ink-muted">Drag the picture to move it.</p>
          </>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          {failed ? null : (
            <Button onClick={save} disabled={!source || saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
