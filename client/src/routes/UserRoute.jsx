import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardByRole } from '../utils/roleRedirect';
import AuthWall from '../components/layout/AuthWall';
import LoadingSpinner from '../components/forms/LoadingSpinner';

export function UserRoute({ children }) {
  const { user, loading, role } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner fullPage auth />;

  if (!user) return <AuthWall from={location.pathname} />;

  if (role !== 'user') {
    return <Navigate to={getDashboardByRole(role)} replace />;
  }

  return children;
}
