import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatusBadge from '../../components/cards/StatusBadge';
import Modal from '../../components/forms/Modal';
import { STATUSES } from '../../utils/constants';
import { getAppointments, updateAppointment } from '../../services/api';

export default function AdminAppointments() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('Pending');
  const [search, setSearch] = useState('');
  const [remarks, setRemarks] = useState({});
  const [showRemarks, setShowRemarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const load = () => {
    setLoading(true);
    return getAppointments(filter === 'All' ? '' : filter)
      .then((r) => setItems(r.data.appointments || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filter]);

  const searchQuery = search.trim().toLowerCase();
  const filteredAppointments = !searchQuery
    ? items
    : items.filter((a) => {
        const haystack = [
          a.fullname,
          a.email,
          a.phone,
          a.purpose,
          a.appointment_date,
        ]
          .map((v) => String(v || '').toLowerCase())
          .join(' ');
        return haystack.includes(searchQuery);
      });

  const resolveRemarks = (id) => {
    if (Object.prototype.hasOwnProperty.call(remarks, id)) {
      return remarks[id];
    }
    const item = items.find((a) => a.id === id);
    return item?.remarks || '';
  };

  const setStatus = async (id, status) => {
    if (status === 'Rejected' && !resolveRemarks(id).trim()) {
      setShowRemarks((prev) => ({ ...prev, [id]: true }));
      alert('Please provide a reason before rejecting this appointment.');
      return;
    }
    setActionLoading(id);
    try {
      await updateAppointment({ id, status, remarks: resolveRemarks(id) });
      setRemarks((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setShowRemarks((prev) => ({ ...prev, [id]: false }));
      await load();
    } catch (err) {
      alert(err.message || 'Failed to update appointment');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleRemarks = (id) => {
    setShowRemarks((prev) => {
      const opening = !prev[id];
      if (opening && !Object.prototype.hasOwnProperty.call(remarks, id)) {
        const item = items.find((a) => a.id === id);
        setRemarks((r) => ({ ...r, [id]: item?.remarks || '' }));
      }
      return { ...prev, [id]: opening };
    });
  };

  const canActPending = (status) => status === 'Pending';
  const canActApproved = (status) => status === 'Approved';
  const canViewRemarks = (status) =>
    ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'].includes(status);

  const stats = {
    total: items.length,
    pending: items.filter((item) => item.status === 'Pending').length,
    approved: items.filter((item) => item.status === 'Approved').length,
    completed: items.filter((item) => item.status === 'Completed').length,
    rejected: items.filter((item) => item.status === 'Rejected').length,
  };

  return (
    <DashboardLayout>
      <div className="mb-6 rounded-[28px] bg-gradient-to-r from-[#0f2337] via-[#12314b] to-[#1d4563] p-6 text-white shadow-[0_24px_50px_rgba(15,31,45,0.18)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d7b57a]">Appointments</p>
            <h1 className="font-display text-3xl text-white">Manage Appointments</h1>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300">Overview</p>
            <p className="mt-1 text-sm font-medium text-white">Review church service requests</p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="card border-l-4 border-[#0f2337] bg-gradient-to-br from-[#f9fbfd] to-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-[#0f2337]">{stats.total}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">All</span>
          </div>
        </div>
        <div className="card border-l-4 border-[#d7b57a] bg-gradient-to-br from-[#fffaf1] to-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pending</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-[#0f2337]">{stats.pending}</span>
            <span className="rounded-full bg-[#f5ead0] px-2 py-1 text-xs font-medium text-[#775b25]">Review</span>
          </div>
        </div>
        <div className="card border-l-4 border-emerald-500 bg-gradient-to-br from-[#f3fff9] to-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Approved</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-emerald-700">{stats.approved}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Active</span>
          </div>
        </div>
        <div className="card border-l-4 border-blue-500 bg-gradient-to-br from-[#f3f8ff] to-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Completed</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-blue-700">{stats.completed}</span>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">Done</span>
          </div>
        </div>
        <div className="card border-l-4 border-red-500 bg-gradient-to-br from-[#fff7f7] to-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Rejected</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-red-600">{stats.rejected}</span>
            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Needs</span>
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-[22px] border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="flex-1">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Filter status</label>
            <select className="input-field max-w-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="All">All Status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'Pending' ? 'Under Review' : s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 lg:max-w-lg">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Search</label>
            <input
              type="search"
              className="input-field"
              placeholder="Search by name, email, phone, service or date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden border border-slate-200 p-0">
        {loading ? (
          <p className="px-5 py-6 text-sm text-gray-500">Loading appointments...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-5 py-3">Parishioner</th>
                  <th className="px-5 py-3">Date / Time</th>
                  <th className="px-5 py-3">Purpose</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((a) => (
                  <tr key={a.id} className="border-b border-slate-200 align-top transition hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{a.fullname}</div>
                      <div className="text-xs text-slate-500">{a.email}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-700">
                      {a.appointment_date} {a.appointment_time?.slice(0, 5)}
                    </td>
                    <td className="px-5 py-4 max-w-xs text-slate-700" title={a.purpose}>
                      <span className="block truncate">{a.purpose}</span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={a.status === 'Pending' ? 'Under Review' : a.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap justify-end gap-x-3 gap-y-2">
                        <button
                          type="button"
                          className="text-sm font-semibold text-[#0f2337]"
                          onClick={() => setSelectedAppointment(a)}
                        >
                          View Details
                        </button>
                        {canActPending(a.status) && (
                          <>
                            <button
                              type="button"
                              className="text-sm font-semibold text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={actionLoading === a.id}
                              onClick={() => setStatus(a.id, 'Approved')}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={actionLoading === a.id}
                              onClick={() => setStatus(a.id, 'Rejected')}
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              className="text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={actionLoading === a.id}
                              onClick={() => setStatus(a.id, 'Cancelled')}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {canActApproved(a.status) && (
                          <>
                            <button
                              type="button"
                              className="text-sm font-semibold text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={actionLoading === a.id}
                              onClick={() => setStatus(a.id, 'Completed')}
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              className="text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={actionLoading === a.id}
                              onClick={() => setStatus(a.id, 'Cancelled')}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {canViewRemarks(a.status) && (
                          <button
                            type="button"
                            className="text-sm font-semibold text-slate-600"
                            onClick={() => toggleRemarks(a.id)}
                          >
                            {showRemarks[a.id]
                              ? 'Hide Remarks'
                              : a.remarks
                                ? 'View Remarks'
                                : 'Add Remarks'}
                          </button>
                        )}
                      </div>

                      {showRemarks[a.id] && (
                        <div className="mt-3 min-w-[260px] max-w-sm rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Remarks</label>
                          <textarea
                            className="input-field mb-2 text-sm"
                            rows={2}
                            placeholder="Add admin notes..."
                            value={remarks[a.id] ?? ''}
                            onChange={(e) =>
                              setRemarks((prev) => ({ ...prev, [a.id]: e.target.value }))
                            }
                          />
                          <button
                            type="button"
                            className="btn-primary text-sm py-1.5 px-3 disabled:opacity-50"
                            disabled={actionLoading === a.id}
                            onClick={() => setStatus(a.id, a.status)}
                          >
                            {actionLoading === a.id ? 'Saving...' : 'Save Remarks'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredAppointments.length === 0 && (
          <p className="px-5 py-6 text-sm text-gray-500">No appointments found.</p>
        )}
      </div>

      <Modal isOpen={!!selectedAppointment} onClose={() => setSelectedAppointment(null)} title="Appointment Details" size="lg">
        {selectedAppointment && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Appointment ID</p>
                <p className="font-semibold text-parish-blue">APT-{String(selectedAppointment.id).padStart(5, '0')}</p>
              </div>
              <StatusBadge status={selectedAppointment.status === 'Pending' ? 'Under Review' : selectedAppointment.status} />
            </div>
            <dl className="grid gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
              <div><dt className="text-xs text-gray-500">Parishioner</dt><dd className="font-medium">{selectedAppointment.fullname}</dd></div>
              <div><dt className="text-xs text-gray-500">Email</dt><dd className="break-words font-medium">{selectedAppointment.email}</dd></div>
              <div><dt className="text-xs text-gray-500">Contact Number</dt><dd className="font-medium">{selectedAppointment.phone || '—'}</dd></div>
              <div><dt className="text-xs text-gray-500">Address</dt><dd className="font-medium">{selectedAppointment.address || '—'}</dd></div>
              <div><dt className="text-xs text-gray-500">Purpose</dt><dd className="font-medium">{selectedAppointment.purpose}</dd></div>
              <div><dt className="text-xs text-gray-500">Submitted</dt><dd className="font-medium">{selectedAppointment.created_at}</dd></div>
              <div><dt className="text-xs text-gray-500">Requested Date</dt><dd className="font-medium">{selectedAppointment.appointment_date}</dd></div>
              <div><dt className="text-xs text-gray-500">Requested Time</dt><dd className="font-medium">{selectedAppointment.appointment_time?.slice(0, 5)}</dd></div>
            </dl>
            {selectedAppointment.remarks && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><span className="font-semibold">Remarks:</span> {selectedAppointment.remarks}</div>}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
