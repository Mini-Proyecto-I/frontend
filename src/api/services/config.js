import apiClient from "../axiosClient";

// Obtener configuración del usuario (límite diario de horas)
export const getConfig = async () => {
  const { data } = await apiClient.get("configuracion/");
  return data;
};

// Actualizar configuración del usuario (límite diario de horas)
export const updateConfig = async (dailyHoursLimit) => {
  const { data } = await apiClient.put("configuracion/", {
    daily_hours_limit: dailyHoursLimit,
  });
  return data;
};
