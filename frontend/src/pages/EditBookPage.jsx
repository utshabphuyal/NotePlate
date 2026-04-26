// EditBookPage.jsx - reuses AddBookPage logic with pre-filled data
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { bookService } from '../services/api';
import toast from 'react-hot-toast';

export default function EditBookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const { data: book, isLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: () => bookService.getBook(id).then(r => r.data),
  });

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      await bookService.updateBook(id, data);
      toast.success('Listing updated!');
      navigate(`/books/${id}`);
    } catch {
      toast.error('Update failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white mb-6">Edit Listing</h1>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-card space-y-4">
        {['title', 'author', 'description', 'subject', 'city', 'address', 'pickup_instructions'].map(field => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 capitalize">
              {field.replace('_', ' ')}
            </label>
            {field === 'description' || field === 'pickup_instructions' ? (
              <textarea
                id={field}
                defaultValue={book?.[field] || ''}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            ) : (
              <input
                id={field}
                defaultValue={book?.[field] || ''}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            )}
          </div>
        ))}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Condition</label>
            <select defaultValue={book?.condition} id="condition"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
              {['new', 'like_new', 'good', 'fair', 'poor'].map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Availability</label>
            <select defaultValue={book?.availability_type} id="availability_type"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
              {['borrow', 'donate', 'exchange'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => navigate(`/books/${id}`)}
            className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button
            onClick={() => {
              const data = {};
              ['title', 'author', 'description', 'subject', 'city', 'address', 'pickup_instructions', 'condition', 'availability_type'].forEach(f => {
                const el = document.getElementById(f);
                if (el) data[f] = el.value;
              });
              handleSubmit(data);
            }}
            disabled={submitting}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
