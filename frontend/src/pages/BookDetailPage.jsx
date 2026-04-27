import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, MapPin, User, Heart, MessageCircle, RotateCcw,
  Star, Share2, QrCode, ChevronLeft, ChevronRight, Calendar,
  Package, Tag, Info, Loader2, AlertTriangle, CheckCircle, Edit
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { bookService, borrowService, chatService } from '../services/api';
import { useAuthStore } from '../store';

const AVAILABILITY_LABELS = { borrow: 'Available to Borrow', donate: 'Free Donation', exchange: 'Exchange Only' };
const AVAILABILITY_COLORS = {
  borrow:   'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
  donate:   'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  exchange: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};
const CONDITION_COLORS = { new: 'text-green-600', like_new: 'text-green-500', good: 'text-yellow-500', fair: 'text-orange-500', poor: 'text-red-500' };

function ImageGallery({ images, title }) {
  const [active, setActive] = useState(0);
  if (!images?.length) return (
    <div className="w-full h-80 bg-gradient-to-br from-brand-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl flex items-center justify-center">
      <BookOpen className="w-20 h-20 text-brand-200 dark:text-brand-800" />
    </div>
  );
  return (
    <div>
      <div className="relative h-80 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
        <img src={images[active].image_url} alt={title} className="w-full h-full object-contain" />
        {images.length > 1 && (
          <>
            <button onClick={() => setActive(a => (a - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow hover:bg-white transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <button onClick={() => setActive(a => (a + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-800/80 flex items-center justify-center shadow hover:bg-white transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 mt-3">
          {images.map((img, i) => (
            <button key={img.id} onClick={() => setActive(i)}
              className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors ${i === active ? 'border-brand-500' : 'border-transparent'}`}>
              <img src={img.image_url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BorrowModal({ book, onClose }) {
  const [days, setDays] = useState(14);
  const [note, setNote] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => borrowService.createRequest({ book_id: book.id, requested_duration_days: days, borrower_note: note }),
    onSuccess: () => {
      toast.success('Borrow request sent!');
      qc.invalidateQueries(['borrows']);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Request failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-floating p-6 w-full max-w-md">
        <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-1">Request to Borrow</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">"{book.title}"</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            How many days? <span className="text-brand-600 font-bold">{days} days</span>
          </label>
          <input type="range" min={1} max={Math.min(60, book.max_borrow_days || 60)} value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="w-full accent-brand-600" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1 day</span>
            <span>{book.max_borrow_days || 60} days max</span>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Note to owner <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            placeholder="Tell them why you need it, your availability, etc."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Send Request
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: book, isLoading, error } = useQuery({
    queryKey: ['book', id],
    queryFn: () => bookService.get(id).then(r => { setSaved(r.data.is_saved); return r.data; }),
  });

  const saveMutation = useMutation({
    mutationFn: () => bookService.saveBook(id),
    onMutate: () => setSaved(v => !v),
    onSuccess: (res) => toast.success(res.data.saved ? 'Saved!' : 'Removed from saved'),
    onError: () => setSaved(v => !v),
  });

  const handleChat = async () => {
    try {
      const res = await chatService.startChat({ user_id: book.owner.id });
      navigate(`/chat/${res.data.id}`);
    } catch { toast.error('Could not start chat'); }
  };

  const handleShare = () => {
    navigator.share?.({ title: book.title, url: window.location.href }) ||
      navigator.clipboard.writeText(window.location.href).then(() => toast.success('Link copied!'));
  };

  const isOwner = user?.id === book?.owner?.id;

  if (isLoading) return (
    <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
  );
  if (error || !book) return (
    <div className="text-center py-32">
      <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
      <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">Book not found</h2>
      <button onClick={() => navigate('/books')} className="mt-4 text-brand-600 hover:underline">Browse books</button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link to="/books" className="hover:text-brand-600 transition-colors">Books</Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white truncate max-w-xs">{book.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Images */}
        <div>
          <ImageGallery images={book.images} title={book.title} />
        </div>

        {/* Right: Details */}
        <div className="space-y-5">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${AVAILABILITY_COLORS[book.availability_type]}`}>
              {AVAILABILITY_LABELS[book.availability_type]}
            </span>
            <span className={`text-sm font-medium px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 ${CONDITION_COLORS[book.condition]}`}>
              {book.condition?.replace('_', ' ')}
            </span>
            {book.status !== 'active' && (
              <span className="text-sm font-medium px-3 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                {book.status}
              </span>
            )}
          </div>

          {/* Title & Author */}
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white leading-tight">{book.title}</h1>
            {book.author && <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">by {book.author}</p>}
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            {book.subject && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <BookOpen className="w-4 h-4 text-gray-400" />
                <span>{book.subject}</span>
              </div>
            )}
            {book.city && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{book.city}</span>
              </div>
            )}
            {book.publication_year && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{book.publication_year}</span>
              </div>
            )}
            {book.language && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Info className="w-4 h-4 text-gray-400" />
                <span>{book.language}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Package className="w-4 h-4 text-gray-400" />
              <span>{book.material_type}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <RotateCcw className="w-4 h-4 text-gray-400" />
              <span>Max {book.max_borrow_days} days</span>
            </div>
          </div>

          {/* Tags */}
          {book.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {book.tags.map(tag => (
                <span key={tag.id} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  <Tag className="w-3 h-3" />{tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Owner */}
          <Link to={`/profile/${book.owner.id}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            {book.owner.avatar_url ? (
              <img src={book.owner.avatar_url} alt={book.owner.full_name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
                <span className="text-brand-700 dark:text-brand-300 font-semibold">{book.owner.full_name?.[0]}</span>
              </div>
            )}
            <div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{book.owner.full_name}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                {book.owner.average_rating?.toFixed(1)} · {book.owner.reputation_score} rep · {book.owner.total_lent} lent
              </div>
            </div>
            <User className="w-4 h-4 text-gray-400 ml-auto" />
          </Link>

          {/* Actions */}
          {isOwner ? (
            <div className="flex gap-3">
              <Link to={`/books/${id}/edit`}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-brand-600 text-brand-600 font-semibold hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
                <Edit className="w-4 h-4" /> Edit Listing
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {book.status === 'active' && book.availability_type !== 'donate' && (
                <button onClick={() => setBorrowModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-colors">
                  <RotateCcw className="w-4 h-4" /> Request to Borrow
                </button>
              )}
              <div className="grid grid-cols-3 gap-3">
                <button onClick={handleChat}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <MessageCircle className="w-4 h-4" /> Chat
                </button>
                <button onClick={() => saveMutation.mutate()}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    saved ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                  <Heart className={`w-4 h-4 ${saved ? 'fill-red-500' : ''}`} />
                  {saved ? 'Saved' : 'Save'}
                </button>
                <button onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>
            </div>
          )}

          {/* QR + Stats */}
          <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">
            <span>{book.view_count} views</span>
            <span>{book.save_count} saves</span>
            <span>Listed {format(new Date(book.created_at), 'MMM d, yyyy')}</span>
            <button onClick={() => setQrOpen(v => !v)} className="ml-auto flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium">
              <QrCode className="w-4 h-4" /> QR
            </button>
          </div>

          <AnimatePresence>
            {qrOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex justify-center py-3 border-t border-gray-100 dark:border-gray-800">
                <div className="p-4 bg-white rounded-xl shadow-card inline-block">
                  <QRCodeSVG value={window.location.href} size={160} />
                  <p className="text-xs text-gray-400 text-center mt-2">Scan to share</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Description */}
      {book.description && (
        <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-card">
          <h2 className="font-display text-xl font-semibold text-gray-900 dark:text-white mb-3">About this book</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{book.description}</p>
        </div>
      )}

      {/* Pickup instructions */}
      {book.pickup_instructions && (
        <div className="mt-4 p-6 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
          <h3 className="font-semibold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Pickup Instructions
          </h3>
          <p className="text-amber-800 dark:text-amber-400 text-sm leading-relaxed">{book.pickup_instructions}</p>
        </div>
      )}

      <AnimatePresence>
        {borrowModalOpen && <BorrowModal book={book} onClose={() => setBorrowModalOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
