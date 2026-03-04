import apiClient from '../axiosClient';

export const getHoyTasks = async (params = {}) => {
    const { data } = await apiClient.get('/hoy/', { params });
    return data;
};
