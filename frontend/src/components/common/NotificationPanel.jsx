import React from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, BookOpen, MessageCircle, RotateCcw, Star, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { notificationService } from '../../services/api';
import { useNotificationStore } from '../../store';
import { useNavigate } from 'react-router-dom';

const NOTIF_ICONS = {
  borrow_request:   { icon: RotateCcw, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  request_accepted: { icon: CheckCheck, color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
  request_rejected: { icon: BookOpen, color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  new_message:      { icon: MessageCircle, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  rating_received:  { icon: Star, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
  system:           { icon: Bell, color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
};

export default function NotificationPanel({ onClose }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { markAllRead: markAllInStore } = useNotificationStore();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getAll({ page_size: 20 }).then(r => r.data),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => { markAllInStore(); qc.invalidateQueries(['notifications']); },
  });

  const markOneMutation = useMutation({
    mutationFn: (id) => notificationService.markRead(id),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const handleClick = (notif) => {
    if (!notif.is_read) markOneMutation.mutate(notif.id);
    const data = notif.data || {};
    if (data.room_id) { navigate(`/chat/${data.room_id}`); onClose(); }
    else if (data.borrow_request_id) { navigate('/borrows'); onClose(); }
    else if (data.book_id) { navigate(`/books/${data.book_id}`); onClose(); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-floating border border-gray-100 dark:border-gray-800 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-display text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
        <button onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}
          className="text-xs text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50">
          Mark all read
        </button>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
        ) : !data?.results?.length ? (
          <div className="text-center py-12">
            <Bell className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-600">No notifications yet</p>
          </div>
        ) : data.results.map(notif => {
          const cfg = NOTIF_ICONS[notif.notification_type] || NOTIF_ICONS.system;
          const Icon = cfg.icon;
          return (
            <button key={notif.id} onClick={() => handleClick(notif)}
              className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors border-b border-gray-50 dark:border-gray-800 ${
                !notif.is_read ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''
              }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm leading-tight ${!notif.is_read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {notif.title}
                  </p>
                  {!notif.is_read && <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-1" />}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notif.body}</p>
                <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
