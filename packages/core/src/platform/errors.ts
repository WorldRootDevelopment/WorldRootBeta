import type { ApiError, ErrorCode } from '@worldroot/contracts';

interface DomainErrorOptions {
  permission?: string;
  fields?: Record<string, string>;
}

/** An expected failure with a stable code. Route handlers turn it into the API error envelope. */
export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly permission?: string;
  readonly fields?: Record<string, string>;

  constructor(code: ErrorCode, message: string, options: DomainErrorOptions = {}) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.permission = options.permission;
    this.fields = options.fields;
  }

  toJSON(): ApiError {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.permission ? { permission: this.permission } : {}),
        ...(this.fields ? { fields: this.fields } : {}),
      },
    };
  }
}

export const HTTP_STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  invalid_input: 422,
  internal: 500,
};
