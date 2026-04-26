/**
 * NotePlate API Service
 * Centralized axios instance with JWT auth and refresh token logic
 */
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach access token ─────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: handle 401 and refresh ────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        authService.logout();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });
        localStorage.setItem('access_token', data.access);
        api.defaults.headers.common.Authorization = `Bearer ${data.access}`;
        processQueue(null, data.access);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        authService.logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth Service ─────────────────────────────────────────────────────────
export const authService = {
  login: (credentials) => api.post('/auth/login/', credentials),
  register: (data) => api.post('/auth/register/', data),
  logout: () => {
    const refresh = localStorage.getItem('refresh_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    if (refresh) api.post('/auth/logout/', { refresh }).catch(() => {});
    window.location.href = '/login';
  },
  verifyEmail: (token) => api.post('/auth/verify-email/', { token }),
  resendVerification: (email) => api.post('/auth/resend-verification/', { email }),
  forgotPassword: (email) => api.post('/auth/forgot-password/', { email }),
  resetPassword: (data) => api.post('/auth/reset-password/', data),
  refreshToken: (refresh) => api.post('/auth/token/refresh/', { refresh }),
};

// ─── User Service ─────────────────────────────────────────────────────────
export const userService = {
  getMe: () => api.get('/users/me/'),
  updateMe: (data) => api.patch('/users/me/', data),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post('/users/upload_avatar/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  changePassword: (data) => api.post('/users/change_password/', data),
  getUser: (id) => api.get(`/users/${id}/`),
  getUserRatings: (id) => api.get(`/users/${id}/ratings/`),
  rateUser: (id, data) => api.post(`/users/${id}/rate/`, data),
  blockUser: (id) => api.post(`/users/${id}/block/`),
  reportUser: (id, data) => api.post(`/users/${id}/report/`, data),
  getBlockedUsers: () => api.get('/users/blocked_users/'),
};

// ─── Books Service ────────────────────────────────────────────────────────
export const bookService = {
  list: (params) => api.get('/books/', { params }),
  get: (id) => api.get(`/books/${id}/`),
  create: (data) => {
    const form = new FormData();
    Object.entries(data).forEach(([key, val]) => {
      if (key === 'images') {
        val.forEach((img) => form.append('images', img));
      } else if (Array.isArray(val)) {
        form.append(key, JSON.stringify(val));
      } else if (val !== null && val !== undefined) {
        form.append(key, val);
      }
    });
    return api.post('/books/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  update: (id, data) => api.patch(`/books/${id}/`, data),
  delete: (id) => api.delete(`/books/${id}/`),
  nearby: (params) => api.get('/books/nearby/', { params }),
  mapData: (params) => api.get('/books/map_data/', { params }),
  recommended: () => api.get('/books/recommended/'),
  saveBook: (id) => api.post(`/books/${id}/save_book/`),
  getSaved: () => api.get('/books/saved/'),
  reportBook: (id, data) => api.post(`/books/${id}/report/`, data),
  getQRCode: (id) => api.get(`/books/${id}/qr_code/`),
};

// ─── Chat Service ─────────────────────────────────────────────────────────
export const chatService = {
  getRooms: () => api.get('/chat/rooms/'),
  startChat: (data) => api.post('/chat/rooms/start/', data),
  getMessages: (roomId, params) => api.get(`/chat/rooms/${roomId}/messages/`, { params }),
  getUnreadCount: (roomId) => api.get(`/chat/rooms/${roomId}/unread_count/`),
  deleteMessage: (msgId) => api.delete(`/chat/messages/${msgId}/`),
  uploadFile: (roomId, file) => {
    const form = new FormData();
    form.append('file', file);
    form.append('room', roomId);
    form.append('message_type', 'file');
    return api.post('/chat/messages/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ─── Borrow Service ───────────────────────────────────────────────────────
export const borrowService = {
  list: (params) => api.get('/borrowing/', { params }),
  get: (id) => api.get(`/borrowing/${id}/`),
  create: (data) => api.post('/borrowing/', data),
  accept: (id) => api.post(`/borrowing/${id}/accept/`),
  reject: (id, data) => api.post(`/borrowing/${id}/reject/`, data),
  confirmHandover: (id, data) => api.post(`/borrowing/${id}/confirm_handover/`, data),
  confirmReturn: (id, data) => api.post(`/borrowing/${id}/confirm_return/`, data),
  cancel: (id) => api.post(`/borrowing/${id}/cancel/`),
  requestExtension: (id, data) => api.post(`/borrowing/${id}/request_extension/`, data),
};

// ─── Notification Service ─────────────────────────────────────────────────
export const notificationService = {
  list: (params) => api.get('/notifications/', { params }),
  unreadCount: () => api.get('/notifications/unread_count/'),
  markRead: (id) => api.post(`/notifications/${id}/mark_read/`),
  markAllRead: () => api.post('/notifications/mark_all_read/'),
};

// ─── Library Service ──────────────────────────────────────────────────────
export const libraryService = {
  list: (params) => api.get('/library/libraries/', { params }),
  get: (id) => api.get(`/library/libraries/${id}/`),
  getInventory: (params) => api.get('/library/inventory/', { params }),
  reserve: (data) => api.post('/library/reservations/', data),
  getMyReservations: () => api.get('/library/reservations/'),
  cancelReservation: (id) => api.post(`/library/reservations/${id}/cancel/`),
};

// ─── Admin Service ────────────────────────────────────────────────────────
export const adminService = {
  analytics: () => api.get('/admin-panel/analytics/'),
  listUsers: (params) => api.get('/admin-panel/users/', { params }),
  banUser: (id, data) => api.post(`/admin-panel/users/${id}/ban/`, data),
  unbanUser: (id) => api.post(`/admin-panel/users/${id}/unban/`),
  removeBook: (id, data) => api.delete(`/admin-panel/books/${id}/remove/`, { data }),
  getReports: (params) => api.get('/admin-panel/reports/', { params }),
  resolveReport: (id, data) => api.post(`/admin-panel/reports/${id}/resolve/`, data),
};

export default api;
