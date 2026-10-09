import { DomainError } from '../platform/errors';

/** The largest upload accepted, in bytes. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
/** The longest side accepted, in pixels, where the format lets it be read cheaply. */
export const MAX_IMAGE_SIDE = 4_096;

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

export interface CheckedImage {
  contentType: ImageType;
  /** The image with its metadata removed. */
  bytes: Uint8Array;
}

const refuse = (message: string) => new DomainError('invalid_input', message, { fields: { image: message } });
const notAnImage = () => refuse('Upload a PNG, JPEG, GIF or WebP image.');
const damaged = () => refuse('That image could not be read. Try saving it again.');

const ascii = (bytes: Uint8Array, at: number, length: number) => String.fromCharCode(...bytes.subarray(at, at + length));
const startsWith = (bytes: Uint8Array, signature: number[]) => signature.every((byte, index) => bytes[index] === byte);

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

function checkSize(width: number, height: number): void {
  if (width < 1 || height < 1) throw damaged();
  if (width > MAX_IMAGE_SIDE || height > MAX_IMAGE_SIDE) {
    throw refuse(`Use an image at most ${MAX_IMAGE_SIDE.toLocaleString('en')} pixels on its longest side.`);
  }
}

// Text and Exif chunks can hold a camera's location, an author's name or editing software's notes.
const PNG_PRIVATE = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

function cleanPng(bytes: Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  let at = 8;
  let first = true;
  let ended = false;
  while (at + 12 <= bytes.length) {
    const length = view.getUint32(at);
    const type = ascii(bytes, at + 4, 4);
    const end = at + 12 + length;
    if (end > bytes.length) throw damaged();
    if (first) {
      if (type !== 'IHDR' || length < 8) throw damaged();
      checkSize(view.getUint32(at + 8), view.getUint32(at + 12));
      first = false;
    }
    if (!PNG_PRIVATE.has(type)) parts.push(bytes.subarray(at, end));
    at = end;
    if (type === 'IEND') {
      ended = true;
      break;
    }
  }
  // Anything after the end of the image is dropped.
  if (first || !ended) throw damaged();
  return concat(parts);
}

function cleanJpeg(bytes: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let at = 2;
  let sized = false;
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) throw damaged();
    const marker = bytes[at + 1]!;
    // Padding before a marker.
    if (marker === 0xff) {
      at += 1;
      continue;
    }
    const length = (bytes[at + 2]! << 8) | bytes[at + 3]!;
    const end = at + 2 + length;
    if (length < 2 || end > bytes.length) throw damaged();
    // Start of frame: the picture's size.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (length < 7) throw damaged();
      checkSize((bytes[at + 7]! << 8) | bytes[at + 8]!, (bytes[at + 5]! << 8) | bytes[at + 6]!);
      sized = true;
    }
    // APP1 holds Exif and XMP, APP13 holds Photoshop and IPTC data, COM is a free-text comment.
    const personal = marker === 0xe1 || marker === 0xed || marker === 0xfe;
    if (!personal) parts.push(bytes.subarray(at, end));
    at = end;
    // Start of scan: the picture itself runs from here to the end of the file.
    if (marker === 0xda) {
      if (!sized) throw damaged();
      parts.push(bytes.subarray(at));
      return concat(parts);
    }
  }
  throw damaged();
}

function cleanWebp(bytes: Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts: Uint8Array[] = [];
  let at = 12;
  let sawImage = false;
  while (at + 8 <= bytes.length) {
    const type = ascii(bytes, at, 4);
    const length = view.getUint32(at + 4, true);
    // Chunks are padded to an even length.
    const end = at + 8 + length + (length % 2);
    if (at + 8 + length > bytes.length) throw damaged();
    if (type === 'VP8X') {
      if (length < 10) throw damaged();
      const chunk = bytes.slice(at, Math.min(end, bytes.length));
      // Clear the "has Exif" and "has XMP" flags to match what is removed below.
      chunk[8] = chunk[8]! & ~0x0c;
      const width = 1 + (chunk[12]! | (chunk[13]! << 8) | (chunk[14]! << 16));
      const height = 1 + (chunk[15]! | (chunk[16]! << 8) | (chunk[17]! << 16));
      checkSize(width, height);
      parts.push(chunk);
    } else if (type !== 'EXIF' && type !== 'XMP ') {
      if (type === 'VP8 ' || type === 'VP8L' || type === 'ANMF') sawImage = true;
      parts.push(bytes.subarray(at, Math.min(end, bytes.length)));
    }
    at = end;
  }
  if (!sawImage) throw damaged();
  const body = concat(parts);
  const header = new Uint8Array(12);
  header.set(bytes.subarray(0, 4), 0);
  new DataView(header.buffer).setUint32(4, body.length + 4, true);
  header.set(bytes.subarray(8, 12), 8);
  return concat([header, body]);
}

function checkGif(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 13) throw damaged();
  checkSize(bytes[6]! | (bytes[7]! << 8), bytes[8]! | (bytes[9]! << 8));
  return bytes;
}

/**
 * Decides what an upload really is from its first bytes, never from its name
 * or the type the browser claimed, and removes metadata that could identify
 * the person who made it. Anything that is not one of the four image formats
 * is refused; SVG is refused because it can carry scripts.
 */
export function checkImage(input: Uint8Array): CheckedImage {
  if (input.length === 0) throw refuse('Choose an image to upload.');
  if (input.length > MAX_IMAGE_BYTES) throw refuse(`Use an image under ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);

  if (startsWith(input, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { contentType: 'image/png', bytes: cleanPng(input) };
  if (startsWith(input, [0xff, 0xd8, 0xff])) return { contentType: 'image/jpeg', bytes: cleanJpeg(input) };
  if (input.length >= 6 && (ascii(input, 0, 6) === 'GIF87a' || ascii(input, 0, 6) === 'GIF89a')) return { contentType: 'image/gif', bytes: checkGif(input) };
  if (input.length >= 12 && ascii(input, 0, 4) === 'RIFF' && ascii(input, 8, 4) === 'WEBP') return { contentType: 'image/webp', bytes: cleanWebp(input) };
  throw notAnImage();
}
