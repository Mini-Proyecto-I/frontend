import apiClient from "../axiosClient";

// Subtareas anidadas a actividades (SubtaskViewSet)
// List / Create:   GET/POST /api/activity/<activity_id>/subtasks/
// Detail/Update/Delete: /api/activity/<activity_id>/subtasks/<subtask_id>/

// Obtener todas las subtareas de una actividad concreta
export const getSubtasksForActivity = async (activityId) => {
  const { data } = await apiClient.get(`activity/${activityId}/subtasks/`);
  return data;
};

// Utilidad para el panel "Hoy": obtener todas las subtareas de todas las actividades
// usando exclusivamente los endpoints anidados correctos.
export const getSubtasks = async () => {
  // Primero obtenemos todas las actividades
  const { data: activities } = await apiClient.get("activity/");

  if (!Array.isArray(activities) || activities.length === 0) {
    return [];
  }

  // Para cada actividad, pedimos sus subtareas anidadas
  const subtasksByActivity = await Promise.all(
    activities.map((activity) =>
      apiClient
        .get(`activity/${activity.id}/subtasks/`)
        .then((response) => response.data)
        .catch(() => [])
    )
  );

  // Aplanamos en una sola lista de subtareas
  return subtasksByActivity.flat();
};

// Crear una nueva subtarea en el backend para una actividad concreta
export const createSubtask = async (activityId, subtaskData) => {
  const { data } = await apiClient.post(
    `activity/${activityId}/subtasks/`,
    subtaskData
  );
  return data;
};

// Operaciones de detalle sobre una subtarea concreta
export const getSubtask = async (activityId, subtaskId) => {
  const { data } = await apiClient.get(
    `activity/${activityId}/subtasks/${subtaskId}/`
  );
  return data;
};

export const updateSubtask = async (activityId, subtaskId, subtaskData) => {
  const { data } = await apiClient.put(
    `activity/${activityId}/subtasks/${subtaskId}/`,
    subtaskData
  );
  return data;
};

export const patchSubtask = async (activityId, subtaskId, partialData) => {
  const { data } = await apiClient.patch(
    `activity/${activityId}/subtasks/${subtaskId}/`,
    partialData
  );
  return data;
};

// Reprogramación tolerante a conflicto (endpoint global de planner)
// Permite actualizar fecha/horas aunque exceda el límite diario,
// devolviendo metadata de conflicto en la respuesta.
export const putSubtaskWithConflictTolerance = async (subtaskId, payload) => {
  const { data } = await apiClient.put(`subtareas/${subtaskId}/`, payload);
  return data;
};

export const deleteSubtask = async (activityId, subtaskId) => {
  await apiClient.delete(`activity/${activityId}/subtasks/${subtaskId}/`);
};

export const postponeSubtask = async (activityId, subtaskId, note = "") => {
  const { data } = await apiClient.patch(
    `activity/${activityId}/subtasks/${subtaskId}/postpone/`,
    { execution_note: note }
  );
  return data;
};

// Obtener disponibilidad en el calendario (7 días) para una subtarea
export const getSubtaskCalendar = async (subtaskId, date = null) => {
  const params = date ? { date } : {};
  const { data } = await apiClient.get(
    `subtareas/${subtaskId}/calendar/`, 
    { params }
  );
  return data;
};