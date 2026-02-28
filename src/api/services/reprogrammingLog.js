import apiClient from '../axiosClient';

export const getReprogrammingLogs = async () => {
  const { data } = await apiClient.get('reprogramming_log/');
  return data;
};
