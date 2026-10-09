import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { findRepoRoot } from '@worldroot/db';

/**
 * Where uploaded bytes are kept. Everything that stores or serves an image
 * goes through this, so moving from a folder on disk to object storage means
 * writing one more implementation and nothing else.
 */
export interface MediaStorage {
  put(id: string, bytes: Uint8Array): Promise<void>;
  get(id: string): Promise<Uint8Array | null>;
  remove(id: string): Promise<void>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Files in one folder, named by media id. Suits a single server; several servers need shared storage. */
export function diskStorage(directory: string = process.env.WORLDROOT_MEDIA_DIR || join(findRepoRoot(), '.data', 'media')): MediaStorage {
  // Ids come from the database, but a file path is never built from anything that is not plainly an id.
  const path = (id: string) => {
    if (!UUID.test(id)) throw new Error(`Not a media id: ${id}`);
    return join(directory, id);
  };
  return {
    async put(id, bytes) {
      await mkdir(directory, { recursive: true });
      await writeFile(path(id), bytes);
    },
    async get(id) {
      if (!UUID.test(id)) return null;
      return readFile(path(id)).then(
        (file) => new Uint8Array(file),
        () => null,
      );
    },
    async remove(id) {
      await rm(path(id), { force: true });
    },
  };
}

/** Storage that forgets everything when the process ends. For tests. */
export function memoryStorage(): MediaStorage & { size: () => number } {
  const held = new Map<string, Uint8Array>();
  return {
    put: async (id, bytes) => void held.set(id, bytes),
    get: async (id) => held.get(id) ?? null,
    remove: async (id) => void held.delete(id),
    size: () => held.size,
  };
}
