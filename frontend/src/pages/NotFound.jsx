import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const { user } = useAuth();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-50)', textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: '5rem', marginBottom: 16 }}>📚</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: 8 }}>Page Not Found</h1>
      <p style={{ color: 'var(--gray-500)', marginBottom: 28, maxWidth: 360 }}>The page you're looking for doesn't exist or has been moved.</p>
      <Link to={user ? `/${user.role}` : '/login'} className="btn btn-primary btn-lg">
        {user ? '← Back to Dashboard' : 'Go to Login'}
      </Link>
    </div>
  );
}
