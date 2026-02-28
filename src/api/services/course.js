import apiClient from "../axiosClient";

// List / Create: /api/course/
export const getCourses = async () => {
  const { data } = await apiClient.get("course/");
  return data;
};

export const createCourse = async (courseData) => {
  const { data } = await apiClient.post("course/", courseData);
  return data;
};

// Detail / Update / Delete: /api/course/<course_id>/
export const getCourse = async (courseId) => {
  const { data } = await apiClient.get(`course/${courseId}/`);
  return data;
};

export const updateCourse = async (courseId, courseData) => {
  const { data } = await apiClient.put(`course/${courseId}/`, courseData);
  return data;
};

export const patchCourse = async (courseId, partialData) => {
  const { data } = await apiClient.patch(`course/${courseId}/`, partialData);
  return data;
};

export const deleteCourse = async (courseId) => {
  await apiClient.delete(`course/${courseId}/`);
};
