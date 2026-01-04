import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const hits = new Map<string, RateLimitEntry>();
  const { windowMs, max, message, keyGenerator } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator ? keyGenerator(req) : (req.ip || 'unknown');
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= max) {
      return res.status(429).json({ error: message || 'Too many requests' });
    }

    entry.count += 1;

    // Opportunistic cleanup to avoid unbounded growth.
    if (Math.random() < 0.01) {
      for (const [storedKey, storedEntry] of hits.entries()) {
        if (now > storedEntry.resetAt) {
          hits.delete(storedKey);
        }
      }
    }

    return next();
  };
}
