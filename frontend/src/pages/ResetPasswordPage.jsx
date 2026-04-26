import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/api';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const token = params.get('token');
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const password = watch('new_password');

  const onSubmit = async (data) => {
    try {
      await authService.resetPassword({ token, ...data });
      toast.success('Password reset! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed. Link may have expired.');
    }
  };

  if (!token) return (
    <div className="text-center">
      <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
      <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">Invalid Link</h2>
      <p className="text-gray-500 mt-2">This reset link is invalid or missing.</p>
      <Link to="/forgot-password" className="mt-4 inline-block text-brand-600 font-medium hover:underline">Request a new one</Link>
    </div>
  );

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white mb-2">Reset password</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Choose a new secure password.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'}
              {...register('new_password', { required: 'Required', minLength: { value: 8, message: 'Min 8 chars' } })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 pr-12" />
            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.new_password && <p className="text-red-500 text-sm mt-1">{errors.new_password.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
          <input type="password"
            {...register('new_password_confirm', { validate: v => v === password || 'Passwords do not match' })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
          {errors.new_password_confirm && <p className="text-red-500 text-sm mt-1">{errors.new_password_confirm.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl">
          {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Resetting…</> : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const token = params.get('token');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    authService.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 font-body">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-card p-10 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Verifying your email…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-brand-500 mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-2">Email Verified!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Your account is now active. Start sharing books!</p>
            <Link to="/login" className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-8 py-3 rounded-xl inline-block transition-colors">
              Sign In
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-2">Verification Failed</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">The link is invalid or expired.</p>
            <Link to="/login" className="text-brand-600 font-medium hover:underline">Back to login</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;
