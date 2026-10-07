import type { ApiError } from '@worldroot/contracts';

export interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  /** One message to show when the request failed. */
  message: string | null;
  fields: Record<string, string>;
}

/** Sends JSON to an API route and unpacks the error envelope. Never throws. */
export async function send<T = unknown>(method: 'POST' | 'PUT', url: string, body: unknown): Promise<ApiResult<T>> {
  const response = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!response) return { ok: false, data: null, message: 'Could not reach WorldRoot. Check your connection.', fields: {} };
  if (response.ok) {
    const data = response.status === 204 ? null : ((await response.json().catch(() => null)) as T | null);
    return { ok: true, data, message: null, fields: {} };
  }
  const error = ((await response.json().catch(() => null)) as ApiError | null)?.error;
  return { ok: false, data: null, message: error?.message ?? 'Something went wrong. Try again.', fields: error?.fields ?? {} };
}
