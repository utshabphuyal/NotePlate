/**
 * BookCard — reusable book listing card
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Avatar } from '../common/UI';
import styles from './BookCard.module.css';

const AVAILABILITY_LABELS = {
  borrow: 'Borrow',
  donate: 'Free',
  exchange: 'Exchange',
};
const CONDITION_LABELS = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export default function BookCard({ book, showDistance = false }) {
  const navigate = useNavigate();

  return (
    <div className={styles.card} onClick={() => navigate(`/books/${book.id}`)}>
      {/* Cover */}
      <div className={styles.cover}>
        {book.cover_image
          ? <img src={book.cover_image} alt={book.title} className={styles.coverImg} />
          : <div className={styles.coverPlaceholder}>
              <span className={styles.placeholderIcon}>◻</span>
            </div>
        }
        <div className={styles.badges}>
          <Badge status={book.availability_type}>
            {AVAILABILITY_LABELS[book.availability_type] || book.availability_type}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className={styles.body}>
        <h3 className={styles.title} title={book.title}>{book.title}</h3>
        {book.author && <p className={styles.author}>{book.author}</p>}

        <div className={styles.meta}>
          {book.subject && <span className={styles.subject}>{book.subject}</span>}
          <span className={styles.condition}>{CONDITION_LABELS[book.condition] || book.condition}</span>
        </div>

        {showDistance && book.distance_km !== undefined && (
          <p className={styles.distance}>◎ {book.distance_km} km away</p>
        )}

        <div className={styles.footer}>
          <div className={styles.ownerInfo}>
            <Avatar
              src={book.owner?.avatar_url}
              name={book.owner?.full_name}
              size="xs"
            />
            <span className={styles.ownerName}>{book.owner?.full_name}</span>
          </div>
          {book.city && <span className={styles.city}>{book.city}</span>}
        </div>
      </div>
    </div>
  );
}
