import 'server-only';

/**
 * Live updates inside the web process. A route that changes a scene publishes
 * a small message here, and every open event stream for that scene forwards it
 * to its browser. Messages carry ids only; the browser re-fetches what changed,
 * so access is checked again at that point.
 *
 * This reaches only browsers connected to this process. Running more than one
 * web process needs Postgres notifications behind the same two functions.
 */
export interface LiveMessage {
  type: 'scene.post.created' | 'scene.post.updated' | 'scene.updated';
  sceneId: string;
  seq?: number;
}

type Listener = (message: LiveMessage) => void;

// Held on globalThis so development hot reloads keep one set of listeners.
const globals = globalThis as { __worldrootLive?: Map<string, Set<Listener>> };
const topics = (globals.__worldrootLive ??= new Map());

export const sceneTopic = (sceneId: string) => `scene:${sceneId}`;

export function publish(message: LiveMessage): void {
  for (const listener of topics.get(sceneTopic(message.sceneId)) ?? []) {
    try {
      listener(message);
    } catch {
      // One broken connection must not stop delivery to the others.
    }
  }
}

/** Returns a function that removes the listener. */
export function subscribe(topic: string, listener: Listener): () => void {
  const listeners = topics.get(topic) ?? new Set();
  topics.set(topic, listeners);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) topics.delete(topic);
  };
}
