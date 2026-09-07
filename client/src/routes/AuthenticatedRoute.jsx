import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthWall from '../components/layout/AuthWall';
import LoadingSpinner from '../components/forms/LoadingSpinner';

export function AuthenticatedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullPage auth />;

  if (!user) return <AuthWall from={location.pathname} />;

  return children;
}
