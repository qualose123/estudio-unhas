import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token em todas as requisições
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

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  adminLogin: (credentials) => api.post('/auth/admin/login', credentials),
  clientLogin: (credentials) => api.post('/auth/client/login', credentials),
  clientRegister: (data) => api.post('/auth/client/register', data),
  verifyToken: () => api.get('/auth/verify'),
  changePassword: (data) => api.post('/auth/change-password', data)
};

// Services endpoints
export const servicesAPI = {
  getAll: (params) => api.get('/services', { params }),
  getById: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`)
};

// Appointments endpoints
export const appointmentsAPI = {
  getAll: (params) => api.get('/appointments', { params }),
  getById: (id) => api.get(`/appointments/${id}`),
  getAvailableTimes: (params) => api.get('/appointments/available-times', { params }),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  delete: (id) => api.delete(`/appointments/${id}`)
};

// Time blocks endpoints
export const timeBlocksAPI = {
  getAll: (params) => api.get('/time-blocks', { params }),
  getById: (id) => api.get(`/time-blocks/${id}`),
  create: (data) => api.post('/time-blocks', data),
  update: (id, data) => api.put(`/time-blocks/${id}`, data),
  delete: (id) => api.delete(`/time-blocks/${id}`)
};

// Password reset endpoints
export const passwordResetAPI = {
  request: (data) => api.post('/password-reset/request', data),
  confirm: (data) => api.post('/password-reset/confirm', data)
};

export default api;
