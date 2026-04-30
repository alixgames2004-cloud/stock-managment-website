import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Request interceptor: attach JWT token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle expired/invalid token globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isLab3 = window.location.pathname.startsWith('/lab3');
      const lab = isLab3 ? 'lab3' : 'lab1';

      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (!window.location.pathname.includes('/login')) {
        window.location.href = `/${lab}/login`;
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (lab, body) => api.post(`/auth/${lab}/login`, body),
  register: (lab, body) => api.post(`/auth/${lab}/register`, body),
  me: () => api.get('/auth/me'),
};

export default api;
