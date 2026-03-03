import apiClient from "../axiosClient";

// POST /api/auth/register/
export const register = async (payload) => {
  const { data } = await apiClient.post("auth/register/", payload);
  return data;
};

// POST /api/auth/token/
export const login = async (email, password) => {
  const { data } = await apiClient.post("auth/token/", {
    email,
    password,
  });
  // data: { access, refresh, ... } (payload del token incluye email y name)
  return data;
};

// POST /api/auth/token/refresh/
export const refreshToken = async (refresh) => {
  const { data } = await apiClient.post("auth/token/refresh/", { refresh });
  return data;
};

