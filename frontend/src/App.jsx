import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store';

import MainLayout from './components/common/MainLayout';
import AuthLayout from './components/common/AuthLayout';

const LandingPage     = React.lazy(() => import('./pages/LandingPage'));
const LoginPage       = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage    = React.lazy(() => import('./pages/RegisterPage'));
const VerifyEmailPage = React.lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPwPage    = React.lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPwPage     = React.lazy(() => import('./pages/ResetPasswordPage'));
const DashboardPage   = React.lazy(() => import('./pages/DashboardPage'));
const MapPage         = React.lazy(() => import('./pages/MapPage'));
const BooksPage       = React.lazy(() => import('./pages/BooksPage'));
const BookDetailPage  = React.lazy(() => import('./pages/BookDetailPage'));
const AddBookPage     = React.lazy(() => import('./pages/AddBookPage'));
const EditBookPage    = React.lazy(() => import('./pages/EditBookPage'));
const ChatPage        = React.lazy(() => import('./pages/ChatPage'));
const MyProfilePage   = React.lazy(() => import('./pages/MyProfilePage'));
const ProfilePage     = React.lazy(() => import('./pages/ProfilePage'));
const BorrowsPage     = React.lazy(() => import('./pages/BorrowsPage'));
const LibraryPage     = React.lazy(() => import('./pages/LibraryPage'));
const AdminPage       = React.lazy(() => import('./pages/AdminPage'));
const SavedBooksPage  = React.lazy(() => import('./pages/SavedBooksPage'));
const PeoplePage = React.lazy(() => import('./pages/PeoplePage'));
const NotFoundPage    = React.lazy(() => import('./pages/NotFoundPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1, refetchOnWindowFocus: false },
  },
});

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

const Fallback = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
    <p style={{ fontFamily: 'sans-serif', color: '#6b7280' }}>Loading NotePlate…</p>
  </div>
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <React.Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            <Route element={<AuthLayout />}>
              <Route path="/login"           element={<GuestRoute><LoginPage /></GuestRoute>} />
              <Route path="/register"        element={<GuestRoute><RegisterPage /></GuestRoute>} />
              <Route path="/forgot-password" element={<GuestRoute><ForgotPwPage /></GuestRoute>} />
              <Route path="/reset-password"  element={<GuestRoute><ResetPwPage /></GuestRoute>} />
            </Route>

            <Route element={<MainLayout />}>
              <Route path="/dashboard"      element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/map"            element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
              <Route path="/books"          element={<ProtectedRoute><BooksPage /></ProtectedRoute>} />
              <Route path="/books/add"      element={<ProtectedRoute><AddBookPage /></ProtectedRoute>} />
              <Route path="/books/:id"      element={<ProtectedRoute><BookDetailPage /></ProtectedRoute>} />
              <Route path="/books/:id/edit" element={<ProtectedRoute><EditBookPage /></ProtectedRoute>} />
              <Route path="/chat"           element={<ProtectedRoute><ChatPage /></ProtectedRoute>} errorElement={<div style={{padding:40}}>Chat failed to load</div>} />
<Route path="/chat/:roomId"   element={<ProtectedRoute><ChatPage /></ProtectedRoute>} errorElement={<div style={{padding:40}}>Chat failed to load</div>} />
              <Route path="/profile"        element={<ProtectedRoute><MyProfilePage /></ProtectedRoute>} />
              <Route path="/profile/:id"    element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/borrows"        element={<ProtectedRoute><BorrowsPage /></ProtectedRoute>} />
              <Route path="/library"        element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
              <Route path="/saved"          element={<ProtectedRoute><SavedBooksPage /></ProtectedRoute>} />
              <Route path="/admin"          element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
              <Route path="/people" element={<ProtectedRoute><PeoplePage /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}