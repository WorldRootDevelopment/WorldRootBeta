/**
 * Proves to Discord that WorldRoot's Discord application and this domain belong
 * to the same people. Discord reads this address and expects exactly this text.
 * The value is public by design; it comes from the application's settings in
 * the Discord Developer Portal and changes only if the domain is verified again.
 */
export const dynamic = 'force-static';

export function GET() {
  return new Response('dh=35ee1f556371102476b4a1697acc0b53254bfffb', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
