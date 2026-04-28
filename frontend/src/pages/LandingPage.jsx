import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Map, MessageCircle, Star, ArrowRight, Users, BookMarked, Zap } from 'lucide-react';

const features = [
  { icon: BookOpen, title: 'List & Browse', desc: 'Upload your books and browse thousands of listings from students nearby.' },
  { icon: Map, title: 'Map Discovery', desc: 'Find books and lenders on an interactive map. Filter by distance.' },
  { icon: MessageCircle, title: 'Real-Time Chat', desc: 'Chat instantly with lenders and borrowers. Share PDFs and images.' },
  { icon: Star, title: 'Reputation System', desc: 'Build trust through ratings and reviews from each transaction.' },
  { icon: Users, title: 'Library Integration', desc: 'Browse official library inventories and reserve books directly.' },
  { icon: Zap, title: 'Smart Matching', desc: 'Get recommended books based on your courses, interests, and location.' },
];

const stats = [
  { num: '10,000+', label: 'Books Available' },
  { num: '5,000+', label: 'Active Students' },
  { num: '200+', label: 'Partner Libraries' },
  { num: '₹0', label: 'Always Free' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 font-body">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-gray-900 dark:text-white">NotePlate</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              Sign In
            </Link>
            <Link to="/register" className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 pt-20 pb-24 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
            Free for students, always
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
            Every book deserves<br />
            <span className="text-brand-600">another reader</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Borrow, lend, or donate textbooks and study materials with students
            in your area. Real-time chat, map discovery, and zero fees.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:shadow-lg hover:-translate-y-0.5">
              Start Sharing Books <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/map"
              className="flex items-center justify-center gap-2 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-brand-400 font-semibold px-8 py-4 rounded-xl text-lg transition-all">
              <Map className="w-5 h-5" /> Explore Map
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20"
        >
          {stats.map(({ num, label }) => (
            <div key={label} className="text-center">
              <p className="font-display text-4xl font-bold text-brand-600 dark:text-brand-400">{num}</p>
              <p className="text-gray-600 dark:text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 dark:bg-gray-900 py-24">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-display text-4xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Everything you need
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-16 text-lg">
            A complete platform for the student book economy
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all"
              >
                <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/30 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                </div>
                <h3 className="font-display text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl p-12 text-white">
            <BookMarked className="w-12 h-12 mx-auto mb-6 opacity-80" />
            <h2 className="font-display text-4xl font-bold mb-4">Ready to bridge the gap?</h2>
            <p className="text-brand-100 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of students sharing knowledge and cutting educational costs together.
            </p>
            <Link to="/register"
              className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-8 py-4 rounded-xl hover:bg-brand-50 transition-colors text-lg">
              Create Free Account <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center">
              <BookOpen className="w-3 h-3 text-white" />
            </div>
            <span className="font-display font-bold text-gray-700 dark:text-gray-300">NotePlate</span>
          </div>
          <p className="text-sm text-gray-500">© 2026 NotePlate. Built for students, by students.</p>
        </div>
      </footer>
    </div>
  );
}
