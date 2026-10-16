import type { ChannelInput } from '@worldroot/contracts';
import { createChannel } from '@worldroot/core';
import { readJson, route } from '@/lib/api';
import { database } from '@/lib/server';

/** Add a chat channel to a community. */
export const POST = route<{ communityId: string }>(async ({ request, actor, params }) => {
  const input = (await readJson(request)) as unknown as ChannelInput;
  const { db } = await database();
  const channel = await createChannel(db, actor, params.communityId, input);
  return Response.json({ channel: { id: channel.id, name: channel.name } }, { status: 201 });
});
