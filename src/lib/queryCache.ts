/**
 * queryCache — In-memory cache singleton with TTL support.
 *
 * Features:
 *  - Stores serialized API responses keyed by a string
 *  - Each entry has a configurable time-to-live (TTL) defaulting to 5 minutes
 *  - Supports prefix-based invalidation (e.g. invalidate all "hoy:*" entries)
 *  - Thread-safe: synchronous Map operations, no race conditions
 *
 * Key convention:
 *   "activities"           → all activities list
 *   "activity:42"          → single activity detail
 *   "subtasks:42"          → subtasks for activity 42
 *   "courses"              → all courses list
 *   "hoy:STATUS:COURSE:7"  → /hoy/ with specific filters
 *   "hoy:tiempo"           → /hoy/tiempo/ response
 */

export const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class QueryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /**
   * Returns cached data for a key if it exists and has not expired.
   * Returns `undefined` on a cache miss or stale entry.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  /**
   * Stores data in the cache under `key` with the given TTL.
   */
  set<T>(key: string, data: T, ttl: number = DEFAULT_TTL_MS): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Removes a single cache entry by exact key.
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Removes all entries whose key starts with `prefix`.
   * Use this to invalidate related groups of cached data.
   *
   * Example: invalidateByPrefix("hoy:") removes all hoy query caches.
   */
  invalidateByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Removes all entries from the cache.
   * Call this on logout to ensure no data from the previous session remains.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Returns the current number of (non-expired) entries in the cache.
   * Useful for debugging.
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Returns all current cache keys (including potentially stale ones).
   * Useful for debugging.
   */
  get keys(): string[] {
    return Array.from(this.store.keys());
  }
}

// Singleton instance — shared across the entire app
export const queryCache = new QueryCache();
