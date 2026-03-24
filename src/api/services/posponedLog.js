import apiClient from "../axiosClient";

/**
 * Log de posposiciones (PosponedLogViewSet)
 * GET /api/posponed_log/
 * GET /api/posponed_log/notes-of-subtask/<subtask_id>/
 */

export const getPosponedLogs = async () => {
    const { data } = await apiClient.get("posponed_log/");
    return data;
};

export const getNotesOfSubtask = async (subtaskId) => {
    const { data } = await apiClient.get(`posponed_log/notes-of-subtask/${subtaskId}/`);
    return data;
};
