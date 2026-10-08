/**
 * A destination to return to after signing in, taken from a `next` query value.
 * Only paths inside this site are allowed, so a crafted link cannot send
 * someone to another site after they sign in.
 */
export function safeNext(value: string | string[] | null | undefined, fallback: string): string {
  const path = Array.isArray(value) ? value[0] : value;
  // Browsers treat a backslash like a forward slash, so "/\evil.example" would leave the site.
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes(String.fromCharCode(92))) return fallback;
  return path;
}
