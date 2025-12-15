import axios from 'axios';

const raw = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001/api');
const API_BASE_URL = raw.endsWith('/api') ? raw : `${raw}/api`;

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Request interceptor for adding the bearer token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;





