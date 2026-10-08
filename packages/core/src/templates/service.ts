import type { Db } from '@worldroot/db';
import type { Actor } from '../platform/authorize';
import { DomainError } from '../platform/errors';
import { createLocation, createWorld, type World } from '../worlds/service';
import { findTemplate, type TemplateLocation } from './catalog';

/**
 * Creates a world in the actor's library from a template, with all of its
 * locations. The result is an ordinary library world: theirs to rename,
 * change, share, or add to a community.
 */
export async function createWorldFromTemplate(db: Db, actor: Actor, templateId: string): Promise<World> {
  const template = findTemplate(templateId);
  if (!template) throw new DomainError('not_found', 'That template does not exist.');

  return db.transaction(async (tx) => {
    const world = await createWorld(tx, actor, { name: template.name, summary: template.summary, description: template.description });
    const add = async (locations: TemplateLocation[], parentId: string | null) => {
      for (const [position, location] of locations.entries()) {
        const created = await createLocation(tx, actor, world.id, { name: location.name, summary: location.summary, parentId, position });
        if (location.children) await add(location.children, created.id);
      }
    };
    await add(template.locations, null);
    return world;
  });
}
