import 'server-only';
import type { ApiError } from '@worldroot/contracts';
import { DomainError, HTTP_STATUS, type Actor } from '@worldroot/core';
import { getViewer } from './session';

/**
 * True when the database rejected a malformed id (PostgreSQL 22P02), as happens
 * when a URL carries something that is not a UUID. Such a thing cannot exist.
 */
export function isMalformedId(error: unknown): boolean {
  for (let at = error as { code?: unknown; cause?: unknown } | undefined; at; at = at.cause as typeof at) {
    if (at.code === '22P02') return true;
  }
  return false;
}

/** Turns a thrown error into the API error envelope. */
export function errorResponse(error: unknown): Response {
  if (isMalformedId(error)) error = new DomainError('not_found', 'That does not exist.');
  if (error instanceof DomainError) {
    return Response.json(error.toJSON(), { status: HTTP_STATUS[error.code] });
  }
  console.error(error);
  const body: ApiError = { error: { code: 'internal', message: 'Something went wrong.' } };
  return Response.json(body, { status: 500 });
}

const hostOf = (url: string): string | null => {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
};

/**
 * The addresses this site answers at. Behind a host's proxy the request's own URL names the
 * machine inside the host (localhost and a port), not the address people typed, so it cannot
 * be compared with the browser's Origin. The site's configured address and the Host header
 * can: a page on another site cannot make a browser send a different Host.
 */
function ownHosts(request: Request): Set<string | null> {
  const hosts = new Set<string | null>();
  const configured = process.env.BETTER_AUTH_URL;
  if (configured) hosts.add(hostOf(configured));
  const host = request.headers.get('host');
  if (host) hosts.add(host.toLowerCase());
  // An origin that cannot be read is never one of ours.
  hosts.delete(null);
  return hosts;
}

/**
 * What the shared guest account may change. Anyone at all can be signed in to it, so it gets only
 * what trying WorldRoot needs: characters, worlds, and writing and rolling in scenes. Everything not
 * listed is refused, which covers its own profile and pictures, uploads, direct messages, friends,
 * blocks, partner listings, and creating, joining or running communities. A route added later is
 * refused too until it is listed here.
 */
const GUEST_MAY = [
  /^\/api\/v1\/characters(\/[^/]+)?$/,
  /^\/api\/v1\/communities\/[^/]+\/characters$/,
  /^\/api\/v1\/worlds(\/from-template|\/[^/]+|\/[^/]+\/locations)?$/,
  /^\/api\/v1\/locations\/[^/]+$/,
  /^\/api\/v1\/scenes(\/[^/]+\/(posts|draft|read|rolls|characters|status))?$/,
  /^\/api\/v1\/posts\/[^/]+$/,
  /^\/api\/v1\/conversations\/[^/]+\/(messages|read)$/,
  /^\/api\/v1\/messages\/[^/]+$/,
  /^\/api\/v1\/notifications\/read$/,
  /^\/api\/v1\/presence$/,
  /^\/api\/v1\/reports$/,
];

function guestMay(request: Request): boolean {
  const { pathname } = new URL(request.url);
  return GUEST_MAY.some((pattern) => pattern.test(pathname));
}

/**
 * Guards a state-changing request: it must come from this site and from a signed-in user.
 * Session cookies are SameSite=Lax; the origin check closes the remaining cross-site cases.
 */
export async function requireActor(request: Request): Promise<Actor> {
  const origin = request.headers.get('origin');
  if (origin && !ownHosts(request).has(hostOf(origin))) {
    throw new DomainError('forbidden', 'Cross-site requests are not allowed.');
  }
  const viewer = await getViewer();
  if (!viewer) throw new DomainError('unauthenticated', 'Sign in to continue.');
  if (viewer.suspended) throw new DomainError('forbidden', 'This account is suspended.');
  if (viewer.demoGuest && !guestMay(request)) {
    throw new DomainError('forbidden', 'The shared demo account cannot do that. Create your own free account to use all of WorldRoot.');
  }
  return viewer.actor;
}

/** Reads a JSON body, refusing anything that is not an object. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new DomainError('invalid_input', 'Send a JSON object.');
  }
  return body as Record<string, unknown>;
}

type RouteContext<P> = { params: Promise<P> };

/**
 * Wraps a state-changing route handler: checks the origin and the session, hands
 * the handler its actor and route params, and turns any thrown error into the envelope.
 */
export function route<P = Record<string, never>>(
  handler: (input: { request: Request; actor: Actor; params: P }) => Promise<Response>,
) {
  return async (request: Request, context: RouteContext<P>): Promise<Response> => {
    try {
      const actor = await requireActor(request);
      return await handler({ request, actor, params: await context.params });
    } catch (error) {
      return errorResponse(error);
    }
  };
}
