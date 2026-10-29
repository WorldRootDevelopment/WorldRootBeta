/** Stable error codes shared by the API and its clients. */
export const ERROR_CODES = [
  'unauthenticated',
  'forbidden',
  'not_found',
  'conflict',
  'invalid_input',
  /** Too many of something in a short time, such as uploads. Trying again later works. */
  'rate_limited',
  'internal',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** The one error envelope every API response uses. */
export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    /** Present on `forbidden`: the permission key the caller lacks. */
    permission?: string;
    /** Present on `invalid_input` and `conflict`: messages keyed by field name. */
    fields?: Record<string, string>;
  };
}
