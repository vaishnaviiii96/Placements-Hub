import { getCache, CACHE_TTL } from '../lib/redis.js';

/**
 * Redis caching middleware.
 * Caches JSON responses by request path + query string with 1-hour TTL.
 * Falls back to in-memory cache if Redis is unavailable.
 *
 * @param {number} [ttl=CACHE_TTL] - Cache TTL in seconds (default 3600)
 */
export function cacheMiddleware(ttl = CACHE_TTL) {
  return async (req, res, next) => {
    const cache = getCache();
    const key = `cache:${req.originalUrl}`;

    try {
      const cached = await cache.get(key);
      if (cached) {
        const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return res.json(data);
      }
    } catch (err) {
      console.warn('Cache read error:', err.message);
    }

    // Override res.json to intercept the response and cache it
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await cache.set(key, JSON.stringify(body), 'EX', ttl);
        } catch (err) {
          console.warn('Cache write error:', err.message);
        }
      }
      return originalJson(body);
    };

    next();
  };
}
