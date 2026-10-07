import { connect, type DbConnection } from './client';

/** A fresh, migrated, in-memory database for one test file. */
export async function createTestDb(): Promise<DbConnection> {
  const connection = connect('pglite://memory');
  await connection.migrate();
  return connection;
}
