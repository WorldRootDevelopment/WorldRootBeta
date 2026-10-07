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

/**
 * Guards a state-changing request: it must come from this site and from a signed-in user.
 * Session cookies are SameSite=Lax; the origin check closes the remaining cross-site cases.
 */
export async function requireActor(request: Request): Promise<Actor> {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    throw new DomainError('forbidden', 'Cross-site requests are not allowed.');
  }
  const viewer = await getViewer();
  if (!viewer) throw new DomainError('unauthenticated', 'Sign in to continue.');
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
