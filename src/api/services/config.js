import apiClient from "../axiosClient";

// Obtener configuración del usuario (límite diario, etc.)
export const getUserConfig = async () => {
  const { data } = await apiClient.get("configuracion/");
  return data;
};

// Actualizar configuración del usuario (daily_hours_limit)
export const updateUserConfig = async (dailyHoursLimit) => {
  const payload = { daily_hours_limit: dailyHoursLimit };
  const { data } = await apiClient.put("configuracion/", payload);
  return data;
};

