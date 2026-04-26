/**
 * Main App Layout with sidebar navigation
 */
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, useThemeStore } from '../../context/store';
import styles from './Layout.module.css';

const NAV = [
  { to: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { to: '/map',       icon: '◎', label: 'Discover' },
  { to: '/books',     icon: '◻', label: 'Browse Books' },
  { to: '/my-books',  icon: '✦', label: 'My Listings' },
  { to: '/borrowings',icon: '↕', label: 'Borrowings' },
  { to: '/saved',     icon: '♥', label: 'Saved' },
  { to: '/chat',      icon: '◉', label: 'Messages' },
  { to: '/library',   icon: '⊡', label: 'Libraries' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { unreadNotifications } = useAuthStore();

  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        {/* Logo */}
        <div className={styles.logo} onClick={() => navigate('/dashboard')}>
          <span className={styles.logoMark}>BB</span>
          <span className={styles.logoText}>NotePlate</span>
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className={styles.navIcon}>{icon}</span>
              <span className={styles.navLabel}>{label}</span>
              {label === 'Messages' && unreadNotifications > 0 && (
                <span className={styles.badge}>{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>
              )}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
            >
              <span className={styles.navIcon}>⚙</span>
              <span className={styles.navLabel}>Admin</span>
            </NavLink>
          )}
        </nav>

        {/* Bottom area */}
        <div className={styles.sidebarBottom}>
          <button className={styles.themeToggle} onClick={toggle} title="Toggle theme">
            {isDark ? '☀' : '☽'}
          </button>
          <div className={styles.userChip} onClick={() => navigate('/profile')}>
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" className={styles.avatar} />
              : <span className={styles.avatarInitial}>{user?.full_name?.[0] || 'U'}</span>
            }
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.full_name}</span>
              <span className={styles.userRole}>{user?.role}</span>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className={styles.main}>
        {/* Mobile header */}
        <header className={styles.mobileHeader}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>☰</button>
          <span className={styles.mobileTitle}>NotePlate</span>
          <button className={styles.themeToggle} onClick={toggle}>{isDark ? '☀' : '☽'}</button>
        </header>

        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
