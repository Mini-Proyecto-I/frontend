import axios from "axios";

// Django expone las rutas bajo /api/
let API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

if (API_BASE_URL && !API_BASE_URL.endsWith("/api")) {
  API_BASE_URL = API_BASE_URL.replace(/\/?$/, "") + "/api";
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// =============================
// REQUEST INTERCEPTOR (JWT)
// =============================
apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("accessToken");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// =============================
// RESPONSE INTERCEPTOR
// (Refresh + manejo de errores)
// =============================

let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, newToken = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(newToken);
    }
  });
  pendingQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;

    // =============================
    // Manejo error 500 amigable
    // =============================
    if (status === 500) {
      const friendlyError = new Error(
        "Ups! Hubo un error en el servidor, intenta más tarde."
      );
      friendlyError.response = error.response;
      friendlyError.request = error.request;
      friendlyError.config = error.config;
      friendlyError.isAxiosError = true;
      return Promise.reject(friendlyError);
    }

    // =============================
    // Si no es 401 o ya reintentamos
    // =============================
    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = window.localStorage.getItem("refreshToken");
    if (!refreshToken) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // =============================
    // Si ya hay refresh en curso
    // =============================
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            if (!token) {
              reject(error);
              return;
            }
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const base = API_BASE_URL.replace(/\/api\/?$/, "");

      const { data } = await axios.post(
        `${base}/api/auth/token/refresh/`,
        { refresh: refreshToken },
        { headers: { "Content-Type": "application/json" } }
      );

      const newAccess = data.access;

      window.localStorage.setItem("accessToken", newAccess);

      processQueue(null, newAccess);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);

      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("refreshToken");

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;