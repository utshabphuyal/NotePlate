import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Upload, X, BookOpen, MapPin, Loader2, Plus, Tag, ChevronRight
} from 'lucide-react';
import { bookService } from '../services/api';
import { useAuthStore } from '../store';

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
  'History', 'Geography', 'Economics', 'English Literature', 'Engineering', 'Medicine', 'Law', 'Other'];
const MATERIAL_TYPES = ['book', 'textbook', 'notes', 'pdf', 'magazine', 'other'];
const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'];
const AVAILABILITY = ['borrow', 'donate', 'exchange'];

function FormSection({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-card">
      <h3 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-5 pb-3 border-b border-gray-100 dark:border-gray-700">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function FormField({ label, error, required, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

const inputClass = "w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition";

export default function AddBookPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [images, setImages] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      availability_type: 'borrow',
      condition: 'good',
      material_type: 'book',
      max_borrow_days: 14,
      latitude: user?.latitude || '',
      longitude: user?.longitude || '',
      city: user?.city || '',
      language: 'English',
    }
  });

  const onDrop = useCallback((accepted) => {
    const newImages = accepted.slice(0, 5 - images.length).map(file =>
      Object.assign(file, { preview: URL.createObjectURL(file) })
    );
    setImages(prev => [...prev, ...newImages].slice(0, 5));
  }, [images]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 5, maxSize: 5 * 1024 * 1024,
  });

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags(prev => [...prev, t]);
      setTagInput('');
    }
  };

  const removeTag = (tag) => setTags(prev => prev.filter(t => t !== tag));

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setValue('latitude', pos.coords.latitude.toFixed(6));
        setValue('longitude', pos.coords.longitude.toFixed(6));
        toast.success('Location set!');
      },
      () => toast.error('Could not get location')
    );
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        ...data,
        tag_names: tags,
        uploaded_images: images,
        subjects: data.subjects ? [data.subjects] : [],
      };
      const res = await bookService.createBook(payload);
      toast.success('Book listed successfully!');
      navigate(`/books/${res.data.id}`);
    } catch (err) {
      const errData = err.response?.data;
      if (errData) {
        Object.entries(errData).forEach(([key, msgs]) =>
          toast.error(`${key}: ${Array.isArray(msgs) ? msgs[0] : msgs}`)
        );
      } else {
        toast.error('Failed to create listing. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const steps = ['Book Info', 'Details', 'Location & Images'];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">List a Book</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Share your book with students near you</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <button onClick={() => setStep(i + 1)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                step === i + 1 ? 'text-brand-600 dark:text-brand-400'
                : step > i + 1 ? 'text-green-600 dark:text-green-400'
                : 'text-gray-400'
              }`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === i + 1 ? 'bg-brand-600 text-white'
                : step > i + 1 ? 'bg-green-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}>
                {step > i + 1 ? '✓' : i + 1}
              </span>
              <span className="hidden sm:block">{s}</span>
            </button>
            {i < steps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Basic Info */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <FormSection title="Book Information">
                <FormField label="Title" required error={errors.title?.message}>
                  <input {...register('title', { required: 'Title is required' })}
                    placeholder="e.g. Introduction to Algorithms" className={inputClass} />
                </FormField>
                <FormField label="Author">
                  <input {...register('author')} placeholder="e.g. Thomas H. Cormen" className={inputClass} />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="ISBN">
                    <input {...register('isbn')} placeholder="978-..." className={inputClass} />
                  </FormField>
                  <FormField label="Publication Year">
                    <input {...register('publication_year')} type="number" placeholder="2023" className={inputClass} />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Publisher">
                    <input {...register('publisher')} placeholder="MIT Press" className={inputClass} />
                  </FormField>
                  <FormField label="Edition">
                    <input {...register('edition')} placeholder="3rd" className={inputClass} />
                  </FormField>
                </div>
                <FormField label="Language">
                  <input {...register('language')} placeholder="English" className={inputClass} />
                </FormField>
                <FormField label="Description">
                  <textarea {...register('description')} rows={4}
                    placeholder="Brief description of the book content, what's highlighted, any damage, etc."
                    className={`${inputClass} resize-none`} />
                </FormField>
              </FormSection>
              <div className="flex justify-end">
                <button type="button" onClick={() => setStep(2)}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <FormSection title="Classification & Availability">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Material Type" required>
                    <select {...register('material_type')} className={inputClass}>
                      {MATERIAL_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Condition" required>
                    <select {...register('condition')} className={inputClass}>
                      {CONDITIONS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                    </select>
                  </FormField>
                </div>
                <FormField label="Subject" required error={errors.subject?.message}>
                  <select {...register('subject', { required: 'Subject is required' })} className={inputClass}>
                    <option value="">Select subject…</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label="Grade/Level" hint="e.g. Undergraduate Year 2, 10th Grade">
                  <input {...register('grade_level')} placeholder="e.g. Undergraduate Year 2" className={inputClass} />
                </FormField>
                <FormField label="Availability Type" required>
                  <div className="grid grid-cols-3 gap-3">
                    {AVAILABILITY.map(a => {
                      const selected = watch('availability_type') === a;
                      const colors = { borrow: 'brand', donate: 'pink', exchange: 'amber' };
                      const c = colors[a];
                      return (
                        <label key={a} className={`cursor-pointer rounded-xl border-2 p-3 text-center transition-all ${
                          selected ? `border-${c}-500 bg-${c}-50 dark:bg-${c}-900/20` : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}>
                          <input type="radio" {...register('availability_type')} value={a} className="sr-only" />
                          <p className={`text-sm font-semibold ${selected ? `text-${c}-700 dark:text-${c}-300` : 'text-gray-700 dark:text-gray-300'}`}>
                            {a.charAt(0).toUpperCase() + a.slice(1)}
                          </p>
                        </label>
                      );
                    })}
                  </div>
                </FormField>
                {watch('availability_type') === 'borrow' && (
                  <FormField label="Max Borrow Duration (days)" hint="How long can someone borrow this?">
                    <input {...register('max_borrow_days', { min: 1, max: 60 })}
                      type="number" min={1} max={60} className={inputClass} />
                  </FormField>
                )}
                <FormField label="Tags" hint="Add up to 10 tags to help people find your book">
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2.5 py-1 rounded-full">
                        <Tag className="w-3 h-3" />{tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                      placeholder="e.g. calculus, engineering" className={`${inputClass} flex-1`} />
                    <button type="button" onClick={addTag}
                      className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </FormField>
              </FormSection>
              <div className="flex justify-between">
                <button type="button" onClick={() => setStep(1)}
                  className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Back
                </button>
                <button type="button" onClick={() => setStep(3)}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Location & Images */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <FormSection title="Location">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Where can the book be picked up?</p>
                  <button type="button" onClick={useMyLocation}
                    className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
                    <MapPin className="w-4 h-4" /> Use my location
                  </button>
                </div>
                <FormField label="City" required error={errors.city?.message}>
                  <input {...register('city', { required: 'City is required' })}
                    placeholder="New Delhi" className={inputClass} />
                </FormField>
                <FormField label="Address / Area" hint="General area is fine — exact address not required">
                  <input {...register('address')} placeholder="e.g. Connaught Place, Central Delhi" className={inputClass} />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Latitude">
                    <input {...register('latitude')} placeholder="28.6139" className={inputClass} />
                  </FormField>
                  <FormField label="Longitude">
                    <input {...register('longitude')} placeholder="77.2090" className={inputClass} />
                  </FormField>
                </div>
                <FormField label="Pickup Instructions" hint="Describe how and where to pick up">
                  <textarea {...register('pickup_instructions')} rows={2}
                    placeholder="e.g. Available after 5pm on weekdays. Meet at college gate."
                    className={`${inputClass} resize-none`} />
                </FormField>
              </FormSection>

              <FormSection title="Photos">
                <p className="text-sm text-gray-500 dark:text-gray-400 -mt-2 mb-3">Add up to 5 photos. First photo becomes the cover.</p>
                <div {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                  <input {...getInputProps()} />
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isDragActive ? 'Drop images here' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · Max 5MB each · Up to 5 images</p>
                </div>
                {images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-3">
                    {images.map((file, i) => (
                      <div key={i} className="relative group">
                        <img src={file.preview} alt="" className="w-full aspect-square object-cover rounded-xl" />
                        {i === 0 && (
                          <span className="absolute top-1 left-1 text-xs bg-brand-600 text-white px-1.5 py-0.5 rounded font-medium">Cover</span>
                        )}
                        <button type="button" onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </FormSection>

              <div className="flex justify-between">
                <button type="button" onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Back
                </button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white px-8 py-2.5 rounded-xl font-semibold transition-colors">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</> : <><BookOpen className="w-4 h-4" /> Publish Listing</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
