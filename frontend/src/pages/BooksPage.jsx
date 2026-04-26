import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X, BookOpen, Loader2 } from 'lucide-react';
import { bookService } from '../services/api';
import BookCard from '../components/books/BookCard';

const MATERIAL_TYPES = ['book', 'textbook', 'notes', 'pdf', 'magazine', 'other'];
const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'];
const AVAILABILITY = ['borrow', 'donate', 'exchange'];

export default function BooksPage() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const params = {
    search: search || undefined,
    page,
    page_size: 16,
    ...filters,
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['books', params],
    queryFn: () => bookService.getBooks(params).then(r => r.data),
    keepPreviousData: true,
  });

  const updateFilter = (key, val) => {
    setFilters(f => ({ ...f, [key]: val || undefined }));
    setPage(1);
  };

  const clearFilters = () => { setFilters({}); setSearch(''); setPage(1); };
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Browse Books</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Find books and study materials near you</p>
      </div>

      {/* Search + Filter bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by title, author, subject…"
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
        <button
          onClick={() => setFiltersOpen(v => !v)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
            filtersOpen || activeFilterCount > 0
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-white/30 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-card border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-sm text-red-500 hover:text-red-600 font-medium">
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Subject</label>
              <input
                value={filters.subject || ''}
                onChange={e => updateFilter('subject', e.target.value)}
                placeholder="e.g. Mathematics"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Type</label>
              <select
                value={filters.material_type || ''}
                onChange={e => updateFilter('material_type', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">All types</option>
                {MATERIAL_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            {/* Availability */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Availability</label>
              <select
                value={filters.availability_type || ''}
                onChange={e => updateFilter('availability_type', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">All</option>
                {AVAILABILITY.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
              </select>
            </div>
            {/* Condition */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Condition</label>
              <select
                value={filters.condition || ''}
                onChange={e => updateFilter('condition', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Any condition</option>
                {CONDITIONS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
        </motion.div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      ) : data?.results?.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-14 h-14 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-gray-400 dark:text-gray-600">No books found</h3>
          <p className="text-gray-400 dark:text-gray-600 mt-1">Try adjusting your search or filters</p>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="mt-4 text-brand-600 font-medium hover:underline text-sm">Clear filters</button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data?.count || 0} books found
              {isFetching && <span className="ml-2 text-brand-500">Updating…</span>}
            </p>
            <select
              value={filters.ordering || ''}
              onChange={e => updateFilter('ordering', e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
            >
              <option value="">Newest first</option>
              <option value="title">Title A-Z</option>
              <option value="-view_count">Most viewed</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(data?.results || []).map((book, i) => (
              <motion.div key={book.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <BookCard book={book} />
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {data?.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {data.total_pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                disabled={page === data.total_pages}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
