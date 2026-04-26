import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  BookOpen, Clock, CheckCircle, XCircle, RotateCcw, AlertTriangle,
  ChevronDown, Loader2, User, Calendar, Hash
} from 'lucide-react';
import { borrowService } from '../services/api';
import { useAuthStore } from '../store';
import { Link } from 'react-router-dom';

const STATUS_CONFIG = {
  pending:   { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',  icon: Clock,        label: 'Pending' },
  accepted:  { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',      icon: CheckCircle,  label: 'Accepted' },
  active:    { color: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',  icon: RotateCcw,    label: 'Active' },
  returned:  { color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',         icon: CheckCircle,  label: 'Returned' },
  rejected:  { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',          icon: XCircle,      label: 'Rejected' },
  cancelled: { color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',         icon: XCircle,      label: 'Cancelled' },
  overdue:   { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',          icon: AlertTriangle, label: 'Overdue' },
};

function CodeModal({ title, prompt, onConfirm, onClose }) {
  const [code, setCode] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-floating p-6 w-full max-w-sm">
        <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{prompt}</p>
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Enter code" maxLength={8}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-center text-xl font-mono font-bold text-gray-900 dark:text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500 mb-5" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">Cancel</button>
          <button onClick={() => onConfirm(code)} disabled={code.length < 4}
            className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-semibold">Confirm</button>
        </div>
      </motion.div>
    </div>
  );
}

function BorrowCard({ borrow, role }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const [modal, setModal] = useState(null); // 'handover' | 'return' | 'reject'
  const [rejectReason, setRejectReason] = useState('');
  const cfg = STATUS_CONFIG[borrow.status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  const other = role === 'borrower' ? borrow.lender : borrow.borrower;

  const mutation = useMutation({
    mutationFn: (action) => {
      switch (action.type) {
        case 'accept':  return borrowService.acceptRequest(borrow.id);
        case 'reject':  return borrowService.rejectRequest(borrow.id, { reason: rejectReason });
        case 'handover': return borrowService.confirmHandover(borrow.id, action.code);
        case 'return':  return borrowService.confirmReturn(borrow.id, action.code);
        case 'cancel':  return borrowService.cancelRequest(borrow.id);
        default: return Promise.reject();
      }
    },
    onSuccess: (_, action) => {
      const messages = { accept: 'Request accepted!', reject: 'Request rejected.', handover: 'Handover confirmed! Book is now active.', return: 'Return confirmed! Great job!', cancel: 'Request cancelled.' };
      toast.success(messages[action.type] || 'Done!');
      setModal(null);
      qc.invalidateQueries(['borrows']);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Action failed'),
  });

  return (
    <motion.div layout className="bg-white dark:bg-gray-800 rounded-2xl shadow-card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-16 bg-gradient-to-br from-brand-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-7 h-7 text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link to={`/books/${borrow.book.id}`} className="font-semibold text-gray-900 dark:text-white hover:text-brand-600 transition-colors line-clamp-1">
                  {borrow.book.title}
                </Link>
                {borrow.book.author && <p className="text-sm text-gray-500 dark:text-gray-400">{borrow.book.author}</p>}
              </div>
              <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.color}`}>
                <StatusIcon className="w-3.5 h-3.5" /> {cfg.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <User className="w-3.5 h-3.5" />
                <Link to={`/profile/${other.id}`} className="hover:text-brand-600">{other.full_name}</Link>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(borrow.requested_at), 'MMM d, yyyy')}
              </div>
              {borrow.due_date && (
                <div className={`flex items-center gap-1.5 text-xs font-medium ${borrow.is_overdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                  <Clock className="w-3.5 h-3.5" />
                  Due: {borrow.due_date} {borrow.is_overdue && `(${borrow.overdue_days}d overdue)`}
                </div>
              )}
              {borrow.requested_duration_days && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Hash className="w-3.5 h-3.5" />{borrow.requested_duration_days} days requested
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          {/* Lender actions */}
          {role === 'lender' && borrow.status === 'pending' && (
            <>
              <button onClick={() => mutation.mutate({ type: 'accept' })} disabled={mutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors disabled:opacity-60">
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Accept
              </button>
              <button onClick={() => setModal('reject')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </>
          )}
          {role === 'lender' && borrow.status === 'active' && (
            <button onClick={() => setModal('return')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
              <RotateCcw className="w-4 h-4" /> Confirm Return
            </button>
          )}
          {/* Borrower actions */}
          {role === 'borrower' && borrow.status === 'accepted' && (
            <>
              <button onClick={() => setModal('handover')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors">
                <CheckCircle className="w-4 h-4" /> Confirm Pickup
              </button>
              <p className="text-xs text-gray-500 self-center">
                Handover code: <span className="font-mono font-bold text-brand-600">{borrow.handover_code || 'Check notifications'}</span>
              </p>
            </>
          )}
          {role === 'borrower' && borrow.status === 'pending' && (
            <button onClick={() => mutation.mutate({ type: 'cancel' })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <XCircle className="w-4 h-4" /> Cancel Request
            </button>
          )}

          {/* Expand */}
          <button onClick={() => setExpanded(v => !v)} className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            Details <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Rejection reason */}
        {modal === 'reject' && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2}
              placeholder="Reason for rejection (optional)"
              className="w-full bg-transparent text-sm text-gray-700 dark:text-gray-300 focus:outline-none resize-none" />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setModal(null)} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
              <button onClick={() => mutation.mutate({ type: 'reject' })} className="text-xs font-medium text-red-600 hover:text-red-700">Confirm Reject</button>
            </div>
          </div>
        )}

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 overflow-hidden">
              {borrow.borrower_note && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Note: </span>{borrow.borrower_note}
                </div>
              )}
              {borrow.rejection_reason && (
                <div className="text-sm text-red-600 dark:text-red-400 mb-2">
                  <span className="font-medium">Rejection reason: </span>{borrow.rejection_reason}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                {borrow.accepted_at && <div>Accepted: {format(new Date(borrow.accepted_at), 'MMM d, HH:mm')}</div>}
                {borrow.handed_over_at && <div>Picked up: {format(new Date(borrow.handed_over_at), 'MMM d, HH:mm')}</div>}
                {borrow.returned_at && <div>Returned: {format(new Date(borrow.returned_at), 'MMM d, HH:mm')}</div>}
                {borrow.actual_duration_days && <div>Actual: {borrow.actual_duration_days} days</div>}
              </div>
              {borrow.status === 'active' && borrow.return_code && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Return code (share with lender): <span className="font-mono font-bold text-brand-600">{borrow.return_code}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Code modals */}
      <AnimatePresence>
        {modal === 'handover' && (
          <CodeModal title="Confirm Pickup" prompt="Enter the handover code provided by the lender"
            onConfirm={(code) => mutation.mutate({ type: 'handover', code })}
            onClose={() => setModal(null)} />
        )}
        {modal === 'return' && (
          <CodeModal title="Confirm Return" prompt="Enter the return code provided by the borrower"
            onConfirm={(code) => mutation.mutate({ type: 'return', code })}
            onClose={() => setModal(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function BorrowsPage() {
  const [tab, setTab] = useState('borrowing'); // 'borrowing' | 'lending'
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['borrows', tab, statusFilter],
    queryFn: () => borrowService.getRequests({
      role: tab === 'borrowing' ? 'borrower' : 'lender',
      status: statusFilter || undefined,
      page_size: 50,
    }).then(r => r.data),
  });

  const statuses = ['', 'pending', 'accepted', 'active', 'returned', 'rejected', 'overdue'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">My Borrows</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Track all your lending and borrowing activity</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {[['borrowing', 'Books I\'m Borrowing'], ['lending', 'Books I\'m Lending']].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === val ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-brand-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : !data?.results?.length ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-card">
          <RotateCcw className="w-14 h-14 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-gray-400 dark:text-gray-600">No borrows yet</h3>
          <p className="text-gray-400 dark:text-gray-600 mt-1">
            {tab === 'borrowing' ? 'Browse books and request to borrow' : 'List your books to start lending'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.results.map(borrow => (
            <BorrowCard key={borrow.id} borrow={borrow} role={tab === 'borrowing' ? 'borrower' : 'lender'} />
          ))}
        </div>
      )}
    </div>
  );
}
