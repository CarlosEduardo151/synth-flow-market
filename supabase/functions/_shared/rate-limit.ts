/**
 * Simple in-memory rate limiter for edge functions
 * SECURITY: Prevents brute force and DoS attacks
 */

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if request exceeds rate limit
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns true if rate limit exceeded
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { limited: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);
  
  if (!entry || entry.resetTime < now) {
    // First request or window expired
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { limited: false };
  }
  
  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      limited: true,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000), // seconds
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(identifier, entry);
  
  return { limited: false };
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(req: Request): string {
  // Try to get real IP from headers (when behind proxy/CDN)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback to connection info (may not be available in all environments)
  return 'unknown';
}

/**
 * Default rate limit configs for different endpoints
 */
export const RATE_LIMITS = {
  // Strict for authentication endpoints
  AUTH: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 req per 15 min
  
  // Medium for payment endpoints
  PAYMENT: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 req per minute
  
  // Relaxed for webhooks (external services)
  WEBHOOK: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 req per minute
  
  // Default for other endpoints
  DEFAULT: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 req per minute
};
