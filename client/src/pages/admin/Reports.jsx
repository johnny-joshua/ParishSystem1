import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/cards/StatCard';
import LoadingSpinner from '../../components/forms/LoadingSpinner';
import { STATUSES, SERVICE_TYPES } from '../../utils/constants';
import { getReportsSummary, exportReports } from '../../services/api';

const COLORS = ['#1a2744', '#c9a227', '#243556', '#22c55e', '#ef4444', '#3b82f6'];

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [filterType, setFilterType] = useState('all');
  const [period, setPeriod] = useState('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reportCategory, setReportCategory] = useState('all');

  useEffect(() => {
    loadReports();
  }, [filterType, period, year, month, statusFilter, reportCategory, dateRange]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        from: dateRange.from,
        to: dateRange.to,
        period,
        year,
        month,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        category: reportCategory !== 'all' ? reportCategory : undefined,
        search: searchTerm || undefined,
      };

      const response = await getReportsSummary(params);
      setData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const params = {
        format,
        from: dateRange.from,
        to: dateRange.to,
        period,
        year,
        month,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        category: reportCategory !== 'all' ? reportCategory : undefined,
        search: searchTerm || undefined,
      };

      const response = await exportReports(params);
      
      // Create blob and download
      const blob = new Blob([response], { 
        type: format === 'pdf' ? 'application/pdf' : format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${format}_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xls' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="card bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
          <button onClick={loadReports} className="btn-primary mt-4">Retry</button>
        </div>
      </DashboardLayout>
    );
  }

  const { summary = {}, reservations_chart = [], appointments_chart = [], users_by_role = [], reservation_status = [], appointment_status = [], service_breakdown = [] } = data || {};

  return (
    <DashboardLayout>
      <div className="mb-6 rounded-[28px] bg-gradient-to-r from-[#0f2337] via-[#12314b] to-[#1d4563] p-6 text-white shadow-[0_24px_50px_rgba(15,31,45,0.18)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d7b57a]">Analytics</p>
            <h1 className="font-display text-3xl text-white">Reports</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleExport('csv')} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/10">
              Export CSV
            </button>
            <button onClick={() => handleExport('excel')} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/10">
              Export Excel
            </button>
            <button onClick={() => handleExport('pdf')} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/10">
              Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="card mb-6 border border-slate-200 bg-slate-50/60 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">From Date</label>
            <input
              type="date"
              className="input-field"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">To Date</label>
            <input
              type="date"
              className="input-field"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Period</label>
            <select className="input-field" value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Year</label>
            <select className="input-field" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
              {[2023, 2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Month</label>
            <select className="input-field" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2025, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Status</label>
            <select className="input-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Report Category</label>
            <select className="input-field" value={reportCategory} onChange={(e) => setReportCategory(e.target.value)}>
              <option value="all">All Categories</option>
              <option value="reservations">Reservations</option>
              <option value="appointments">Appointments</option>
              <option value="users">Users</option>
              <option value="records">Records</option>
              <option value="notifications">Notifications</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Search</label>
            <input
              type="text"
              className="input-field"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={loadReports} className="btn-primary">Apply Filters</button>
          <button
            onClick={() => {
              setDateRange({ from: '', to: '' });
              setFilterType('all');
              setPeriod('monthly');
              setYear(new Date().getFullYear());
              setMonth(new Date().getMonth() + 1);
              setSearchTerm('');
              setStatusFilter('all');
              setReportCategory('all');
            }}
            className="btn-secondary"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard title="Total Parishioners" value={summary.total_parishioners ?? 0} icon="👥" />
        <StatCard title="Total Users" value={summary.total_users ?? 0} icon="👤" />
        <StatCard title="Pending Reservations" value={summary.pending_reservations ?? 0} icon="⏳" color="gold" />
        <StatCard title="Approved Reservations" value={summary.approved_reservations ?? 0} icon="✅" color="green" />
        <StatCard title="Rejected Reservations" value={summary.rejected_reservations ?? 0} icon="❌" color="red" />
        <StatCard title="Completed Reservations" value={summary.completed_reservations ?? 0} icon="🏁" color="green" />
        <StatCard title="Pending Appointments" value={summary.pending_appointments ?? 0} icon="⏳" color="gold" />
        <StatCard title="Approved Appointments" value={summary.approved_appointments ?? 0} icon="✅" color="green" />
        <StatCard title="Completed Appointments" value={summary.completed_appointments ?? 0} icon="🏁" color="green" />
        <StatCard title="Cancelled Appointments" value={summary.cancelled_appointments ?? 0} icon="🚫" color="red" />
        <StatCard title="Total Records" value={summary.total_records ?? 0} icon="📁" />
        <StatCard title="Today's Reservations" value={summary.today_reservations ?? 0} icon="📅" />
        <StatCard title="Today's Appointments" value={summary.today_appointments ?? 0} icon="📋" />
        <StatCard title="Monthly Reservations" value={summary.monthly_reservations ?? 0} icon="📊" />
        <StatCard title="Monthly Appointments" value={summary.monthly_appointments ?? 0} icon="📊" />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="card border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0f2337]">Reservations Per Month</h2>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Volume</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reservations_chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#1a2744" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0f2337]">Appointments Per Month</h2>
            <span className="rounded-full bg-[#f5ead0] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#775b25]">Trend</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={appointments_chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#c9a227" strokeWidth={2.5} dot={{ fill: '#c9a227' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="card border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0f2337]">Users By Role</h2>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">Audience</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={users_by_role}
                dataKey="count"
                nameKey="role"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {users_by_role.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0f2337]">Reservation Status</h2>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Status</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reservation_status}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {reservation_status.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0f2337]">Appointment Status</h2>
            <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">Flow</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={appointment_status}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {appointment_status.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#0f2337]">Service Type Breakdown</h2>
            <span className="rounded-full bg-[#f5ead0] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#775b25]">Services</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={service_breakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="service_type" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#c9a227" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  );
}
