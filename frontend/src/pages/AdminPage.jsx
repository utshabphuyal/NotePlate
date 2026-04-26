import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, BookOpen, RotateCcw, AlertTriangle, Shield,
  TrendingUp, Ban, Trash2, CheckCircle, XCircle, Loader2, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '../services/api';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-card">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      {sub && <p className="text-xs text-brand-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function UsersTab() {
  const [search, setSearch] = useState('');
  const [banUserId, setBanUserId] = useState(null);
  const [banReason, setBanReason] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => adminService.listUsers({ search: search || undefined, page_size: 30 }).then(r => r.data),
  });

  const banMutation = useMutation({
    mutationFn: ({ id, reason }) => adminService.banUser(id, { reason }),
    onSuccess: () => { toast.success('User banned.'); setBanUserId(null); setBanReason(''); qc.invalidateQueries(['admin-users']); },
    onError: () => toast.error('Failed to ban user'),
  });

  const unbanMutation = useMutation({
    mutationFn: (id) => adminService.unbanUser(id),
    onSuccess: () => { toast.success('User unbanned.'); qc.invalidateQueries(['admin-users']); },
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Lent / Borrowed</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.results?.map(u => (
                <tr key={u.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{u.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.role === 'admin' ? 'bg-red-100 text-red-700' : u.role === 'library' ? 'bg-blue-100 text-blue-700' : 'bg-brand-100 text-brand-700'
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-400">
                    {u.total_lent} / {u.total_borrowed}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_banned ? (
                      <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                        <Ban className="w-3.5 h-3.5" /> Banned
                      </span>
                    ) : (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.is_banned ? (
                      <button onClick={() => unbanMutation.mutate(u.id)} disabled={unbanMutation.isPending}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium">Unban</button>
                    ) : u.role !== 'admin' && (
                      <div>
                        {banUserId === u.id ? (
                          <div className="flex items-center gap-2">
                            <input value={banReason} onChange={e => setBanReason(e.target.value)}
                              placeholder="Reason…" className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 w-28 focus:outline-none" />
                            <button onClick={() => banMutation.mutate({ id: u.id, reason: banReason })}
                              className="text-xs text-red-600 font-medium hover:text-red-700">Confirm</button>
                            <button onClick={() => setBanUserId(null)} className="text-xs text-gray-400">×</button>
                          </div>
                        ) : (
                          <button onClick={() => setBanUserId(u.id)}
                            className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1 ml-auto">
                            <Ban className="w-3.5 h-3.5" /> Ban
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReportsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => adminService.getReports({ page_size: 30 }).then(r => r.data),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, action }) => adminService.resolveReport(id, { action }),
    onSuccess: () => { toast.success('Report resolved.'); qc.invalidateQueries(['admin-reports']); },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>;

  return (
    <div className="space-y-3">
      {!data?.results?.length ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-card">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No pending reports</p>
        </div>
      ) : data.results.map(r => (
        <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium capitalize">{r.reason}</span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                <span className="text-brand-600">{r.reporter.username}</span> reported <span className="text-brand-600">{r.reported.username}</span>
              </p>
              {r.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{r.description}</p>}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => resolveMutation.mutate({ id: r.id, action: 'resolved' })}
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">
                <CheckCircle className="w-3.5 h-3.5" /> Resolve
              </button>
              <button onClick={() => resolveMutation.mutate({ id: r.id, action: 'dismissed' })}
                className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <XCircle className="w-3.5 h-3.5" /> Dismiss
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
   queryFn: () => adminService.analytics().then(r => r.data),
    enabled: activeTab === 'overview',
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'reports', label: 'Reports', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Platform management</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}>
            <Icon className="w-4 h-4" />{label}
            {id === 'reports' && analytics?.moderation?.total_pending > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {analytics.moderation.total_pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Users" value={analytics?.users?.total || 0} sub={`+${analytics?.users?.new_7d || 0} this week`} color="bg-brand-500" />
<StatCard icon={BookOpen} label="Active Books" value={analytics?.books?.active || 0} sub={`${analytics?.books?.total || 0} total`} color="bg-blue-500" />
<StatCard icon={RotateCcw} label="Active Borrows" value={analytics?.borrowing?.active || 0} sub={`${analytics?.borrowing?.completed || 0} completed`} color="bg-green-500" />
<StatCard icon={AlertTriangle} label="Pending Reports" value={analytics?.moderation?.total_pending || 0} color="bg-red-500" />
            </div>

            {/* Books by type */}
            {analytics?.books?.by_type && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-6">
                <h3 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-4">Books by Type</h3>
                <div className="space-y-3">
                  {analytics.books.by_type.map(({ material_type, count }) => (
                    <div key={material_type} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-24 capitalize">{material_type}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${(count / analytics.books.total) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top cities */}
            {analytics?.books?.top_cities && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-6">
                <h3 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Cities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {analytics.books.top_cities.map(({ city, count }) => (
                    <div key={city} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <p className="font-semibold text-gray-900 dark:text-white text-lg">{count}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{city}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'reports' && <ReportsTab />}
    </div>
  );
}
