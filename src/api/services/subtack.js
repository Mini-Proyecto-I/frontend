import apiClient from '../axiosClient';

export const getSubtasks = async () => {
  const { data } = await apiClient.get('subtask/');
  return data;
};