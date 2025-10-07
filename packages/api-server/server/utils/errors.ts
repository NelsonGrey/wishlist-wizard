/**
 * Error handling utilities for consistent error management
 */

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export class ValidationError extends Error implements AppError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  code = 'NOT_FOUND';
}

export class UnauthorizedError extends Error implements AppError {
  statusCode = 401;
  code = 'UNAUTHORIZED';
}

export class DatabaseError extends Error implements AppError {
  statusCode = 500;
  code = 'DATABASE_ERROR';
}

/**
 * Type guard to check if error is an instance of Error
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return isError(error) && 'statusCode' in error;
}

/**
 * Safe error message extraction
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  return String(error);
}

/**
 * Safe error status code extraction
 */
export function getErrorStatusCode(error: unknown): number {
  if (isAppError(error) && error.statusCode) {
    return error.statusCode;
  }
  return 500;
}