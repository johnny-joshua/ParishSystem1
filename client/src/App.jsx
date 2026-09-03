import { Routes, Route, Navigate } from 'react-router-dom';
import { GuestRoute } from './routes/GuestRoute';
import { UserRoute } from './routes/UserRoute';
import { AdminRoute } from './routes/AdminRoute';
import { AuthenticatedRoute } from './routes/AuthenticatedRoute';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MakeRequest from './pages/MakeRequest';
import Reservation from './pages/Reservation';
import Appointment from './pages/Appointment';
import AdminDashboard from './pages/AdminDashboard';
import AdminReservations from './pages/admin/AdminReservations';
import AdminAppointments from './pages/admin/AdminAppointments';
import AdminRecords from './pages/admin/AdminRecords';
import AdminUsers from './pages/admin/AdminUsers';
import Reports from './pages/admin/Reports';
import SMSLogs from './pages/admin/SMSLogs';
import ParishCalendar from './pages/admin/ParishCalendar';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <Register />
          </GuestRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <UserRoute>
            <Dashboard />
          </UserRoute>
        }
      />
      <Route
        path="/make-request"
        element={
          <UserRoute>
            <MakeRequest />
          </UserRoute>
        }
      />
      <Route
        path="/reservations"
        element={
          <UserRoute>
            <Reservation />
          </UserRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <UserRoute>
            <Appointment />
          </UserRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <AuthenticatedRoute>
            <Profile />
          </AuthenticatedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <AuthenticatedRoute>
            <Notifications />
          </AuthenticatedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <AuthenticatedRoute>
            <Settings />
          </AuthenticatedRoute>
        }
      />

      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/reservations"
        element={
          <AdminRoute>
            <AdminReservations />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/parish-calendar"
        element={
          <AdminRoute>
            <ParishCalendar />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/appointments"
        element={
          <AdminRoute>
            <AdminAppointments />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/records"
        element={
          <AdminRoute>
            <AdminRecords />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminUsers />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/sms-logs"
        element={
          <AdminRoute>
            <SMSLogs />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <AdminRoute>
            <Reports />
          </AdminRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
