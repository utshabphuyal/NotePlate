import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BookOpen, RotateCcw, Star, Plus, ArrowRight, TrendingUp, Clock, BookMarked } from 'lucide-react';
import { useAuthStore } from '../store';
import { bookService, borrowService } from '../services/api';
import BookCard from '../components/books/BookCard';

function StatCard({ icon: Icon, label, value, color, to }) {
  const content = (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all ${to ? 'cursor-pointer' : ''}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: recommended } = useQuery({
    queryKey: ['recommended'],
    queryFn: () => bookService.getRecommended().then(r => r.data.results),
  });

  const { data: borrows } = useQuery({
    queryKey: ['borrows', 'active'],
    queryFn: () => borrowService.getRequests({ status: 'active', page_size: 3 }).then(r => r.data.results),
  });

  const { data: pendingRequests } = useQuery({
    queryKey: ['borrows', 'pending-lender'],
    queryFn: () => borrowService.getRequests({ status: 'pending', role: 'lender', page_size: 5 }).then(r => r.data),
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-3xl font-bold text-gray-900 dark:text-white"
          >
            {greeting}, {user?.full_name?.split(' ')[0]} 👋
          </motion.h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {user?.school_college || 'Welcome to NotePlate'}
          </p>
        </div>
        <Link
          to="/books/add"
          className="hidden sm:flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> List a Book
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Books Lent" value={user?.total_lent || 0} color="bg-brand-500" to="/borrows?role=lender" />
        <StatCard icon={RotateCcw} label="Books Borrowed" value={user?.total_borrowed || 0} color="bg-blue-500" to="/borrows?role=borrower" />
        <StatCard icon={Star} label="Reputation" value={user?.reputation_score || 0} color="bg-amber-500" />
        <StatCard icon={TrendingUp} label="Avg Rating" value={`${(user?.average_rating || 0).toFixed(1)}★`} color="bg-purple-500" />
      </div>

      {/* Pending requests from others */}
      {pendingRequests?.count > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {pendingRequests.count} pending borrow request{pendingRequests.count !== 1 ? 's' : ''}
            </h2>
            <Link to="/borrows?role=lender&status=pending" className="text-sm text-amber-700 dark:text-amber-400 font-medium hover:underline">
              View all →
            </Link>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Someone wants to borrow your book! Review and accept or reject their request.
          </p>
        </div>
      )}

      {/* Active borrows */}
      {borrows?.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-brand-500" /> Currently Borrowing
            </h2>
            <Link to="/borrows" className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {borrows.map(borrow => (
              <div key={borrow.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-card flex items-center gap-4">
                <div className="w-12 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{borrow.book.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{borrow.book.author}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Due: <span className={`font-medium ${borrow.is_overdue ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                      {borrow.due_date}
                    </span>
                    {borrow.is_overdue && ' (Overdue!)'}
                  </p>
                </div>
                <Link to={`/borrows`} className="text-sm text-brand-600 font-medium hover:underline flex-shrink-0">Details</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommended Books */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white">
            Recommended for you
          </h2>
          <Link to="/books" className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
            Browse all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recommended?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recommended.slice(0, 8).map((book, i) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <BookCard book={book} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Add your interests in your profile to get personalized recommendations</p>
            <Link to="/profile" className="mt-3 inline-block text-brand-600 font-medium text-sm hover:underline">
              Update profile →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
