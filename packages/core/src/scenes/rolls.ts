import { characters, communities, profiles, sceneCharacters, type Db } from '@worldroot/db';
import type { RichDoc } from '@worldroot/editor';
import { and, eq } from 'drizzle-orm';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { diceWorking, rollDice, type DiceResult } from './dice';
import { getSceneForPosting, insertSystemPost, type ScenePost } from './service';

export interface RollInput {
  notation: unknown;
  /** One of the actor's characters in the scene. Without one, the roll is made in the writer's own name. */
  characterId?: unknown;
  /** What the roll is for: "to pick the lock". */
  reason?: unknown;
}

const MAX_REASON = 120;

/**
 * Rolls dice in a scene and records the result as a system post in the story,
 * where everyone can see it and nobody can edit it. Only in a community that
 * has switched DnD mode on. The numbers are made on the server.
 */
export async function rollInScene(
  db: Db,
  actor: Actor,
  sceneId: string,
  input: RollInput,
  roll?: (sides: number) => number,
): Promise<{ post: ScenePost; result: DiceResult }> {
  const scene = await getSceneForPosting(db, actor, sceneId);
  const [home] = scene.communityId ? await db.select({ dndMode: communities.dndMode }).from(communities).where(eq(communities.id, scene.communityId)) : [];
  if (!home?.dndMode) throw new DomainError('forbidden', 'Dice are not switched on here.');

  const reason = typeof input.reason === 'string' ? input.reason.replace(/\s+/g, ' ').trim() : '';
  if (reason.length > MAX_REASON) {
    const message = `Use at most ${MAX_REASON} characters.`;
    throw new DomainError('invalid_input', message, { fields: { reason: message } });
  }

  let character: { id: string; name: string } | null = null;
  if (typeof input.characterId === 'string' && input.characterId) {
    const [row] = await db
      .select({ id: characters.id, name: characters.name })
      .from(sceneCharacters)
      .innerJoin(characters, eq(characters.id, sceneCharacters.characterId))
      .where(and(eq(sceneCharacters.sceneId, sceneId), eq(sceneCharacters.characterId, input.characterId), eq(characters.playerUserId, actor.userId)));
    if (!row) {
      const message = 'Roll as one of your characters in this scene, or as yourself.';
      throw new DomainError('invalid_input', message, { fields: { characterId: message } });
    }
    character = row;
  }
  const [writer] = await db.select({ displayName: profiles.displayName }).from(profiles).where(eq(profiles.userId, actor.userId));

  const result = rollDice(input.notation, roll);
  const working = diceWorking(result);
  const doc: RichDoc = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: `${character?.name ?? writer?.displayName ?? 'Someone'} rolled ${result.notation}${reason ? ` ${reason}` : ''}: ${working ? `${working} = ` : ''}` },
          { type: 'text', text: String(result.total), marks: [{ type: 'bold' }] },
        ],
      },
    ],
  };
  const post = await db.transaction((tx) => insertSystemPost(tx, sceneId, { authorUserId: actor.userId, characterId: character?.id ?? null, characterName: character?.name ?? null, doc }));
  return { post, result };
}
