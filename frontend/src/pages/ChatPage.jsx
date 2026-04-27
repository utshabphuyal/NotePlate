import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, Loader2, Search, Send, ArrowLeft } from 'lucide-react';
import { chatService } from '../services/api';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';

function ChatRoom({ roomId }) {
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [room, setRoom] = useState(null);
  const navigate = useNavigate();
  const bottomRef = useRef();
  const wsRef = useRef();

  useEffect(() => {
    chatService.getRooms().then(r => {
      const rooms = r.data?.results || r.data || [];
      const found = rooms.find(rm => rm.id === roomId);
      if (found) setRoom(found);
    });
    chatService.getMessages(roomId, { page_size: 50 }).then(r => {
      setMessages((r.data?.results || []));
    }).catch(() => {});

    const token = localStorage.getItem('access_token');
    if (token) {
      const ws = new WebSocket(`${process.env.REACT_APP_WS_URL || 'ws://localhost:8000'}/ws/chat/${roomId}/?token=${token}`);
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'new_message') setMessages(prev => [...prev, data.message]);
        } catch {}
      };
      ws.onerror = () => {};
      wsRef.current = ws;
    }
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'send_message', content, message_type: 'text' }));
      } else {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'}/chat/messages/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ room: roomId, content, message_type: 'text' }),
        });
        if (res.ok) {
          const msg = await res.json();
          setMessages(prev => [...prev, msg]);
        } else {
          toast.error('Failed to send message');
          setInput(content);
        }
      }
    } catch (err) {
      toast.error('Failed to send message');
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const other = room?.other_user;

  // Show blocked screen
 if (room && other?.is_blocked) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-card">
      <div className="text-center p-8">
        <div className="text-5xl mb-4">🚫</div>
        <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-2">User Blocked</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">You have blocked this user. Unblock them to send messages.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/chat')}
            className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors hover:bg-gray-50">
            Back to Messages
          </button>
          <button onClick={async () => {
            try {
             await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'}/users/${other.id}/block/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
              });
              toast.success(`${other.full_name} unblocked!`);
              setRoom(prev => ({ ...prev, other_user: { ...prev.other_user, is_blocked: false } }));
            } catch { toast.error('Failed to unblock'); }
          }}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors">
            Unblock & Message
          </button>
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => navigate('/chat')} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div onClick={() => other?.id && navigate(`/profile/${other.id}`)}
          className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80">
          <span className="text-brand-700 font-semibold text-sm">{other?.full_name?.[0] || '?'}</span>
        </div>
        <div onClick={() => other?.id && navigate(`/profile/${other.id}`)} className="cursor-pointer hover:opacity-80">
          <p className="font-semibold text-sm text-gray-900 dark:text-white hover:text-brand-600">{other?.full_name || 'Chat'}</p>
          {room?.book_title && <p className="text-xs text-gray-500">📚 {room.book_title}</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50 dark:bg-gray-950 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No messages yet. Say hello! 👋</div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.sender?.id === user?.id || msg.sender === user?.id;
          return (
            <div key={msg.id || i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                isOwn ? 'bg-brand-600 text-white rounded-tr-sm' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm rounded-tl-sm'
              }`}>
                <p>{msg.content}</p>
                <p className={`text-xs mt-1 ${isOwn ? 'opacity-70 text-right' : 'opacity-50'}`}>
                  {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <input value={input} onChange={e => setInput(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 border-none" />
        <button type="submit" disabled={!input.trim() || sending}
          className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white transition-colors">
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

export default function ChatPage() {
  const { roomId } = useParams();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn: () => chatService.getRooms().then(r => r.data?.results || r.data || []),
  });

  if (roomId) return <ChatRoom roomId={roomId} />;

  const filtered = (Array.isArray(rooms) ? rooms : []).filter(r =>
    !search || r.other_user?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search conversations…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl">
          <MessageCircle className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-gray-400">No messages yet</h3>
          <p className="text-gray-400 mt-1">Go to People tab and message someone!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(room => (
            <button key={room.id} onClick={() => navigate(`/chat/${room.id}`)}
              className="w-full flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-card text-left hover:shadow-card-hover transition-all">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-700 font-semibold">{room.other_user?.full_name?.[0] || '?'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{room.other_user?.full_name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {room.other_user?.is_blocked ? '🚫 Blocked' : room.last_message_preview || 'No messages yet'}
                </p>
              </div>
              {room.unread_count > 0 && (
                <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center">
                  {room.unread_count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}