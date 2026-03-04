import { useState, useEffect, useCallback } from 'react';
import { getHoyTasks, getHoyTiempo } from '../../../api/services/hoy';
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
    const [tiempoData, setTiempoData] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [hoyData, coursesData, tiempoResponse] = await Promise.all([
                getHoyTasks(filters),
                getCourses(),
                getHoyTiempo()
            ]);
            setData(hoyData);
            setCourses(coursesData);
            setTiempoData(tiempoResponse);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [filters.status, filters.course, filters.days_ahead]);

    const refetchTiempo = async () => {
        try {
            const tiempoResponse = await getHoyTiempo();
            setTiempoData(tiempoResponse);
        } catch (err) {
            console.error("Error refreshing tiempo", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { ...data, tiempoData, courses, loading, error, refetch: fetchData, setData, setTiempoData, refetchTiempo };
};
