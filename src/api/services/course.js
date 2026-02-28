
import apiClient from "../axiosClient";

export const getCourses = async () => {
    const { data } = await apiClient.get('course/');
    return data;
};
