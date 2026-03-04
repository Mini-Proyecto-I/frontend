import { useState, useEffect, useCallback } from 'react';
import { getHoyTasks } from '../../../api/services/hoy';
import { getCourses } from '../../../api/services/course';

export const useHoy = (filters = {}) => {
    const [data, setData] = useState({
        vencidas: [],
        para_hoy: [],
        proximas: [],
        total_vencidas: 0,
        total_para_hoy: 0,
        total_proximas: 0
    });
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [hoyData, coursesData] = await Promise.all([
                getHoyTasks(filters),
                getCourses()
            ]);
            setData(hoyData);
            setCourses(coursesData);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [filters.status, filters.course, filters.days_ahead]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { ...data, courses, loading, error, refetch: fetchData };
};
