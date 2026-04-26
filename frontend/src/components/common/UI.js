/**
 * NotePlate UI Component Library
 */
import React from 'react';
import styles from './UI.module.css';

// ─── Button ──────────────────────────────────────────────────────────────────
export function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false,
  className = '', ...props
}) {
  return (
    <button
      className={`${styles.btn} ${styles[`btn_${variant}`]} ${styles[`btn_${size}`]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className={styles.spinner} />}
      {children}
    </button>
  );
}

// ─── Input ───────────────────────────────────────────────────────────────────
export function Input({
  label, error, hint, id, className = '', ...props
}) {
  return (
    <div className={`${styles.fieldWrap} ${className}`}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <input id={id} className={`${styles.input} ${error ? styles.inputError : ''}`} {...props} />
      {error && <span className={styles.errorMsg}>{error}</span>}
      {hint && !error && <span className={styles.hintMsg}>{hint}</span>}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
export function Textarea({ label, error, hint, id, className = '', ...props }) {
  return (
    <div className={`${styles.fieldWrap} ${className}`}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <textarea id={id} className={`${styles.textarea} ${error ? styles.inputError : ''}`} {...props} />
      {error && <span className={styles.errorMsg}>{error}</span>}
      {hint && !error && <span className={styles.hintMsg}>{hint}</span>}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({ label, error, id, options = [], className = '', ...props }) {
  return (
    <div className={`${styles.fieldWrap} ${className}`}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <select id={id} className={`${styles.select} ${error ? styles.inputError : ''}`} {...props}>
        {options.map(({ value, label }) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`${styles.card} ${hover ? styles.cardHover : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
const BADGE_VARIANTS = {
  borrow: 'info',
  donate: 'success',
  exchange: 'warning',
  active: 'success',
  borrowed: 'warning',
  reserved: 'info',
  returned: 'neutral',
  overdue: 'error',
  pending: 'warning',
  accepted: 'success',
  rejected: 'error',
};

export function Badge({ children, variant, status, className = '' }) {
  const v = variant || BADGE_VARIANTS[status] || 'neutral';
  return (
    <span className={`${styles.badge} ${styles[`badge_${v}`]} ${className}`}>
      {children}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ src, name, size = 'md', className = '' }) {
  const initial = name?.[0]?.toUpperCase() || '?';
  return src
    ? <img src={src} alt={name} className={`${styles.avatar} ${styles[`avatar_${size}`]} ${className}`} />
    : <span className={`${styles.avatarInitial} ${styles[`avatar_${size}`]} ${className}`}>{initial}</span>;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  return <span className={`${styles.spinnerStandalone} ${styles[`spinner_${size}`]}`} />;
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon = '◻', title, message, action }) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon}>{icon}</span>
      <h3 className={styles.emptyTitle}>{title}</h3>
      {message && <p className={styles.emptyMsg}>{message}</p>}
      {action}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles[`modal_${size}`]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────
export function StarRating({ rating, maxRating = 5, interactive = false, onChange, size = 'sm' }) {
  const [hovered, setHovered] = React.useState(0);
  return (
    <div className={styles.stars}>
      {Array.from({ length: maxRating }, (_, i) => i + 1).map((star) => (
        <span
          key={star}
          className={`${styles.star} ${styles[`star_${size}`]} ${
            star <= (hovered || rating) ? styles.starFilled : ''
          } ${interactive ? styles.starInteractive : ''}`}
          onClick={() => interactive && onChange?.(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
export function TabBar({ tabs, active, onChange }) {
  return (
    <div className={styles.tabBar}>
      {tabs.map(({ value, label, count }) => (
        <button
          key={value}
          className={`${styles.tab} ${active === value ? styles.tabActive : ''}`}
          onClick={() => onChange(value)}
        >
          {label}
          {count !== undefined && (
            <span className={styles.tabCount}>{count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
