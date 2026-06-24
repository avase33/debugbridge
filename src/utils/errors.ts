/**
 * Error handling utilities for DebugBridge.
 */

/** Custom base error class with optional error code */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', { resource, id });
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly fields: string[]) {
    super(message, 'VALIDATION_ERROR', { fields });
    this.name = 'ValidationError';
  }
}

/** Safely extract a string error message from an unknown thrown value */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}

/** Wrap an async function and return [data, error] tuple (Result pattern) */
export async function tryCatch<T>(fn: () => Promise<T>): Promise<[T | null, Error | null]> {
  try {
    return [await fn(), null];
  } catch (e) {
    return [null, e instanceof Error ? e : new Error(toErrorMessage(e))];
  }
}
