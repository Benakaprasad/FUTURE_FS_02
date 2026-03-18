import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Still checking auth — show spinner, never redirect yet
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: '100vh',
        background: 'var(--black)'
      }}>
        <div style={{
          width: 32, height: 32,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--acid)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite'
        }} />
      </div>
    );
  }

  // Auth check done — now decide
  return user ? children : <Navigate to="/login" replace />;
}