import { Request, Response, NextFunction } from 'express';

// Firebase-first authenticated request interface
interface AuthenticatedRequest extends Request {
  firebaseUser?: {
    uid: string;
    email?: string;
    displayName?: string;
    emailVerified: boolean;
  };
  userId?: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastRequest: number;
}

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Skip rate limiting for successful requests
  skipFailedRequests?: boolean; // Skip rate limiting for failed requests
  keyGenerator?: (req: AuthenticatedRequest) => string; // Custom key generator
  onLimitExceeded?: (req: AuthenticatedRequest, res: Response) => void; // Custom handler for limit exceeded
  exemptUsers?: number[]; // User IDs exempt from rate limiting
}

/**
 * In-memory rate limiting store
 * In production, consider using Redis or another persistent store
 */
class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private cleanupIntervalMs: number = 60000) { // Clean up every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  /**
   * Get or create rate limit entry for a key
   */
  get(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    let entry = this.store.get(key);

    // Create new entry if it doesn't exist or has expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
        lastRequest: now
      };
      this.store.set(key, entry);
    }

    return entry;
  }

  /**
   * Increment the count for a key
   */
  increment(key: string, windowMs: number): RateLimitEntry {
    const entry = this.get(key, windowMs);
    entry.count++;
    entry.lastRequest = Date.now();
    this.store.set(key, entry);
    return entry;
  }

  /**
   * Check if key has exceeded the limit
   */
  isExceeded(key: string, maxRequests: number, windowMs: number): boolean {
    const entry = this.get(key, windowMs);
    return entry.count >= maxRequests;
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string, maxRequests: number, windowMs: number): number {
    const entry = this.get(key, windowMs);
    return Math.max(0, maxRequests - entry.count);
  }

  /**
   * Get reset time for a key
   */
  getResetTime(key: string, windowMs: number): number {
    const entry = this.get(key, windowMs);
    return entry.resetTime;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Destroy the store and cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Global rate limit store instance
const rateLimitStore = new RateLimitStore();

/**
 * Rate limiting middleware factory
 */
export const createRateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator,
    onLimitExceeded,
    exemptUsers = []
  } = options;

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check if user is exempt
    if (req.userId && exemptUsers.includes(req.userId)) {
      return next();
    }

    // Generate key for rate limiting
    const key = keyGenerator
      ? keyGenerator(req)
      : req.userId
        ? `user:${req.userId}:${req.ip}`
        : `ip:${req.ip}`;

    // Check if limit exceeded
    if (rateLimitStore.isExceeded(key, maxRequests, windowMs)) {
      const resetTime = rateLimitStore.getResetTime(key, windowMs);
      const remaining = rateLimitStore.getRemaining(key, maxRequests, windowMs);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
      });

      if (onLimitExceeded) {
        return onLimitExceeded(req, res);
      }

      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((resetTime - Date.now()) / 1000)} seconds.`,
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      });
    }

    // Track the response to potentially skip rate limiting
    const originalSend = res.send.bind(res);
    let responseSent = false;

    res.send = function(body: any) {
      if (!responseSent) {
        responseSent = true;

        // Check if we should skip incrementing based on response
        let shouldSkip = false;

        if (skipSuccessfulRequests && res.statusCode >= 200 && res.statusCode < 300) {
          shouldSkip = true;
        } else if (skipFailedRequests && res.statusCode >= 400) {
          shouldSkip = true;
        }

        if (!shouldSkip) {
          rateLimitStore.increment(key, windowMs);
        }
      }

      return originalSend(body);
    };

    // For JSON responses
    const originalJson = res.json.bind(res);
    res.json = function(body: any) {
      if (!responseSent) {
        responseSent = true;

        let shouldSkip = false;

        if (skipSuccessfulRequests && res.statusCode >= 200 && res.statusCode < 300) {
          shouldSkip = true;
        } else if (skipFailedRequests && res.statusCode >= 400) {
          shouldSkip = true;
        }

        if (!shouldSkip) {
          rateLimitStore.increment(key, windowMs);
        }
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Pre-configured rate limiters for common use cases
 */

// Strict rate limiter for expensive operations (like AI recommendations)
export const strictRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 requests per minute
  skipFailedRequests: true, // Don't count failed requests
  onLimitExceeded: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests for AI recommendations. Please wait before trying again.',
      retryAfter: 60
    });
  }
});

// Moderate rate limiter for general API endpoints
export const moderateRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  skipFailedRequests: true
});

// Lenient rate limiter for read-only operations
export const lenientRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 1000, // 1000 requests per hour
  skipSuccessfulRequests: false,
  skipFailedRequests: true
});

/**
 * Cost-aware rate limiter that considers API costs
 */
export const costAwareRateLimit = (maxCostPerWindow: number, windowMs: number) => {
  return createRateLimit({
    windowMs,
    maxRequests: 1000, // High limit, but we'll use custom logic
    keyGenerator: (req) => `cost:${req.userId || req.ip}`,
    onLimitExceeded: (req, res) => {
      res.status(429).json({
        error: 'Cost limit exceeded',
        message: `API cost limit of $${maxCostPerWindow} per ${Math.floor(windowMs / (60 * 1000))} minutes exceeded.`,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

/**
 * Get rate limit status for a user/IP
 */
export const getRateLimitStatus = (key: string, maxRequests: number, windowMs: number) => {
  const remaining = rateLimitStore.getRemaining(key, maxRequests, windowMs);
  const resetTime = rateLimitStore.getResetTime(key, windowMs);

  return {
    remaining,
    resetTime: Math.ceil(resetTime / 1000),
    limit: maxRequests
  };
};

/**
 * Clean up rate limit store (useful for testing)
 */
export const cleanupRateLimitStore = () => {
  rateLimitStore.destroy();
};