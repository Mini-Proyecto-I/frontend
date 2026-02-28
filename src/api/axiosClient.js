import axios from 'axios';

// Django expone las rutas bajo /api/ (course, activity, subtask, reprogramming_log)
let API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
if (API_BASE_URL && !API_BASE_URL.endsWith("/api")) {
  API_BASE_URL = API_BASE_URL.replace(/\/?$/, "") + "/api";
}

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para manejar errores de respuesta
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Si es un error 500 del servidor, mostrar mensaje amigable
        if (error.response && error.response.status === 500) {
            // Crear un error personalizado con mensaje amigable
            const friendlyError = new Error("Ups! Hubo un error en la red, intenta más tarde!");
            friendlyError.response = error.response;
            friendlyError.request = error.request;
            friendlyError.config = error.config;
            friendlyError.isAxiosError = true;
            return Promise.reject(friendlyError);
        }
        // Para otros errores, devolver el error original
        return Promise.reject(error);
    }
);

export default apiClient;
