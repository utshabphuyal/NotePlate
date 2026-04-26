// AuthLayout.js
import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div style={{
      minHeight: '100vh', display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      background: 'var(--clr-bg)',
    }}>
      {/* Left panel - illustration */}
      <div style={{
        background: 'linear-gradient(135deg, var(--clr-primary) 0%, #8B3A0F 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px',
        color: 'white',
      }} className="auth-panel">
        <div style={{ marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52, background: 'rgba(255,255,255,0.2)',
            borderRadius: 14, display: 'grid', placeItems: 'center',
            fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 20,
            marginBottom: 24, backdropFilter: 'blur(4px)',
          }}>BB</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', lineHeight: 1.2, marginBottom: 16 }}>
            Books should<br />be shared.
          </h1>
          <p style={{ opacity: 0.85, fontSize: '1.05rem', lineHeight: 1.7, maxWidth: 380 }}>
            Connect with students nearby to borrow, lend, or donate books and study materials — completely free.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {[['10K+', 'Students'], ['50K+', 'Books'], ['95%', 'Free']].map(([num, label]) => (
            <div key={label}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-serif)' }}>{num}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '60px 48px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <Outlet />
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-panel { display: none !important; }
          div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
