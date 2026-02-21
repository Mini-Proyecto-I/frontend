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
    timeout: 10000,
});

export default apiClient;
