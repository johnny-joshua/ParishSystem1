import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/cards/StatCard';
import StatusBadge from '../components/cards/StatusBadge';
import LoadingSpinner from '../components/forms/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { getReservations, getAppointments } from '../services/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getReservations(), getAppointments()])
      .then(([r, a]) => {
        // Reservations: keep existing recent-only behavior for counters + list.
        setReservations(r.data.reservations?.slice(0, 5) || []);
        // Appointments: keep the full list so dashboard counters are accurate.
        setAppointments(a.data.appointments || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const pendingRes = reservations.filter((r) => r.status === 'Pending').length;

  // Appointment statistics must use the full list (not the recent slice).
  const totalAppointments = appointments.length;
  const pendingAppointments = appointments.filter((a) => a.status === 'Pending').length;
  const approvedAppointments = appointments.filter((a) => a.status === 'Approved').length;
  const completedAppointments = appointments.filter((a) => a.status === 'Completed').length;
  const recentAppointments = appointments.slice(0, 5);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8 rounded-[28px] bg-gradient-to-r from-[#0f2337] via-[#12314b] to-[#1d4563] p-6 text-white shadow-[0_24px_50px_rgba(15,31,45,0.18)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d7b57a]">Parish dashboard</p>
            <h1 className="font-display text-3xl text-white">Welcome, {user?.fullname}</h1>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Reservations" value={reservations.length} icon="📋" />
        <StatCard title="Pending Reservations" value={pendingRes} icon="⏳" color="gold" />
        <StatCard title="Appointments" value={totalAppointments} icon="📅" color="green" />
        <StatCard title="Pending Appointments" value={pendingAppointments} icon="⏳" color="gold" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card border border-slate-200 bg-white p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="text-base font-semibold text-[#0f2337]">Recent Reservations</h2>
            <Link to="/reservations" className="text-sm font-medium text-[#0f2337] transition hover:text-[#1d4563]">
              View all
            </Link>
          </div>
          <div className="p-5">
            {reservations.length === 0 ? (
              <p className="text-sm text-gray-500">
                No reservations yet.{' '}
                <Link to="/reservations" className="font-semibold text-[#0f2337]">
                  Create one
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {reservations.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <div>
                      <p className="font-semibold text-slate-800">{r.service_type}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {r.reservation_date} {r.reservation_time?.slice(0, 5)}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card border border-slate-200 bg-white p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="text-base font-semibold text-[#0f2337]">Recent Appointments</h2>
            <Link to="/appointments" className="text-sm font-medium text-[#0f2337] transition hover:text-[#1d4563]">
              View all
            </Link>
          </div>
          <div className="p-5">
            {recentAppointments.length === 0 ? (
              <p className="text-sm text-gray-500">No appointments yet.</p>
            ) : (
              <div className="space-y-3">
                {recentAppointments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{a.purpose?.slice(0, 40)}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {a.appointment_date} {a.appointment_time?.slice(0, 5)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
