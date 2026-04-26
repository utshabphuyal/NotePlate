/**
 * NotePlate Auth Store — Zustand
 */
import { create } from 'zustand';
import { authService, userService } from '../services/api';
import { notifWS } from '../services/websocket';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  unreadNotifications: 0,

  init: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const { data } = await userService.getMe();
      set({ user: data, isAuthenticated: true, isLoading: false });
      notifWS.connect();
      notifWS.on('unread_count', ({ count }) => {
        set({ unreadNotifications: count });
      });
      notifWS.on('notification', () => {
        set((s) => ({ unreadNotifications: s.unreadNotifications + 1 }));
      });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ isLoading: false });
    }
  },

  login: async (credentials) => {
    const { data } = await authService.login(credentials);
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    set({ user: data.user, isAuthenticated: true });
    notifWS.connect();
    return data;
  },

  logout: () => {
    notifWS.disconnect();
    authService.logout();
    set({ user: null, isAuthenticated: false, unreadNotifications: 0 });
  },

  updateUser: (updates) => set((s) => ({ user: { ...s.user, ...updates } })),

  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
  decrementUnread: () => set((s) => ({
    unreadNotifications: Math.max(0, s.unreadNotifications - 1)
  })),
}));

export const useThemeStore = create((set) => ({
  isDark: localStorage.getItem('theme') === 'dark',
  toggle: () => set((s) => {
    const next = !s.isDark;
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    return { isDark: next };
  }),
  init: () => {
    const isDark = localStorage.getItem('theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    set({ isDark });
  },
}));
