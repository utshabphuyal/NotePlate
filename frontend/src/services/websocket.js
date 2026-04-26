/**
 * NotePlate WebSocket Service
 * Manages chat and notification WebSocket connections
 */

const WS_BASE = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

class WebSocketManager {
  constructor() {
    this.connections = new Map();
    this.listeners = new Map();
    this.reconnectTimers = new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
  }

  getToken() {
    return localStorage.getItem('access_token') || '';
  }

  connect(key, path) {
    if (this.connections.get(key)?.readyState === WebSocket.OPEN) return;

    const token = this.getToken();
    if (!token) return;

    const url = `${WS_BASE}${path}?token=${token}`;
    const ws = new WebSocket(url);
    let attempts = 0;

    ws.onopen = () => {
      console.log(`[WS] Connected: ${key}`);
      attempts = 0;
      this.emit(key, 'connected', {});
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(key, data.type, data);
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    ws.onerror = (error) => {
      console.error(`[WS] Error: ${key}`, error);
      this.emit(key, 'error', { error });
    };

    ws.onclose = (event) => {
      console.log(`[WS] Closed: ${key}`, event.code);
      this.emit(key, 'disconnected', { code: event.code });

      // Auto-reconnect unless explicitly closed or auth error
      if (event.code !== 1000 && event.code !== 4001 && event.code !== 4003) {
        if (attempts < this.maxReconnectAttempts) {
          attempts++;
          const delay = this.reconnectDelay * Math.pow(2, attempts - 1);
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${attempts})`);
          const timer = setTimeout(() => this.connect(key, path), delay);
          this.reconnectTimers.set(key, timer);
        }
      }
    };

    this.connections.set(key, ws);
    return ws;
  }

  disconnect(key) {
    const ws = this.connections.get(key);
    if (ws) {
      ws.close(1000, 'Explicit disconnect');
      this.connections.delete(key);
    }
    const timer = this.reconnectTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(key);
    }
  }

  send(key, data) {
    const ws = this.connections.get(key);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  on(key, event, callback) {
    const listenerKey = `${key}:${event}`;
    if (!this.listeners.has(listenerKey)) {
      this.listeners.set(listenerKey, new Set());
    }
    this.listeners.get(listenerKey).add(callback);
    return () => this.off(key, event, callback);
  }

  off(key, event, callback) {
    const listenerKey = `${key}:${event}`;
    this.listeners.get(listenerKey)?.delete(callback);
  }

  emit(key, event, data) {
    const listenerKey = `${key}:${event}`;
    this.listeners.get(listenerKey)?.forEach((cb) => cb(data));
  }

  disconnectAll() {
    for (const key of this.connections.keys()) {
      this.disconnect(key);
    }
  }
}

export const wsManager = new WebSocketManager();

// ─── Chat WebSocket ───────────────────────────────────────────────────────
export const chatWS = {
  connect: (roomId) => wsManager.connect(`chat_${roomId}`, `/ws/chat/${roomId}/`),
  disconnect: (roomId) => wsManager.disconnect(`chat_${roomId}`),
  send: (roomId, data) => wsManager.send(`chat_${roomId}`, data),
  on: (roomId, event, cb) => wsManager.on(`chat_${roomId}`, event, cb),
  off: (roomId, event, cb) => wsManager.off(`chat_${roomId}`, event, cb),
  sendMessage: (roomId, content, messageType = 'text', replyToId = null) =>
    wsManager.send(`chat_${roomId}`, {
      type: 'send_message',
      content,
      message_type: messageType,
      reply_to: replyToId,
    }),
  markRead: (roomId, messageIds) =>
    wsManager.send(`chat_${roomId}`, { type: 'mark_read', message_ids: messageIds }),
  setTyping: (roomId, isTyping) =>
    wsManager.send(`chat_${roomId}`, { type: 'typing', is_typing: isTyping }),
};

// ─── Notification WebSocket ───────────────────────────────────────────────
export const notifWS = {
  connect: () => wsManager.connect('notifications', '/ws/notifications/'),
  disconnect: () => wsManager.disconnect('notifications'),
  on: (event, cb) => wsManager.on('notifications', event, cb),
  off: (event, cb) => wsManager.off('notifications', event, cb),
  markRead: (ids) => wsManager.send('notifications', { type: 'mark_read', ids }),
};
