import apiClient from "../axiosClient";

// Reprogramming logs (ReprogrammingLogViewSet)
// List / Create: /api/reprogramming_log/
export const getReprogrammingLogs = async () => {
  const { data } = await apiClient.get("reprogramming_log/");
  return data;
};

export const createReprogrammingLog = async (logData) => {
  const { data } = await apiClient.post("reprogramming_log/", logData);
  return data;
};

// Detail / Update / Delete: /api/reprogramming_log/<log_id>/
export const getReprogrammingLog = async (logId) => {
  const { data } = await apiClient.get(`reprogramming_log/${logId}/`);
  return data;
};

export const updateReprogrammingLog = async (logId, logData) => {
  const { data } = await apiClient.put(
    `reprogramming_log/${logId}/`,
    logData
  );
  return data;
};

export const patchReprogrammingLog = async (logId, partialData) => {
  const { data } = await apiClient.patch(
    `reprogramming_log/${logId}/`,
    partialData
  );
  return data;
};

export const deleteReprogrammingLog = async (logId) => {
  await apiClient.delete(`reprogramming_log/${logId}/`);
};
