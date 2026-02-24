import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  // Not logged in → login page
  if (!user) return <Navigate to="/login" replace />;

  // Logged in but not admin → back to dashboard (not a hard error)
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return children;
}