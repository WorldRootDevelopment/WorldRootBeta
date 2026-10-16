import type { ChannelInput } from '@worldroot/contracts';
import { deleteChannel, moveChannel, updateChannel } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Change a channel, or move it one place up or down with `{ move: 'up' | 'down' }`. */
export const PATCH = route<{ channelId: string }>(async ({ request, actor, params }) => {
  const input = await readJson(request);
  const { db } = await database();
  if (input.move === 'up' || input.move === 'down') {
    await moveChannel(db, actor, params.channelId, input.move);
    return new Response(null, { status: 204 });
  }
  const channel = await updateChannel(db, actor, params.channelId, input as unknown as ChannelInput);
  return Response.json({ channel: { id: channel.id, name: channel.name } });
});

/** Delete a channel and every message in it. */
export const DELETE = route<{ channelId: string }>(async ({ actor, params }) => {
  const { db } = await database();
  await deleteChannel(db, actor, params.channelId);
  return new Response(null, { status: 204 });
});
