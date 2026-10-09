/**
 * What the sign-in pages say when Discord or Google sends someone back with
 * a problem. Keyed by the code the auth library puts in the address. Kept in
 * a plain file so the server-rendered pages can use it.
 */
const OAUTH_ERRORS: Record<string, string> = {
  account_not_linked:
    'There is already a WorldRoot account with that email address. Sign in the way you did before, then connect Discord or Google under Settings, Account.',
  access_denied: 'Sign-in was canceled. Nothing was changed.',
  email_not_found: 'That account did not share an email address, which WorldRoot needs. Allow it and try again.',
};

export const oauthError = (code: string | undefined) => (code ? (OAUTH_ERRORS[code] ?? 'Sign-in did not finish. Try again.') : null);
