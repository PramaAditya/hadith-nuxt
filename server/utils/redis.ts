import Redis from 'ioredis';
import crypto from 'node:crypto';

let redisClient: Redis | null = null;
const redisUrl = process.env.REDIS_URL;

if (redisUrl) {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 500 // 0.5 seconds connect timeout to avoid blocking if Redis is offline
    });
    redisClient.on('error', (err) => {
      console.warn('Redis connection warning:', err.message);
    });
    console.log('Redis client successfully configured.');
  } catch (err) {
    console.error('Failed to initialize Redis client:', err);
  }
} else {
  console.log('REDIS_URL is not defined in the environment, caching is disabled.');
}

export function getCacheKey(text: string): string {
  // Normalize whitespaces and lowercase the query text
  const cleaned = text.trim().toLowerCase().replace(/\s+/g, ' ');
  const hash = crypto.createHash('sha256').update(cleaned).digest('hex');
  return `emb:${hash}`;
}

export { redisClient };
export type RedisClientType = Redis | null;
