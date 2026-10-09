import type { CharacterInput, WorldInput } from '@worldroot/contracts';
import { users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { EMPTY_DOC } from '@worldroot/editor';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addCharacterToCommunity, createCharacter, updateCharacter } from '../characters/service';
import { createCommunity } from '../community/service';
import { createProfile } from '../identity/profile';
import { copyWorldToCommunity, createWorld, updateWorld } from '../worlds/service';
import type { Actor } from './authorize';
import { renderRichField } from './rich-fields';

let connection: DbConnection;
let thea: Actor;

const formatted = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Early years' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Born ' }, { type: 'text', text: 'at sea', marks: [{ type: 'bold' }] }, { type: 'text', text: '.' }] },
  ],
};
// The forms send documents where the typed input says text.
const asCharacter = (input: Record<string, unknown>) => input as unknown as CharacterInput;
const asWorld = (input: Record<string, unknown>) => input as unknown as WorldInput;

beforeAll(async () => {
  connection = await createTestDb();
  const [user] = await connection.db.insert(users).values({ name: 'thea', email: 'thea@example.com' }).returning();
  thea = { userId: user!.id, platformRole: 'user' };
  await createProfile(connection.db, thea, { handle: 'thea', displayName: 'Thea', adultConfirmed: true });
});

afterAll(async () => {
  await connection.close();
});

describe('formatted fields', () => {
  it('keep a document beside its plain text, on characters and their community copies', async () => {
    const { db } = connection;
    const character = await createCharacter(db, thea, asCharacter({ name: 'Captain', biography: formatted, appearance: 'Tall.', personality: EMPTY_DOC }));
    expect(character.biography).toBe('Early years\n\nBorn at sea.');
    expect(renderRichField(character.docs, 'biography')).toBe('<h2>Early years</h2><p>Born <strong>at sea</strong>.</p>');
    // Plain text has no document, and an empty editor is an empty field.
    expect(character.appearance).toBe('Tall.');
    expect(renderRichField(character.docs, 'appearance')).toBeNull();
    expect(character.personality).toBeNull();
    expect(Object.keys(character.docs)).toEqual(['biography']);

    const community = await createCommunity(db, thea, { slug: 'valley', name: 'Valley' });
    const copy = await addCharacterToCommunity(db, thea, character.id, community.id);
    expect(renderRichField(copy.docs, 'biography')).toContain('<strong>at sea</strong>');

    // Saving plain text over a formatted field drops the old document rather than leaving it to disagree.
    const plain = await updateCharacter(db, thea, character.id, asCharacter({ name: 'Captain', biography: 'Rewritten.' }));
    expect(plain.biography).toBe('Rewritten.');
    expect(plain.docs).toEqual({});
    // The copy is its own record.
    expect(renderRichField(copy.docs, 'biography')).not.toBeNull();
  });

  it('refuse anything outside the allowlist, and never render what they did not check', async () => {
    const { db } = connection;
    const script = { type: 'doc', content: [{ type: 'script', content: [{ type: 'text', text: 'alert(1)' }] }] };
    await expect(createCharacter(db, thea, asCharacter({ name: 'Bad', biography: script }))).rejects.toMatchObject({
      code: 'invalid_input',
      fields: { biography: 'That formatting is not supported.' },
    });
    const long = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x'.repeat(20_001) }] }] };
    await expect(createCharacter(db, thea, asCharacter({ name: 'Long', biography: long }))).rejects.toMatchObject({ code: 'invalid_input' });

    // Text is escaped, and an unsafe link loses its address but keeps its words.
    const tricky = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '<img src=x onerror=alert(1)>', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }],
    };
    const character = await createCharacter(db, thea, asCharacter({ name: 'Tricky', biography: tricky }));
    const html = renderRichField(character.docs, 'biography')!;
    expect(html).not.toContain('<img');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('&lt;img');

    // A stored value that is not a valid document is ignored, not rendered.
    expect(renderRichField({ biography: script }, 'biography')).toBeNull();
    expect(renderRichField(null, 'biography')).toBeNull();
    // A document sent for a field that does not take formatting is not accepted as one.
    await expect(createCharacter(db, thea, asCharacter({ name: 'Sneaky', tagline: formatted }))).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('work for a world description and travel with a copy of the world', async () => {
    const { db } = connection;
    const world = await createWorld(db, thea, asWorld({ name: 'Harbour', description: formatted }));
    expect(world.description).toBe('Early years\n\nBorn at sea.');
    expect(renderRichField(world.docs, 'description')).toContain('<h2>Early years</h2>');

    const community = await createCommunity(db, thea, { slug: 'harbour', name: 'Harbour' });
    const copy = await copyWorldToCommunity(db, thea, world.id, community.id);
    expect(renderRichField(copy.docs, 'description')).toContain('<h2>Early years</h2>');

    const updated = await updateWorld(db, thea, world.id, asWorld({ name: 'Harbour', description: EMPTY_DOC }));
    expect(updated.description).toBeNull();
    expect(updated.docs).toEqual({});
  });
});
