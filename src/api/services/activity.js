
import apiClient from "../axiosClient";

export const getActivities = async () => {
    const { data } = await apiClient.get('activity/');
    return data;
};
