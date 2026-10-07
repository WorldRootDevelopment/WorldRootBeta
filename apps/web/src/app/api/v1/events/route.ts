import { canAccessScene } from '@worldroot/core';
import { errorResponse } from '@/lib/api';
import { sceneTopic, subscribe, type LiveMessage } from '@/lib/live';
import { database } from '@/lib/server';
import { getViewer } from '@/lib/session';

export const dynamic = 'force-dynamic';

const HEARTBEAT_MS = 25_000;

/**
 * The live event stream (server-sent events). `?scene=<id>` follows one scene.
 * Nothing depends on this stream being reliable: a browser that reconnects
 * simply re-fetches the scene.
 */
export async function GET(request: Request) {
  try {
    const sceneId = new URL(request.url).searchParams.get('scene');
    const viewer = await getViewer();
    if (!viewer) return new Response(null, { status: 401 });
    const { db } = await database();
    if (!sceneId || !(await canAccessScene(db, viewer.actor, sceneId))) return new Response(null, { status: 404 });

    const encoder = new TextEncoder();
    let close = () => {};

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const write = (chunk: string) => {
          try {
            controller.enqueue(encoder.encode(chunk));
          } catch {
            close();
          }
        };
        const unsubscribe = subscribe(sceneTopic(sceneId), (message: LiveMessage) => {
          write(`event: ${message.type}\ndata: ${JSON.stringify(message)}\n\n`);
        });
        // Comment lines keep proxies from closing an idle connection.
        const heartbeat = setInterval(() => write(': keep-alive\n\n'), HEARTBEAT_MS);
        close = () => {
          clearInterval(heartbeat);
          unsubscribe();
          try {
            controller.close();
          } catch {
            // Already closed.
          }
        };
        request.signal.addEventListener('abort', close);
        write('retry: 3000\n: connected\n\n');
      },
      cancel() {
        close();
      },
    });

    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
