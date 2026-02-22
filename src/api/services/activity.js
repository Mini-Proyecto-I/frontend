
import apiClient from "../axiosClient";

export const getActivities = async () => {
    const { data } = await apiClient.get('activity/');
    return data;
};

export const getActivityTypes = async () => {
    try {
        // Intentar obtener los tipos desde el endpoint si existe
        const { data } = await apiClient.get('activity/types/');
        return data;
    } catch (error) {
        // Si el endpoint no existe, retornar los tipos por defecto
        console.warn('Activity types endpoint not found, using default types');
        return ['Examen', 'Tarea', 'Proyecto'];
    }
};