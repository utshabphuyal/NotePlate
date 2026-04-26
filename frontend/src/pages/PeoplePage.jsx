import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, MessageCircle, BookOpen, Star, MapPin, Loader2, Users } from 'lucide-react';
import { chatService } from '../services/api';
import toast from 'react-hot-toast';

export default function PeoplePage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const navigate = useNavigate();
  const timerRef = React.useRef();

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const { data: users, isLoading } = useQuery({
    queryKey: ['users-search', debouncedSearch],
    queryFn: () => fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'}/users/?search=${debouncedSearch}&page_size=20`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    }).then(r => r.json()).then(d => d.results || d),
    enabled: true,
  });

  const handleMessage = async (userId) => {
    try {
      const res = await chatService.startChat({ user_id: userId });
      navigate(`/chat/${res.data.id}`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not start chat';
      toast.error(msg);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">People</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Find students and message them directly</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search by name, username, or university…"
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      ) : !users?.length ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-card">
          <Users className="w-14 h-14 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-gray-400 dark:text-gray-600">No users found</h3>
          <p className="text-gray-400 dark:text-gray-600 mt-1">Try searching by name or university</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(user => (
            <div key={user.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all flex items-center gap-4">
              <div onClick={() => navigate(`/profile/${user.id}`)} className="cursor-pointer flex-shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-14 h-14 rounded-2xl object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                    <span className="text-2xl font-display font-bold text-white">{user.full_name?.[0]}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${user.id}`)}>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{user.full_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    user.role === 'library' ? 'bg-blue-100 text-blue-700' : 'bg-brand-100 text-brand-700'
                  }`}>{user.role}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                  {user.school_college && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      🎓 {user.school_college}
                    </span>
                  )}
                  {user.city && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {user.city}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> {user.total_lent} lent
                  </span>
                  <span className="text-xs text-amber-500 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400" /> {(user.average_rating || 0).toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {!user.is_blocked && (
                  <button
                    onClick={() => handleMessage(user.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" /> Message
                  </button>
                )}
                {user.is_blocked && (
                  <span className="text-xs text-red-500 font-medium px-3 py-2">Blocked</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}