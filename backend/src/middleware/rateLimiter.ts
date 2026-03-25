import type { Request, Response, NextFunction } from 'express';

interface RateLimitInfo {
  count: number;
  resetAt: number;
}

/**
 * In-memory IP-based rate limiter for scraping endpoints.
 * Tracks hits per IP address and enforces limits based on environment variables.
 */
const ipCache = new Map<string, RateLimitInfo>();

export const scrapeRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Configuration from .env
  const limit = parseInt(process.env.SCRAPE_LIMIT_PER_IP || '5', 10);
  const windowMs = parseInt(process.env.SCRAPE_WINDOW_MS || (24 * 60 * 60 * 1000).toString(), 10);
  const whitelist = (process.env.WHITELIST_IPS || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter((ip) => ip.length > 0);

  // If limit is set to 0, rate limiting is disabled
  if (limit <= 0) {
    return next();
  }

  // Get client IP
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // Bypass if whitelisted
  if (whitelist.includes(ip)) {
    console.log(`Bypassing rate limit for whitelisted IP: ${ip}`);
    return next();
  }

  const now = Date.now();
  let info = ipCache.get(ip);

  // Reset if window has passed or first visit
  if (!info || now > info.resetAt) {
    info = { count: 1, resetAt: now + windowMs };
    ipCache.set(ip, info);
    return next();
  }

  // Check if limit is exceeded
  if (info.count >= limit) {
    console.warn(`Rate limit exceeded for IP: ${ip} (${info.count}/${limit})`);
    
    // For SSE routes, we might need to send an error event if the response hasn't ended,
    // but standard Express middleware handles this before the route logic.
    return res.status(429).json({
      error: 'Too many scraping requests.',
      message: `You have reached the limit of ${limit} scrapes per day.`,
      limit,
      resetInMinutes: Math.ceil((info.resetAt - now) / (60 * 1000)),
    });
  }

  // Increment and proceed
  info.count++;
  next();
};
