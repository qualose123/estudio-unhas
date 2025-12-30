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
    // Apenas redirecionar para login se for erro 401 em rotas autenticadas
    // Não redirecionar em erros de login/registro (credenciais inválidas)
    const isAuthEndpoint = error.config?.url?.includes('/auth/admin/login') ||
                          error.config?.url?.includes('/auth/client/login') ||
                          error.config?.url?.includes('/auth/client/register');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Token inválido/expirado - redirecionar para login
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

// Gallery endpoints
export const galleryAPI = {
  getAll: (params) => api.get('/gallery', { params }),
  getById: (id) => api.get(`/gallery/${id}`),
  create: (formData) => api.post('/gallery', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, data) => api.put(`/gallery/${id}`, data),
  delete: (id) => api.delete(`/gallery/${id}`),
  like: (id) => api.post(`/gallery/${id}/like`),
  incrementViews: (id) => api.post(`/gallery/${id}/view`)
};

// Reviews endpoints
export const reviewsAPI = {
  getAll: (params) => api.get('/reviews', { params }),
  getById: (id) => api.get(`/reviews/${id}`),
  create: (data) => api.post('/reviews', data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
  respond: (id, data) => api.post(`/reviews/${id}/respond`, data),
  getStats: () => api.get('/reviews/stats')
};

// Coupons endpoints
export const couponsAPI = {
  getAll: (params) => api.get('/coupons', { params }),
  getById: (id) => api.get(`/coupons/${id}`),
  validate: (code) => api.post('/coupons/validate', { code }),
  create: (data) => api.post('/coupons', data),
  update: (id, data) => api.put(`/coupons/${id}`, data),
  delete: (id) => api.delete(`/coupons/${id}`)
};

// Waitlist endpoints
export const waitlistAPI = {
  getAll: (params) => api.get('/waitlist', { params }),
  getById: (id) => api.get(`/waitlist/${id}`),
  create: (data) => api.post('/waitlist', data),
  notify: (id) => api.post(`/waitlist/${id}/notify`),
  cancel: (id) => api.delete(`/waitlist/${id}`)
};

// Recurring appointments endpoints
export const recurringAPI = {
  getAll: (params) => api.get('/recurring-appointments', { params }),
  getById: (id) => api.get(`/recurring-appointments/${id}`),
  create: (data) => api.post('/recurring-appointments', data),
  update: (id, data) => api.put(`/recurring-appointments/${id}`, data),
  delete: (id) => api.delete(`/recurring-appointments/${id}`),
  activate: (id) => api.post(`/recurring-appointments/${id}/activate`),
  deactivate: (id) => api.post(`/recurring-appointments/${id}/deactivate`)
};

// Professionals endpoints
export const professionalsAPI = {
  getAll: (params) => api.get('/professionals', { params }),
  getById: (id) => api.get(`/professionals/${id}`),
  create: (data) => api.post('/professionals', data),
  update: (id, data) => api.put(`/professionals/${id}`, data),
  delete: (id) => api.delete(`/professionals/${id}`),
  getCommissions: (id, params) => api.get(`/professionals/${id}/commissions`, { params })
};

// Commissions endpoints
export const commissionsAPI = {
  getAll: (params) => api.get('/commissions', { params }),
  getById: (id) => api.get(`/commissions/${id}`),
  markAsPaid: (id) => api.put(`/commissions/${id}/paid`),
  getSummary: (params) => api.get('/commissions/summary', { params })
};

// Dashboard endpoints
export const dashboardAPI = {
  getStats: (params) => api.get('/dashboard/stats', { params }),
  getFinancialReport: (params) => api.get('/dashboard/financial-report', { params }),
  getUpcomingAppointments: (params) => api.get('/dashboard/upcoming-appointments', { params })
};

// Chat endpoints
export const chatAPI = {
  getHistory: (params) => api.get('/chat/history', { params }),
  getConversations: () => api.get('/chat/conversations'),
  markAsRead: (data) => api.post('/chat/mark-read', data),
  deleteHistory: (clientId) => api.delete(`/chat/history/${clientId}`)
};

// WhatsApp endpoints
export const whatsappAPI = {
  getStatus: () => api.get('/whatsapp/status'),
  sendTest: (data) => api.post('/whatsapp/test', data)
};

export default api;
