import 'server-only';
import type { ApiError } from '@worldroot/contracts';
import { DomainError, HTTP_STATUS, type Actor } from '@worldroot/core';
import { getViewer } from './session';

/** Turns a thrown error into the API error envelope. */
export function errorResponse(error: unknown): Response {
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
