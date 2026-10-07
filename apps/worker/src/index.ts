import { connect, processOutbox } from '@worldroot/core';
import { handlers } from './handlers';

const IDLE_DELAY_MS = 1000;

// The embedded development database is single-process, so the worker needs a real server.
if (!process.env.DATABASE_URL?.startsWith('postgres')) {
  console.error('[worker] Set DATABASE_URL to a postgres:// URL. The embedded database cannot be shared with the web process.');
  process.exit(1);
}

const connection = connect();
let running = true;

const stop = () => {
  running = false;
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

console.log('[worker] started');

while (running) {
  try {
    const result = await processOutbox(connection.db, handlers);
    if (result.failed > 0) console.warn(`[worker] ${result.failed} event(s) failed and will be retried`);
    // A full pass means more may be waiting; an empty one means rest.
    if (result.processed === 0) await new Promise((resolve) => setTimeout(resolve, IDLE_DELAY_MS));
  } catch (error) {
    console.error('[worker] outbox pass failed', error);
    await new Promise((resolve) => setTimeout(resolve, IDLE_DELAY_MS));
  }
}

await connection.close();
console.log('[worker] stopped');
