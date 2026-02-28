
import apiClient from "../axiosClient";

// List / Create: /api/activity/
export const getActivities = async () => {
  const { data } = await apiClient.get("activity/");
  return data;
};

// Crear una nueva actividad en el backend
export const createActivity = async (activityData) => {
  const { data } = await apiClient.post("activity/", activityData);
  return data;
};

// Detail / Update / Delete: /api/activity/<activity_id>/
export const getActivity = async (activityId) => {
  const { data } = await apiClient.get(`activity/${activityId}/`);
  return data;
};

export const updateActivity = async (activityId, activityData) => {
  const { data } = await apiClient.put(`activity/${activityId}/`, activityData);
  return data;
};

export const patchActivity = async (activityId, partialData) => {
  const { data } = await apiClient.patch(`activity/${activityId}/`, partialData);
  return data;
};

export const deleteActivity = async (activityId) => {
  await apiClient.delete(`activity/${activityId}/`);
};

// Tipos de actividad (si el backend expone este endpoint auxiliar)
export const getActivityTypes = async () => {
  try {
    // Intentar obtener los tipos desde el endpoint si existe
    const { data } = await apiClient.get("activity/types/");
    return data;
  } catch (error) {
    // Si el endpoint no existe, retornar los tipos por defecto
    console.warn("Activity types endpoint not found, using default types");
    // Valores por defecto alineados con el backend (choices en Activity.type)
    return ["Examen", "Taller", "Proyecto"];
  }
};