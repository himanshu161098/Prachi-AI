import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
  name?: string;
}) {
  const store = new Map<string, RateLimitRecord>();

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, allow high throughput if requested
    if (process.env.NODE_ENV === 'test' && process.env.SKIP_RATE_LIMIT === 'true') {
      next();
      return;
    }

    // Safely extract client IP using Express req.ip (honors trust proxy configuration)
    let clientIp = req.ip;
    if (!clientIp) {
      const forwarded = req.headers['x-forwarded-for'];
      if (typeof forwarded === 'string') {
        clientIp = forwarded.split(',')[0].trim();
      } else {
        clientIp = req.socket.remoteAddress || '127.0.0.1';
      }
    }

    // Compound key: If request targets a specific user identifier, rate limit both IP and account
    const targetId = typeof req.body?.identifier === 'string'
      ? req.body.identifier.toLowerCase().trim()
      : (typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '');
    const key = targetId ? `${clientIp}:${targetId}` : clientIp;

    const now = Date.now();
    const record = store.get(key);

    if (!record || now > record.resetTime) {
      store.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      res.setHeader('X-RateLimit-Limit', options.maxRequests);
      res.setHeader('X-RateLimit-Remaining', options.maxRequests - 1);
      next();
      return;
    }

    record.count += 1;
    const remaining = Math.max(0, options.maxRequests - record.count);
    res.setHeader('X-RateLimit-Limit', options.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > options.maxRequests) {
      res.status(429).json({
        error: 'TooManyRequests',
        message: options.message || 'Rate limit exceeded. Please wait before retrying.',
        retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000)
      });
      return;
    }

    next();
  };
}

// Global API rate limiter
export const rateLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  maxRequests: config.rateLimit.maxRequests,
  message: 'Rate limit exceeded. Please wait before retrying.'
});

// Dedicated OTP dispatch rate limiter (protects against OTP spam and email flooding)
export const sendOtpRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 15, // 15 OTP send requests per 5 minutes per IP
  message: 'Too many verification code requests. Please wait a few minutes before requesting another code.'
});

// Dedicated Auth endpoint rate limiter (protects against brute-force login/register/verify attempts)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 50, // 50 attempts per 15 minutes per IP
  message: 'Too many authentication attempts. Please wait before trying again.'
});
