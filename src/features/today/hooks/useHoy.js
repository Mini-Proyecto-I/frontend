import { useState, useEffect, useCallback, useRef } from 'react';
import { getHoyTasks, getHoyTiempo } from '../../../api/services/hoy';
import { getCourses } from '../../../api/services/course';
import { queryCache } from '../../../lib/queryCache';

const HOY_TTL = 5 * 60 * 1000; // 5 minutes
const COURSES_TTL = 10 * 60 * 1000; // 10 minutes (courses rarely change)
const TIEMPO_TTL = 60 * 1000; // 1 minute (updated frequently after subtask toggles)

/**
 * Builds a stable cache key that encodes the current filter combination.
 * Example: "hoy:PENDING:42:7"
 */
const buildHoyKey = (filters) =>
    `hoy:${filters.status ?? ''}:${filters.course ?? ''}:${filters.days_ahead ?? ''}`;

export const useHoy = (filters = {}) => {
    const [data, setData] = useState({
        vencidas: [],
        para_hoy: [],
        proximas: [],
        total_vencidas: 0,
        total_para_hoy: 0,
        total_proximas: 0
    });
    const [tiempoData, setTiempoData] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Keep a stable ref to filters values so callbacks don't close over stale state
    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    const fetchData = useCallback(async (bypassCache = false) => {
        const hoyKey = buildHoyKey(filtersRef.current);

        // ── Serve from cache if available ────────────────────────────────────
        if (!bypassCache) {
            const cachedHoy = queryCache.get(hoyKey);
            const cachedCourses = queryCache.get('courses');
            const cachedTiempo = queryCache.get('hoy:tiempo');

            if (cachedHoy && cachedCourses && cachedTiempo) {
                setData(cachedHoy);
                setCourses(cachedCourses);
                setTiempoData(cachedTiempo);
                setLoading(false);
                setError(null);
                return;
            }
        }

        // ── Cache miss → fetch all three endpoints in parallel ───────────────
        setLoading(true);
        try {
            const [hoyResponse, coursesResponse, tiempoResponse] = await Promise.all([
                queryCache.get(hoyKey) && !bypassCache
                    ? Promise.resolve(queryCache.get(hoyKey))
                    : getHoyTasks(filtersRef.current),
                queryCache.get('courses') && !bypassCache
                    ? Promise.resolve(queryCache.get('courses'))
                    : getCourses(),
                queryCache.get('hoy:tiempo') && !bypassCache
                    ? Promise.resolve(queryCache.get('hoy:tiempo'))
                    : getHoyTiempo(),
            ]);

            queryCache.set(hoyKey, hoyResponse, HOY_TTL);
            queryCache.set('courses', coursesResponse, COURSES_TTL);
            queryCache.set('hoy:tiempo', tiempoResponse, TIEMPO_TTL);

            setData(hoyResponse);
            setCourses(coursesResponse);
            setTiempoData(tiempoResponse);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [filters.status, filters.course, filters.days_ahead]);

    /**
     * Lightweight re-fetch of just the /hoy/tiempo/ endpoint.
     * Called after toggling a subtask status to update hour counters without
     * re-loading the full task list.
     */
    const refetchTiempo = useCallback(async () => {
        try {
            queryCache.invalidate('hoy:tiempo');
            const tiempoResponse = await getHoyTiempo();
            queryCache.set('hoy:tiempo', tiempoResponse, TIEMPO_TTL);
            setTiempoData(tiempoResponse);
        } catch (err) {
            console.error('Error al actualizar tiempo:', err);
        }
    }, []);

    /**
     * Full refetch: invalidates all hoy-related cache entries then re-fetches.
     */
    const refetch = useCallback(() => {
        queryCache.invalidateByPrefix('hoy:');
        queryCache.invalidate('courses');
        fetchData(true);
    }, [fetchData]);

    useEffect(() => {
        fetchData(false);
    }, [fetchData]);

    return {
        ...data,
        tiempoData,
        courses,
        loading,
        error,
        refetch,
        setData,
        setTiempoData,
        refetchTiempo,
    };
};
