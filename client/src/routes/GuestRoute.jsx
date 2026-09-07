import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardByRole } from '../utils/roleRedirect';
import LoadingSpinner from '../components/forms/LoadingSpinner';

export function GuestRoute({ children }) {
  const { user, loading, role } = useAuth();

  if (loading) return <LoadingSpinner fullPage auth />;

  if (user) {
    return <Navigate to={getDashboardByRole(role)} replace />;
  }

  return children;
}
