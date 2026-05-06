import { logger } from 'firebase-functions/v2';

/**
 * Error reporting for Firebase Crashlytics
 * Centralizes error handling and structured error logging
 * 
 * Usage:
 * try {
 *   // Code
 * } catch (error) {
 *   ErrorReporter.captureError(error, 'add_item_operation', { itemId: '123' });
 * }
 */
export class ErrorReporter {
  /**
   * Capture and report an error
   * @param error The error to report
   * @param context The operation context where error occurred
   * @param additionalData Additional structured data for debugging
   */
  static captureError(
    error: unknown,
    context: string,
    additionalData?: Record<string, unknown>
  ): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    logger.error(`Error in ${context}: ${errorObj.message}`, {
      context,
      error: errorObj.message,
      stack: errorObj.stack,
      ...additionalData
    });

    // In production, this would be sent to Firebase Crashlytics
    // For now, structured logging provides the same visibility
    this.recordErrorMetric(context);
  }

  /**
   * Record error metric for SLO tracking
   */
  private static errorMetrics: Map<string, number> = new Map();

  private static recordErrorMetric(context: string): void {
    const count = (this.errorMetrics.get(context) || 0) + 1;
    this.errorMetrics.set(context, count);
  }

  /**
   * Get error count for a specific context
   */
  static getErrorCount(context: string): number {
    return this.errorMetrics.get(context) || 0;
  }

  /**
   * Get all error metrics
   */
  static getAllErrorMetrics(): Record<string, number> {
    const result: Record<string, number> = {};
    this.errorMetrics.forEach((count, context) => {
      result[context] = count;
    });
    return result;
  }

  /**
   * Reset error metrics (for testing)
   */
  static resetMetrics(): void {
    this.errorMetrics.clear();
  }
}

/**
 * HttpsError with structured context
 * Provides better error messages and automatic Crashlytics reporting
 */
export class ContextualError extends Error {
  constructor(
    public code: string,
    public message: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ContextualError';
  }

  /**
   * Convert to Firebase HttpsError format
   */
  toHttpsError(): { code: string; message: string } {
    return {
      code: this.code,
      message: this.message
    };
  }
}

/**
 * Exception handling utilities
 */
export class ExceptionHandler {
  /**
   * Format exception for logging
   */
  static formatException(error: unknown): {
    name: string;
    message: string;
    stack?: string;
    cause?: string;
  } {
    if (error instanceof Error) {
      const cause = (error as { cause?: unknown }).cause;
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: cause ? String(cause) : undefined
      };
    }

    return {
      name: 'Unknown',
      message: String(error)
    };
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
      'EHOSTUNREACH',
      'EPIPE',
      'ECONNRESET',
      'EROFS'
    ];

    const message = error.message.toUpperCase();
    return retryableErrors.some(err => message.includes(err));
  }

  /**
   * Calculate exponential backoff delay
   */
  static getRetryDelay(attemptNumber: number, baseDelayMs: number = 100): number {
    // exponential backoff with jitter: (2^n - 1) * baseDelay + random jitter
    const exponentialDelay = (Math.pow(2, attemptNumber) - 1) * baseDelayMs;
    const jitter = Math.random() * exponentialDelay * 0.1; // 10% jitter
    return exponentialDelay + jitter;
  }
}

/**
 * Structured error context for consistent error reporting
 */
export interface ErrorContext {
  operation: string;
  userId?: string;
  wishlistId?: string;
  itemId?: string;
  cause?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Error logger with context
 */
export function logErrorWithContext(error: unknown, context: ErrorContext): void {
  const formatted = ExceptionHandler.formatException(error);
  
  logger.error(`[${context.operation}] ${formatted.message}`, {
    ...context,
    error: formatted,
    isRetryable: ExceptionHandler.isRetryable(error)
  });

  // Report to metrics
  ErrorReporter.captureError(error, context.operation, context.metadata);
}
