import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Every test file starts its own in-memory PostgreSQL and runs all the migrations.
    // With many files starting at once that can take longer than the default ten seconds.
    hookTimeout: 120_000,
    testTimeout: 60_000,
  },
});
