import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, BookOpen, MapPin, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { libraryService } from '../services/api';

export default function LibraryPage() {
  const qc = useQueryClient();
  const [selectedLib, setSelectedLib] = useState(null);
  const [search, setSearch] = useState('');

  const { data: libraries, isLoading } = useQuery({
    queryKey: ['libraries'],
    queryFn: () => libraryService.getLibraries().then(r => r.data?.results || r.data || []),
  });

  const { data: inventory } = useQuery({
    queryKey: ['library-inventory', selectedLib],
    queryFn: () => libraryService.getInventory({ library: selectedLib, page_size: 30 }).then(r => r.data),
    enabled: !!selectedLib,
  });

  const reserveMutation = useMutation({
    mutationFn: (bookId) => libraryService.reserveBook({ library_book_id: bookId }),
    onSuccess: () => { toast.success('Book reserved!'); qc.invalidateQueries(['library-inventory']); },
    onError: (err) => toast.error(err.response?.data?.error || 'Reservation failed'),
  });

  const filtered = (Array.isArray(libraries) ? libraries : []).filter(l =>
    !search || l.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Libraries</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Browse official library inventories and reserve books</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search libraries…"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-card">
              <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No libraries found</p>
            </div>
          ) : filtered.map(lib => (
            <button key={lib.id} onClick={() => setSelectedLib(lib.id)}
              className={`w-full text-left p-4 rounded-2xl shadow-card transition-all border-2 ${
                selectedLib === lib.id ? 'bg-brand-50 border-brand-500' : 'bg-white dark:bg-gray-800 border-transparent'
              }`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{lib.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />{lib.city}
                  </p>
                  {lib.is_verified && (
                    <span className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {!selectedLib ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-card">
              <Building2 className="w-14 h-14 text-gray-200 mb-4" />
              <p className="text-gray-400 font-medium">Select a library to browse</p>
            </div>
          ) : !inventory ? (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
          ) : (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">
                {inventory.count || 0} books available
              </h2>
              {(inventory.results || []).map(book => (
                <div key={book.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-card flex items-center gap-4">
                  <div className="w-10 h-14 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{book.title}</p>
                    {book.author && <p className="text-xs text-gray-500">{book.author}</p>}
                    <p className="text-xs text-brand-600 font-medium mt-1">{book.available_copies}/{book.total_copies} available</p>
                  </div>
                  <button onClick={() => reserveMutation.mutate(book.id)}
                    disabled={book.available_copies === 0 || reserveMutation.isPending}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-xs font-semibold">
                    Reserve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}