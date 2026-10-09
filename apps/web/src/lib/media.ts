import 'server-only';
import { diskStorage, DomainError, MAX_IMAGE_BYTES, type MediaStorage } from '@worldroot/core';

const globals = globalThis as { __worldrootMedia?: MediaStorage };

/** Where uploaded images are kept: a folder on this server, set by WORLDROOT_MEDIA_DIR. */
export function mediaStorage(): MediaStorage {
  globals.__worldrootMedia ??= diskStorage();
  return globals.__worldrootMedia;
}

const tooLarge = () => {
  const message = `Use an image under ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`;
  return new DomainError('invalid_input', message, { fields: { image: message } });
};

/** Reads an uploaded image from a request body, refusing an oversized one before reading it where the browser says how big it is. */
export async function readUpload(request: Request): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length') ?? 0) > MAX_IMAGE_BYTES) throw tooLarge();
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) throw tooLarge();
  return bytes;
}
