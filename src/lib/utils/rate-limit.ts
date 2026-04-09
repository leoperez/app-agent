import { ratelimit } from '@/lib/redis';
import { RateLimitError } from '@/types/errors';

type Window =
  | `${number} ms`
  | `${number} s`
  | `${number} m`
  | `${number} h`
  | `${number} d`;

/**
 * Enforces a rate limit for a given identifier (e.g. userId).
 * Throws RateLimitError if the limit is exceeded.
 */
export async function checkRateLimit(
  identifier: string,
  requests: number,
  window: Window
): Promise<void> {
  const limiter = ratelimit(requests, window);
  const { success } = await limiter.limit(identifier);
  if (!success) {
    throw new RateLimitError();
  }
}
