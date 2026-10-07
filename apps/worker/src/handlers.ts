import type { EventHandlers } from '@worldroot/core';

/**
 * Outbox consumers, keyed by event type. Notifications, search indexing,
 * activity stats and realtime fan-out attach here as their modules are built.
 */
export const handlers: EventHandlers = {
  'user.onboarded': [
    async (event) => {
      console.log(`[worker] user.onboarded ${event.payload.userId}`);
    },
  ],
};
