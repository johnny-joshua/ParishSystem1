import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatusBadge from '../../components/cards/StatusBadge';
import { getSMSLogs } from '../../services/api';

export default function SMSLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const load = () => {
    setLoading(true);
    setError(null);
    const params = {
      page: pagination.page,
      limit: pagination.limit,
    };
    if (filter !== 'All') {
      params.status = filter;
    }
    if (search) {
      params.search = search;
    }
    getSMSLogs(params)
      .then((r) => {
        setLogs(r.data.logs || []);
        setPagination(r.data.pagination || pagination);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load SMS logs');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, [filter, search, pagination.page]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const summary = {
    total: pagination.total || logs.length,
    sent: logs.filter((log) => log.status === 'sent').length,
    failed: logs.filter((log) => log.status === 'failed').length,
    pending: logs.filter((log) => log.status === 'pending').length,
  };

  return (
    <DashboardLayout>
      <div className="mb-6 rounded-[28px] bg-gradient-to-r from-[#0f2337] via-[#12314b] to-[#1d4563] p-6 text-white shadow-[0_24px_50px_rgba(15,31,45,0.18)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d7b57a]">Communication</p>
            <h1 className="font-display text-3xl text-white">SMS Logs</h1>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300">Delivery</p>
            <p className="mt-1 text-sm font-medium text-white">Track message activity</p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card border-l-4 border-[#0f2337] bg-gradient-to-br from-[#f9fbfd] to-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-[#0f2337]">{summary.total}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">All</span>
          </div>
        </div>
        <div className="card border-l-4 border-emerald-500 bg-gradient-to-br from-[#f3fff9] to-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sent</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-emerald-700">{summary.sent}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">OK</span>
          </div>
        </div>
        <div className="card border-l-4 border-red-500 bg-gradient-to-br from-[#fff7f7] to-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Failed</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-red-600">{summary.failed}</span>
            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Alert</span>
          </div>
        </div>
        <div className="card border-l-4 border-[#d7b57a] bg-gradient-to-br from-[#fffaf1] to-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pending</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-[#0f2337]">{summary.pending}</span>
            <span className="rounded-full bg-[#f5ead0] px-2 py-1 text-xs font-medium text-[#775b25]">Queue</span>
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-[22px] border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="flex-1">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Search</label>
            <input
              type="text"
              placeholder="Search by phone, name, or email..."
              className="input-field"
              value={search}
              onChange={handleSearch}
            />
          </div>

          <div className="lg:max-w-xs">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Filter status</label>
            <select className="input-field" value={filter} onChange={handleFilterChange}>
              <option value="All">All Status</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
          Loading SMS logs...
        </div>
      ) : (
        <>
          <div className="card overflow-hidden border border-slate-200 p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-5 py-3">User</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3">Message</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-200 transition hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{log.fullname}</div>
                        <div className="text-xs text-slate-500">{log.email}</div>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{log.phone_number}</td>
                      <td className="px-5 py-4 max-w-md text-slate-700">
                        <span className="block truncate" title={log.message}>{log.message}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logs.length === 0 && <p className="px-5 py-6 text-sm text-gray-500">No SMS logs found.</p>}
          </div>

          {pagination.pages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pagination.page === 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Previous
              </button>
              <span className="text-sm font-medium text-slate-600">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pagination.page === pagination.pages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
