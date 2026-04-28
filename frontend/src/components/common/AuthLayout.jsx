import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 font-body flex">
      {/* Left panel (desktop) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-brand-600 to-brand-800 relative overflow-hidden flex-col justify-between p-12">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/2 -right-20 w-60 h-60 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 left-20 w-40 h-40 rounded-full bg-white/5" />

        <Link to="/" className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-2xl font-bold text-white">NotePlate</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <h2 className="font-display text-4xl font-bold text-white leading-tight mb-4">
            Share knowledge,<br />build community
          </h2>
          <p className="text-brand-100 text-lg leading-relaxed">
            Borrow, lend, and donate books and study materials. Connect with
            students and libraries near you — all for free.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { num: '10K+', label: 'Books Shared' },
              { num: '5K+', label: 'Students' },
              { num: '200+', label: 'Libraries' },
            ].map(({ num, label }) => (
              <div key={label}>
                <p className="text-3xl font-display font-bold text-white">{num}</p>
                <p className="text-brand-200 text-sm">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="text-brand-300 text-sm relative z-10">
          © 2026 NotePlate. All rights reserved.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-gray-900 dark:text-white">NotePlate</span>
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Outlet />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
