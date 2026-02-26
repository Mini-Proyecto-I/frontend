import apiClient from "../axiosClient";

export const getSubtasks = async () => {
  const { data } = await apiClient.get("subtask/");
  return data;
};

// Crear una nueva subtarea en el backend
export const createSubtask = async (subtaskData) => {
  const { data } = await apiClient.post("subtask/", subtaskData);
  return data;
};