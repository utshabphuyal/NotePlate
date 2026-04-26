import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookMarked, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { bookService } from '../services/api';
import BookCard from '../components/books/BookCard';

export function SavedBooksPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['saved-books'],
    queryFn: () => bookService.getSaved().then(r => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Saved Books</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Books you've bookmarked</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
      ) : !data?.results?.length ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-card">
          <BookMarked className="w-14 h-14 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-gray-400 dark:text-gray-600">No saved books</h3>
          <p className="text-gray-400 dark:text-gray-600 mt-1 mb-5">Browse books and tap the heart icon to save them</p>
          <Link to="/books" className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors inline-block">
            Browse Books
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.results.map(book => <BookCard key={book.id} book={book} />)}
        </div>
      )}
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 font-body">
      <div className="text-center">
        <div className="font-display text-9xl font-bold text-brand-100 dark:text-brand-950 select-none mb-4">404</div>
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white mb-2">Page not found</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">The page you're looking for doesn't exist.</p>
        <Link to="/dashboard" className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors inline-block">
          Go Home
        </Link>
      </div>
    </div>
  );
}

export default SavedBooksPage;
