import Redis from 'ioredis';

const CACHE_TTL = 3600; // 1 hour in seconds

/** @type {Redis | null} */
let redis = null;

/**
 * In-memory fallback cache for when Redis is unavailable.
 * Uses a Map with TTL tracking.
 */
class MemoryCache {
  constructor() {
    this.store = new Map();
    this.timers = new Map();
  }

  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    return entry;
  }

  async set(key, value, ...args) {
    // Parse optional EX ttl: set(key, value, 'EX', seconds)
    let ttl = CACHE_TTL;
    const exIndex = args.indexOf('EX');
    if (exIndex !== -1 && args[exIndex + 1]) {
      ttl = parseInt(args[exIndex + 1], 10);
    }

    this.store.set(key, value);

    // Clear existing timer
    if (this.timers.has(key)) clearTimeout(this.timers.get(key));

    // Set expiry
    this.timers.set(key, setTimeout(() => {
      this.store.delete(key);
      this.timers.delete(key);
    }, ttl * 1000));

    return 'OK';
  }

  async del(key) {
    this.store.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    return 1;
  }
}

/** @type {MemoryCache} */
let memoryCache = null;

async function initRedis() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    const redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      retryStrategy() {
        // Don't retry — fall back immediately
        return null;
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    // Suppress error events so they don't crash the process
    redisClient.on('error', () => {});

    await redisClient.connect();
    redis = redisClient;
    console.log('✅ Redis connected');
  } catch {
    console.warn('⚠️  Redis unavailable, using in-memory cache');
    redis = null;
    memoryCache = new MemoryCache();
  }
}

await initRedis();

/**
 * Get the active cache instance (Redis or in-memory fallback)
 * @returns {Redis | MemoryCache}
 */
export function getCache() {
  return redis || memoryCache || (memoryCache = new MemoryCache());
}

export { CACHE_TTL };
export default redis;
