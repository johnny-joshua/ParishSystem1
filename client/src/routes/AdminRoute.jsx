
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthWall from '../components/layout/AuthWall';
import LoadingSpinner from '../components/forms/LoadingSpinner';

export function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullPage auth />;

  if (!user) return <AuthWall from={location.pathname} />;

  if (!isAdmin) return <Navigate to="/unauthorized" replace />;

  return children;
}
