import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/forms/LoadingSpinner';

export function GuestRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <LoadingSpinner fullPage />;
  if (user) {
    return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;
  }
  return children;
}
