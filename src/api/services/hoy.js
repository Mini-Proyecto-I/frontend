import apiClient from '../axiosClient';

export const getHoyTasks = async (params = {}) => {
    const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== "" && v !== null && v !== undefined)
    );
    
    const { data } = await apiClient.get('/hoy/', { params: cleanParams });
    return data;
};

export const getHoyTiempo = async () => {
    const { data } = await apiClient.get('/hoy/tiempo/');
    return data;
};
