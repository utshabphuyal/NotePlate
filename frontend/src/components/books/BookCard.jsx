import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, MapPin, Heart, ArrowUpRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookService } from '../../services/api';
import toast from 'react-hot-toast';

const AVAILABILITY_COLORS = {
  borrow:   'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
  donate:   'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  exchange: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const CONDITION_DOT = {
  new:      'bg-green-500',
  like_new: 'bg-green-400',
  good:     'bg-yellow-400',
  fair:     'bg-orange-400',
  poor:     'bg-red-400',
};

export default function BookCard({ book, showDistance = false }) {
  const qc = useQueryClient();
  const [saved, setSaved] = React.useState(book.is_saved);

  const saveMutation = useMutation({
    mutationFn: () => bookService.saveBook(book.id),
    onMutate: () => setSaved(v => !v),
    onSuccess: (res) => {
      toast.success(res.data.saved ? 'Book saved!' : 'Removed from saved');
      qc.invalidateQueries(['saved']);
    },
    onError: () => setSaved(v => !v),
  });

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group bg-white dark:bg-gray-800 rounded-2xl shadow-card hover:shadow-card-hover transition-all overflow-hidden"
    >
      {/* Image */}
      <div className="relative h-44 bg-gradient-to-br from-brand-50 to-blue-50 dark:from-gray-700 dark:to-gray-800">
        {book.cover_image ? (
          <img
            src={book.cover_image}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-brand-200 dark:text-brand-800" />
          </div>
        )}

        {/* Save button */}
        <button
          onClick={(e) => { e.preventDefault(); saveMutation.mutate(); }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-colors"
        >
          <Heart className={`w-4 h-4 ${saved ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
        </button>

        {/* Availability badge */}
        <div className="absolute bottom-2 left-2">
          <span className={`text-xs font-medium px-2 py-1 rounded-lg ${AVAILABILITY_COLORS[book.availability_type] || AVAILABILITY_COLORS.borrow}`}>
            {book.availability_type === 'borrow' ? 'Borrow' : book.availability_type === 'donate' ? 'Free' : 'Exchange'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight line-clamp-2 group-hover:text-brand-600 transition-colors">
              {book.title}
            </h3>
            {book.author && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{book.author}</p>
            )}
          </div>
          <Link to={`/books/${book.id}`}
            className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors">
            <ArrowUpRight className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </Link>
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {book.subject && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-md">
              {book.subject}
            </span>
          )}
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${CONDITION_DOT[book.condition] || 'bg-gray-300'}`} />
            <span className="text-xs text-gray-500 capitalize">{book.condition?.replace('_', ' ')}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-1.5">
            {book.owner?.avatar_url ? (
              <img src={book.owner.avatar_url} alt={book.owner.full_name} className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
                <span className="text-brand-600 dark:text-brand-400 text-xs font-semibold">{book.owner?.full_name?.[0]}</span>
              </div>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[80px]">{book.owner?.full_name}</span>
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <MapPin className="w-3 h-3" />
            {showDistance && book.distance_km != null
              ? `${book.distance_km} km`
              : book.city || 'Unknown'}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
