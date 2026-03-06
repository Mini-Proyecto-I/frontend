import apiClient from "../axiosClient";

// Obtener estadísticas públicas (número de usuarios)
export const getUserStats = async () => {
  const { data } = await apiClient.get("auth/stats/");
  return data;
};
