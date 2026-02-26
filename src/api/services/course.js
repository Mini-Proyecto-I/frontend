import apiClient from "../axiosClient";

export const getCourses = async () => {
    const { data } = await apiClient.get('course/');
    return data;
};

export const createCourse = async (courseData) => {
    const { data } = await apiClient.post('course/', courseData);
    return data;
};
