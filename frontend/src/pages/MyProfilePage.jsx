import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Star, BookOpen, RotateCcw, Shield, Edit3, Camera, MapPin, School,
  Globe, Phone, Loader2, Check, X, Ban, MessageCircle, Flag
} from 'lucide-react';
import { userService, bookService, chatService } from '../services/api';
import { useAuthStore } from '../store';
import BookCard from '../components/books/BookCard';
import { useNavigate } from 'react-router-dom';

function StatBadge({ icon: Icon, label, value, color }) {
  return (
    <div className={`flex flex-col items-center p-4 rounded-xl ${color}`}>
      <Icon className="w-5 h-5 mb-1 opacity-70" />
      <span className="text-2xl font-display font-bold">{value}</span>
      <span className="text-xs opacity-70 mt-0.5">{label}</span>
    </div>
  );
}

export function ProfilePage() {
  const { id } = useParams();
  const { user: me } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isBlocked, setIsBlocked] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => userService.getUser(id).then(r => {
      setIsBlocked(r.data.is_blocked || false);
      return r.data;
    }),
  });

  const { data: ratings } = useQuery({
    queryKey: ['user-ratings', id],
    queryFn: () => userService.getUserRatings(id).then(r => r.data),
  });

  const { data: books } = useQuery({
    queryKey: ['user-books', id],
    queryFn: () => bookService.getBooks({ owner: id, page_size: 8 }).then(r => r.data),
  });

  const blockMutation = useMutation({
    mutationFn: () => userService.blockUser(id),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setIsBlocked(prev => !prev);
    },
  });

  const handleChat = async () => {
    try {
      const res = await chatService.startChat({ user_id: id });
      navigate(`/chat/${res.data.id}`);
    } catch { toast.error('Could not start chat'); }
  };

 const handleReport = async () => {
  const options = [
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'fake_profile', label: 'Fake Profile' },
    { value: 'inappropriate_content', label: 'Inappropriate Content' },
    { value: 'other', label: 'Other' },
  ];
  
  // Create a simple modal
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999';
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:24px;width:90%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      <h3 style="font-size:18px;font-weight:700;margin:0 0 8px;color:#111">Report User</h3>
      <p style="font-size:14px;color:#6b7280;margin:0 0 16px">Why are you reporting this user?</p>
      <select id="report-reason" style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;margin-bottom:12px;outline:none">
        ${options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
      </select>
      <textarea id="report-desc" placeholder="Additional details (optional)" style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;resize:none;height:80px;margin-bottom:16px;outline:none;box-sizing:border-box"></textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="report-cancel" style="padding:8px 16px;border:1px solid #e5e7eb;border-radius:8px;background:white;font-size:14px;cursor:pointer">Cancel</button>
        <button id="report-submit" style="padding:8px 16px;border:none;border-radius:8px;background:#dc2626;color:white;font-size:14px;font-weight:600;cursor:pointer">Submit Report</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  return new Promise((resolve) => {
    document.getElementById('report-cancel').onclick = () => {
      document.body.removeChild(modal);
      resolve();
    };
    document.getElementById('report-submit').onclick = async () => {
      const reason = document.getElementById('report-reason').value;
      const description = document.getElementById('report-desc').value || reason;
      document.body.removeChild(modal);
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`http://localhost:8000/api/v1/users/${id}/report/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ reason, description, reported: id }),
        });
        if (res.ok) {
          toast.success('Report submitted. We will review it.');
        } else {
          const err = await res.json();
          toast.error(Object.values(err)[0] || 'Failed to submit report');
        }
      } catch {
        toast.error('Failed to submit report');
      }
      resolve();
    };
  });
};

  if (isLoading) return (
    <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
  );
  if (!profile) return <div className="text-center py-20 text-gray-400">User not found</div>;

  const isMe = me?.id === profile.id;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-brand-500 to-brand-700" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-14 mb-4">
            <div className="relative">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-24 h-24 rounded-2xl object-cover border-4 border-white dark:border-gray-800 shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-brand-100 dark:bg-brand-900 border-4 border-white dark:border-gray-800 shadow-lg flex items-center justify-center">
                  <span className="text-4xl font-display font-bold text-brand-600 dark:text-brand-300">{profile.full_name?.[0]}</span>
                </div>
              )}
            </div>
            {!isMe && (
              <div className="flex gap-2 pb-1 flex-wrap justify-end">
                {!isBlocked && (
                  <button onClick={handleChat}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
                    <MessageCircle className="w-4 h-4" /> Message
                  </button>
                )}
                <button onClick={() => blockMutation.mutate()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    isBlocked
                      ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                  <Ban className="w-4 h-4" /> {isBlocked ? 'Unblock' : 'Block'}
                </button>
                <button onClick={handleReport}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Flag className="w-4 h-4" /> Report
                </button>
              </div>
            )}
            {isMe && (
              <Link to="/profile" className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors pb-1">
                <Edit3 className="w-4 h-4" /> Edit Profile
              </Link>
            )}
          </div>

          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">{profile.full_name}</h1>
          <p className="text-gray-500 dark:text-gray-400">@{profile.username}</p>

          {profile.bio && <p className="mt-3 text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{profile.bio}</p>}

          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-sm text-gray-500 dark:text-gray-400">
            {profile.school_college && (
              <span className="flex items-center gap-1.5"><School className="w-4 h-4" />{profile.school_college}</span>
            )}
            {profile.city && (
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{profile.city}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBadge icon={BookOpen} label="Books Lent" value={profile.total_lent} color="bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300" />
        <StatBadge icon={RotateCcw} label="Borrowed" value={profile.total_borrowed} color="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" />
        <StatBadge icon={Star} label="Avg Rating" value={`${(profile.average_rating || 0).toFixed(1)}★`} color="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300" />
        <StatBadge icon={Shield} label="Reputation" value={profile.reputation_score} color="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300" />
      </div>

      {books?.results?.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Listings by {profile.full_name}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.results.map(book => <BookCard key={book.id} book={book} />)}
          </div>
        </div>
      )}

      {ratings?.results?.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Reviews ({ratings.count})
          </h2>
          <div className="space-y-3">
            {ratings.results.map(r => (
              <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-card">
                <div className="flex items-center gap-3 mb-2">
                  {r.reviewer.avatar_url ? (
                    <img src={r.reviewer.avatar_url} alt={r.reviewer.full_name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
                      <span className="text-brand-700 font-semibold text-sm">{r.reviewer.full_name?.[0]}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{r.reviewer.full_name}</p>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-700'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                {r.comment && <p className="text-sm text-gray-600 dark:text-gray-400">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyProfilePage() {
  const { user, updateUser } = useAuthStore();
  const qc = useQueryClient();
  const fileRef = useRef();
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      full_name: user?.full_name || '',
      bio: user?.bio || '',
      school_college: user?.school_college || '',
      city: user?.city || '',
      address: user?.address || '',
      phone: user?.phone || '',
      website: user?.website || '',
    }
  });

  const onSubmit = async (data) => {
    try {
      const res = await userService.updateMe(data);
      updateUser(res.data);
      toast.success('Profile updated!');
      setEditMode(false);
    } catch {
      toast.error('Update failed. Please try again.');
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await userService.uploadAvatar(file);
      updateUser({ avatar_url: res.data.avatar_url });
      toast.success('Avatar updated!');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const { data: myBooks } = useQuery({
    queryKey: ['my-books'],
    queryFn: () => bookService.getBooks({ owner: user?.id, page_size: 8 }).then(r => r.data),
    enabled: !!user?.id,
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <button onClick={() => setEditMode(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            editMode ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            : 'bg-brand-600 hover:bg-brand-700 text-white'
          }`}>
          {editMode ? <><X className="w-4 h-4" /> Cancel</> : <><Edit3 className="w-4 h-4" /> Edit</>}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <input type="file" ref={fileRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
                <span className="text-3xl font-display font-bold text-brand-600 dark:text-brand-300">{user?.full_name?.[0]}</span>
              </div>
            )}
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg hover:bg-brand-700 transition-colors">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">{user?.full_name}</h2>
            <p className="text-gray-500 dark:text-gray-400">@{user?.username}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                user?.role === 'admin' ? 'bg-red-100 text-red-700' : user?.role === 'library' ? 'bg-blue-100 text-blue-700' : 'bg-brand-100 text-brand-700'
              }`}>
                {user?.role}
              </span>
              {user?.email_verified && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <Check className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
          <div className="text-center">
            <p className="font-display text-xl font-bold text-brand-600">{user?.total_lent}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Books Lent</p>
          </div>
          <div className="text-center">
            <p className="font-display text-xl font-bold text-blue-600">{user?.total_borrowed}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Borrowed</p>
          </div>
          <div className="text-center">
            <p className="font-display text-xl font-bold text-amber-500">{(user?.average_rating || 0).toFixed(1)}★</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.rating_count} ratings</p>
          </div>
        </div>
      </div>

      {editMode ? (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Full Name</label>
                <input {...register('full_name')} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">City</label>
                <input {...register('city')} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Bio</label>
              <textarea {...register('bio')} rows={3} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">College / University</label>
              <input {...register('school_college')} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={isSubmitting}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Changes
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-6 space-y-3">
          {[
            { icon: School, label: 'College', value: user?.school_college },
            { icon: MapPin, label: 'City', value: user?.city },
            { icon: Phone, label: 'Phone', value: user?.phone },
            { icon: Globe, label: 'Website', value: user?.website },
          ].filter(f => f.value).map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-500 dark:text-gray-400 w-16">{label}</span>
              <span className="text-gray-900 dark:text-white">{value}</span>
            </div>
          ))}
          {user?.bio && (
            <p className="text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">{user.bio}</p>
          )}
        </div>
      )}

      {myBooks?.results?.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white mb-4">My Listings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myBooks.results.map(book => <BookCard key={book.id} book={book} />)}
          </div>
        </div>
      )}
    </div>
  );
}