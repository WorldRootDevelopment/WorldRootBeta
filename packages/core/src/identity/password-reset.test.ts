import { users, type DbConnection } from '@worldroot/db';
import { createTestDb } from '@worldroot/db/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { EmailMessage } from '../platform/email';
import { createAuth } from './auth';

let connection: DbConnection;
const sent: EmailMessage[] = [];
let auth: ReturnType<typeof createAuth>;

beforeAll(async () => {
  connection = await createTestDb();
  auth = createAuth({ db: connection.db, secret: 'test-secret-test-secret-test-secret-test', baseURL: 'http://localhost:3000', sendEmail: async (message) => void sent.push(message) });
});

afterAll(async () => {
  await connection.close();
});

const linkIn = (message: EmailMessage) => new URL(message.text.match(/https?:\/\/\S+/)![0]);

describe('email', () => {
  it('confirms an address from the link in the email', async () => {
    await auth.api.signUpEmail({ body: { email: 'writer@example.com', password: 'first-password-1', name: 'writer', callbackURL: '/settings/account?verified=1' } });
    const confirm = sent.find((message) => message.to === 'writer@example.com' && /Confirm/.test(message.subject));
    expect(confirm).toBeDefined();
    const url = linkIn(confirm!);
    await auth.api.verifyEmail({ query: { token: url.searchParams.get('token')! } });
    const [user] = await connection.db.select().from(users).where(eq(users.email, 'writer@example.com'));
    expect(user!.emailVerified).toBe(true);
  });

  it('resets a forgotten password with the emailed link, once', async () => {
    await auth.api.requestPasswordReset({ body: { email: 'writer@example.com', redirectTo: '/reset-password' } });
    const reset = sent.find((message) => /Reset/.test(message.subject));
    expect(reset?.to).toBe('writer@example.com');
    // The emailed link goes through the auth server, which hands the token on to the reset page.
    const token = linkIn(reset!).pathname.split('/').pop()!;
    await auth.api.resetPassword({ body: { newPassword: 'second-password-2', token } });
    await expect(auth.api.signInEmail({ body: { email: 'writer@example.com', password: 'first-password-1' } })).rejects.toBeDefined();
    expect((await auth.api.signInEmail({ body: { email: 'writer@example.com', password: 'second-password-2' } })).user.email).toBe('writer@example.com');
    await expect(auth.api.resetPassword({ body: { newPassword: 'third-password-3', token } })).rejects.toBeDefined();
  });

  it('never sends anything to the demo accounts’ reserved addresses', async () => {
    await auth.api.signUpEmail({ body: { email: 'guest@worldroot.test', password: 'demo-password-1', name: 'guest' } });
    const before = sent.length;
    await auth.api.requestPasswordReset({ body: { email: 'guest@worldroot.test', redirectTo: '/reset-password' } });
    expect(sent.length).toBe(before);
    expect(sent.some((message) => message.to.endsWith('.test'))).toBe(false);
  });
});
