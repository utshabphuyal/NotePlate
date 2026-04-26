import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Auth Store ────────────────────────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      updateUser: (updates) => set(state => ({ user: { ...state.user, ...updates } })),
      clearUser: () => set({ user: null, isAuthenticated: false }),

      login: async (credentials) => {
  const { authService } = await import('../services/api');
  const response = await authService.login(credentials);
  const data = response.data;
  console.log('LOGIN DATA:', JSON.stringify(data));
  localStorage.setItem('access_token', data.access);
  localStorage.setItem('refresh_token', data.refresh);
  const user = data.user || data;
  set({ user: user, isAuthenticated: true });
  return data;
},

      logout: async () => {
        const { authService } = await import('../services/api');
        authService.logout();
        set({ user: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const { userService } = await import('../services/api');
          const res = await userService.getMe();
          set({ user: res.data, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// ── UI Store ──────────────────────────────────────────────────────────────────
export const useUIStore = create((set) => ({
  darkMode: false,
  toggleDarkMode: () => set(state => {
    const next = !state.darkMode;
    document.documentElement.classList.toggle('dark', next);
    return { darkMode: next };
  }),
}));

// ── Notification Store ────────────────────────────────────────────────────────
export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  ws: null,

  setUnreadCount: (count) => set({ unreadCount: count }),
  addNotification: (n) => set(state => ({
    notifications: [n, ...state.notifications],
    unreadCount: state.unreadCount + 1,
  })),
  markAllRead: () => set(state => ({
    notifications: state.notifications.map(n => ({ ...n, is_read: true })),
    unreadCount: 0,
  })),

  connectWS: (token) => {
    try {
      const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:8000'}/ws/notifications/?token=${token}`;
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification') get().addNotification(data.notification);
          else if (data.type === 'unread_count') set({ unreadCount: data.count });
        } catch {}
      };
      ws.onerror = () => {};
      ws.onclose = () => {};
      set({ ws });
    } catch(e) {
      console.log('Notifications WS not available');
    }
  },

  disconnectWS: () => {
    const { ws } = get();
    if (ws) try { ws.close(); } catch {}
    set({ ws: null });
  },
}));

// ── Chat Store ────────────────────────────────────────────────────────────────
export const useChatStore = create((set, get) => ({
  rooms: [],
  activeRoom: null,
  messages: {},
  typingUsers: {},
  ws: null,
  totalUnread: 0,

  setRooms: (rooms) => {
    const totalUnread = rooms.reduce((sum, r) => sum + (r.unread_count || 0), 0);
    set({ rooms, totalUnread });
  },
  setActiveRoom: (room) => set({ activeRoom: room }),
  addMessage: (roomId, message) => set(state => ({
    messages: { ...state.messages, [roomId]: [...(state.messages[roomId] || []), message] },
  })),
  setMessages: (roomId, messages) => set(state => ({
    messages: { ...state.messages, [roomId]: messages },
  })),
  markRoomRead: (roomId) => set(state => ({
    rooms: state.rooms.map(r => r.id === roomId ? { ...r, unread_count: 0 } : r),
  })),
  setTyping: (roomId, userId, isTyping) => set(state => ({
    typingUsers: { ...state.typingUsers, [roomId]: { ...(state.typingUsers[roomId] || {}), [userId]: isTyping } },
  })),

  connectRoomWS: (roomId, token) => {
    const { ws } = get();
    if (ws) try { ws.close(); } catch {}
    try {
      const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:8000'}/ws/chat/${roomId}/?token=${token}`;
      const newWs = new WebSocket(wsUrl);
      newWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const store = get();
          if (data.type === 'new_message') store.addMessage(roomId, data.message);
          else if (data.type === 'typing') store.setTyping(roomId, data.user_id, data.is_typing);
        } catch {}
      };
      newWs.onerror = () => {};
      set({ ws: newWs });
      return newWs;
    } catch(e) {
      console.log('Chat WS not available');
      return null;
    }
  },

  sendMessage: (content, messageType = 'text') => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'send_message', content, message_type: messageType }));
    }
  },

  sendTyping: (isTyping) => {
    const { ws } = get();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'typing', is_typing: isTyping }));
    }
  },

  disconnectWS: () => {
    const { ws } = get();
    if (ws) try { ws.close(); } catch {}
    set({ ws: null });
  },
}));