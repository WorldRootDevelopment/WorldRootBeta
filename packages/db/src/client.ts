import { mkdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import pg from 'pg';
import { defaultPgliteDir, migrationsFolder } from './paths';
import * as schema from './schema';

export type Schema = typeof schema;

/** A database handle or an open transaction. Services accept either. */
export type Db = PgDatabase<PgQueryResultHKT, Schema>;

export interface DbConnection {
  db: Db;
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}

/**
 * Opens the database named by `url`.
 * - `postgres://…`      a PostgreSQL server
 * - `pglite://memory`   an in-process, in-memory database (tests)
 * - `pglite://<dir>`    an in-process database persisted to a directory
 * - undefined           the persisted in-process database at .data/pglite (local development)
 */
export function connect(url: string | undefined = process.env.DATABASE_URL): DbConnection {
  if (url && /^postgres(ql)?:\/\//.test(url)) {
    const pool = new pg.Pool({ connectionString: url });
    const db = drizzlePg(pool, { schema });
    return {
      db: db as unknown as Db,
      migrate: () => migratePg(db, { migrationsFolder: migrationsFolder() }),
      close: () => pool.end(),
    };
  }

  if (!url && process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production');
  }

  const target = url ? url.replace(/^pglite:\/\//, '') : defaultPgliteDir();
  const inMemory = target === 'memory';
  if (!inMemory) mkdirSync(target, { recursive: true });
  const client = inMemory ? new PGlite() : new PGlite(target);
  const db = drizzlePglite(client, { schema });
  return {
    db: db as unknown as Db,
    migrate: () => migratePglite(db, { migrationsFolder: migrationsFolder() }),
    close: () => client.close(),
  };
}
