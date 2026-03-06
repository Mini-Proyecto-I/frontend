/**
 * useCachedFetch — Generic hook that wraps any async fetcher with queryCache.
 *
 * Usage:
 *   const { data, loading, error, refresh } = useCachedFetch(
 *     'courses',
 *     () => getCourses(),
 *     5 * 60 * 1000  // optional TTL override
 *   );
 *
 * On mount: serves from cache if available and fresh, otherwise fetches.
 * refresh(): force-fetches, bypassing and updating the cache.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { queryCache, DEFAULT_TTL_MS } from './queryCache';

interface UseCachedFetchResult<T> {
    data: T | undefined;
    loading: boolean;
    error: string | null;
    /** Force a fresh network request, ignoring any cached value. */
    refresh: () => Promise<void>;
}

export function useCachedFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = DEFAULT_TTL_MS
): UseCachedFetchResult<T> {
    const cached = queryCache.get<T>(key);

    const [data, setData] = useState<T | undefined>(cached);
    const [loading, setLoading] = useState<boolean>(!cached);
    const [error, setError] = useState<string | null>(null);

    // Keep fetcher stable so the effect doesn't re-run on every render
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;

    const execute = useCallback(
        async (bypassCache = false) => {
            if (!bypassCache) {
                const hit = queryCache.get<T>(key);
                if (hit !== undefined) {
                    setData(hit);
                    setLoading(false);
                    setError(null);
                    return;
                }
            }

            setLoading(true);
            try {
                const result = await fetcherRef.current();
                queryCache.set(key, result, ttl);
                setData(result);
                setError(null);
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Error al cargar datos';
                setError(msg);
            } finally {
                setLoading(false);
            }
        },
        [key, ttl]
    );

    useEffect(() => {
        execute(false);
    }, [execute]);

    const refresh = useCallback(async () => {
        queryCache.invalidate(key);
        await execute(true);
    }, [key, execute]);

    return { data, loading, error, refresh };
}
