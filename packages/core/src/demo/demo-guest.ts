import { randomBytes } from 'node:crypto';
import { communities, sessions, users, type Db } from '@worldroot/db';
import { eq, inArray } from 'drizzle-orm';
import { addMember } from '../community/access';
import { DEMO_COMMUNITY_SLUG, ensureDemoAccount } from './demo-town';
import { DND_DEMO_COMMUNITY_SLUG } from './dnd-demo';

/**
 * The shared guest account: one sign-in that anyone may use to try WorldRoot
 * without making an account of their own. Its password is published on
 * purpose, and the sign-in page offers it as a button.
 *
 * It is not the demo host. The host owns the demo communities; the guest is an
 * ordinary member of them. Because nobody can tell one person using it from
 * another, the web app lets it do very little outside the demo, and never
 * change the account itself. Those limits live with the routes that enforce
 * them, in the web app's `requireActor` and its auth route.
 */
export const DEMO_GUEST = {
  email: 'guest@worldroot.test',
  password: 'try-worldroot',
  handle: 'demo_guest',
  displayName: 'Demo Guest',
};

export const isDemoGuest = (email: string): boolean => email.trim().toLowerCase() === DEMO_GUEST.email;

/**
 * Creates the guest account if needed, puts its published password back in
 * case it was ever locked, and makes it a member of the demo communities that
 * exist. Running it again changes nothing.
 */
export async function ensureDemoGuest(db: Db): Promise<void> {
  const guest = await ensureDemoAccount(db, DEMO_GUEST, DEMO_GUEST.password, true);
  const demos = await db
    .select({ id: communities.id })
    .from(communities)
    .where(inArray(communities.slug, [DEMO_COMMUNITY_SLUG, DND_DEMO_COMMUNITY_SLUG]));
  for (const demo of demos) {
    try {
      await addMember(db, demo.id, guest.userId);
    } catch {
      // Banned from a demo community by its owners, or the community is archived. Their decision stands.
    }
  }
}

/**
 * Closes the guest account without deleting what it wrote: its password
 * becomes a random value nobody knows, and everyone using it is signed out.
 * Does nothing if it was never created.
 */
export async function lockDemoGuest(db: Db): Promise<void> {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_GUEST.email));
  if (!existing) return;
  await ensureDemoAccount(db, DEMO_GUEST, randomBytes(32).toString('base64url'), true);
  await db.delete(sessions).where(eq(sessions.userId, existing.id));
}
