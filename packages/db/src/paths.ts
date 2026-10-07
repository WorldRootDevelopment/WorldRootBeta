import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Walks up from the working directory to the folder holding pnpm-workspace.yaml. */
export function findRepoRoot(from: string = process.cwd()): string {
  let dir = from;
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`Could not find the repository root above ${from}`);
    dir = parent;
  }
}

export const migrationsFolder = () => join(findRepoRoot(), 'packages', 'db', 'migrations');

export const defaultPgliteDir = () => join(findRepoRoot(), '.data', 'pglite');
