// Forgot Password Page
import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { authService } from '../services/api';

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting, isSubmitSuccessful } } = useForm();

  const onSubmit = async (data) => {
    try {
      await authService.forgotPassword(data.email);
      toast.success('Reset link sent if email exists!');
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  };

  if (isSubmitSuccessful) return (
    <div className="text-center">
      <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Mail className="w-8 h-8 text-brand-600" />
      </div>
      <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-2">Check your inbox</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6">We've sent a reset link to your email if it exists in our system.</p>
      <Link to="/login" className="text-brand-600 font-medium hover:underline">Back to login</Link>
    </div>
  );

  return (
    <div>
      <Link to="/login" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to login
      </Link>
      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white mb-2">Forgot password?</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Enter your email and we'll send you a reset link.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
          <input type="email" {...register('email', { required: 'Email is required' })}
            placeholder="you@university.edu"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl">
          {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending…</> : 'Send Reset Link'}
        </button>
      </form>
    </div>
  );
}
