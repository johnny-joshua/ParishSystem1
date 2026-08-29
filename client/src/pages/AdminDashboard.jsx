import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/cards/StatCard';
import LoadingSpinner from '../components/forms/LoadingSpinner';
import { getDashboardStats } from '../services/api';

const COLORS = ['#1a2744', '#c9a227', '#243556', '#22c55e', '#ef4444'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  const { stats, monthly_chart, service_breakdown } = data;

  return (
    <DashboardLayout>
      <div className="mb-8 rounded-[28px] bg-gradient-to-r from-[#0f2337] via-[#12314b] to-[#1d4563] p-6 text-white shadow-[0_24px_50px_rgba(15,31,45,0.18)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d7b57a]">Overview</p>
            <h1 className="font-display text-3xl text-white">Admin Dashboard</h1>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300">Operations</p>
            <p className="mt-1 text-sm font-medium text-white">Parish management summary</p>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Parishioners" value={stats.total_users} icon="👥" />
        <StatCard title="Pending Reservations" value={stats.pending_reservations} icon="⏳" color="gold" />
        <StatCard title="Pending Appointments" value={stats.pending_appointments} icon="📅" color="gold" />
        <StatCard title="Parish Records" value={stats.total_records} icon="📁" color="green" />
        <StatCard title="Approved Reservations" value={stats.approved_reservations} icon="✅" color="green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden border border-slate-200 bg-white p-0">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="text-base font-semibold text-[#0f2337]">Monthly Reservations</h2>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthly_chart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="count" fill="#0f2337" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card overflow-hidden border border-slate-200 bg-white p-0">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="text-base font-semibold text-[#0f2337]">By Service Type</h2>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={service_breakdown || []}
                  dataKey="count"
                  nameKey="service_type"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={4}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {(service_breakdown || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
