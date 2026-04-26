// LoadingScreen.js
import React from 'react';
export default function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center',
      background: 'var(--clr-bg)', fontFamily: 'var(--font-serif)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, background: 'var(--clr-primary)',
          borderRadius: 12, display: 'grid', placeItems: 'center',
          color: 'white', fontWeight: 700, fontSize: 18,
          margin: '0 auto 16px', animation: 'pulse 1.5s ease-in-out infinite'
        }}>BB</div>
        <p style={{ color: 'var(--clr-ink-3)', fontSize: 14 }}>Loading NotePlate…</p>
      </div>
    </div>
  );
}
