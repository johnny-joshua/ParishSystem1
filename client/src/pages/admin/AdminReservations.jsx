import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatusBadge from '../../components/cards/StatusBadge';
import Modal from '../../components/forms/Modal';
import ImagePreviewModal from '../../components/forms/ImagePreviewModal';
import { API_BASE, STATUSES } from '../../utils/constants';
import { getReservations, updateReservation, getReservationDocuments, updateReservationDocument } from '../../services/api';

const DOCUMENT_STATUS_COLORS = {
  Pending: 'bg-gray-100 text-gray-800',
  Verified: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
};

function parseServiceDetails(value) {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function fetchReservationDocument(documentId) {
  const response = await fetch(`${API_BASE}/reservations/download.php?id=${documentId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    let message = 'Failed to load document';
    try {
      const payload = await response.json();
      if (payload?.message) message = payload.message;
    } catch {
      // Non-JSON error body.
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  return {
    blob,
    contentType: response.headers.get('content-type') || blob.type || 'application/octet-stream',
  };
}

export default function AdminReservations() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('Pending');
  const [modal, setModal] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [documents, setDocuments] = useState([]);
  const [documentSummary, setDocumentSummary] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const load = () => {
    setLoading(true);
    getReservations(filter === 'All' ? '' : filter)
      .then((r) => setItems(r.data.reservations || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  const loadDocuments = async (reservationId) => {
    setLoadingDocs(true);
    try {
      const response = await getReservationDocuments(reservationId);
      setDocuments(response.data.documents || []);
      setDocumentSummary(response.data.document_summary || null);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setDocuments([]);
      setDocumentSummary(null);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const handleAction = async (status) => {
    setActionLoading(true);
    try {
      let decisionRemarks = remarks;
      if (status === 'Rejected' && !decisionRemarks.trim()) {
        decisionRemarks = window.prompt('Enter the rejection reason:') || '';
        if (!decisionRemarks.trim()) return;
      }
      await updateReservation({ id: modal.id, status, remarks: decisionRemarks });
      setModal(null);
      setRemarks('');
      load();
    } catch (err) {
      alert(err.message || 'Failed to update reservation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDocumentAction = async (documentId, status, remarksText = '') => {
    try {
      await updateReservationDocument({ document_id: documentId, status, remarks: remarksText });
      if (modal) {
        await loadDocuments(modal.id);
      }
    } catch (err) {
      alert(err.message || 'Failed to update document');
    }
  };

  const handleDownload = async (documentId, originalFilename) => {
    try {
      const { blob } = await fetchReservationDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err.message || 'Failed to download document');
    }
  };

  const isImageMime = (mimeType) => mimeType && mimeType.startsWith('image/');

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewDoc(null);
    setPreviewUrl(null);
  };

  const handlePreview = async (doc) => {
    if (isImageMime(doc.mime_type)) {
      try {
        const { blob } = await fetchReservationDocument(doc.id);
        if (previewUrl) {
          window.URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(window.URL.createObjectURL(blob));
        setPreviewDoc(doc);
      } catch (err) {
        alert(err.message || 'Failed to load preview');
      }
    } else {
      handleDownload(doc.id, doc.original_filename);
    }
  };

  const openModal = (reservation) => {
    setModal(reservation);
    setRemarks(reservation.remarks || '');
    loadDocuments(reservation.id);
  };

  const closeModal = () => {
    closePreview();
    setModal(null);
    setRemarks('');
    setDocuments([]);
    setDocumentSummary(null);
  };

  const stats = {
    total: items.length,
    pending: items.filter((item) => ['Pending', 'Under Review'].includes(item.status)).length,
    approved: items.filter((item) => item.status === 'Approved').length,
    rejected: items.filter((item) => item.status === 'Rejected').length,
  };

  return (
    <DashboardLayout>
      <div className="mb-6 rounded-[28px] bg-gradient-to-r from-[#0f2337] via-[#12314b] to-[#1d4563] p-6 text-white shadow-[0_24px_50px_rgba(15,31,45,0.18)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d7b57a]">Reservations</p>
            <h1 className="font-display text-3xl text-white">Manage Reservations</h1>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300">Queue</p>
            <p className="mt-1 text-sm font-medium text-white">Review parishioner requests</p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        <div className="card border-l-4 border-red-500 bg-gradient-to-br from-[#fff7f7] to-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Rejected</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-red-600">{stats.rejected}</span>
            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Needs</span>
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-[22px] border border-slate-200 bg-slate-50/60 p-4">
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Filter status</label>
        <select className="input-field max-w-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="All">All Status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden border border-slate-200 p-0">
        {loading ? (
          <p className="px-5 py-6 text-sm text-gray-500">Loading reservations...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-5 py-3">Parishioner</th>
                  <th className="px-5 py-3">Service</th>
                  <th className="px-5 py-3">Date / Time</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-slate-200 transition hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{r.fullname}</div>
                      <div className="text-xs text-slate-500">{r.email}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{r.service_type}</td>
                    <td className="px-5 py-4 text-slate-700">
                      {r.reservation_date} {r.reservation_time?.slice(0, 5)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        {['Pending', 'Under Review'].includes(r.status) && (
                          <button
                            type="button"
                            className="rounded-lg border border-[#0f2337] px-3 py-1.5 text-xs font-semibold text-[#0f2337] transition hover:bg-[#0f2337] hover:text-white"
                            onClick={() => openModal(r)}
                          >
                            Review
                          </button>
                        )}
                        {r.status === 'Approved' && (
                          <button
                            type="button"
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-600 hover:text-white"
                            onClick={() => updateReservation({ id: r.id, status: 'Completed' }).then(load)}
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && items.length === 0 && <p className="px-5 py-6 text-sm text-gray-500">No reservations found.</p>}
      </div>

      <Modal isOpen={!!modal} onClose={closeModal} title="Review Reservation" size="lg">
        {modal && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Reservation Overview</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-[#0f2337]">{modal.service_type}</p>
                  <p className="text-sm text-slate-600">
                    {modal.reservation_date} {modal.reservation_time?.slice(0, 5)}
                  </p>
                </div>
                <StatusBadge status={modal.status} />
              </div>
              <p className="mt-3 text-sm text-slate-600">{modal.requirements || 'No additional notes.'}</p>
              {modal.service_type === 'Mass Intention' && (
                <div className="mt-3 rounded-xl border border-[#f2e4bb] bg-[#fffaf0] p-3 text-sm text-slate-700">
                  <p><strong>Requested For:</strong> {modal.intention_name || 'Not provided'}</p>
                  <p className="mt-1"><strong>Prayer Intention:</strong> {modal.prayer_intention || 'Not provided'}</p>
                  <p className="mt-1"><strong>Fee:</strong> ₱{Number(modal.payment_amount || 100).toFixed(2)}</p>
                  <p className="mt-1"><strong>Contact:</strong> {modal.phone || 'Not available'}</p>
                </div>
              )}
              {modal.service_type === 'Funeral' && (() => {
                const details = parseServiceDetails(modal.service_details);
                return (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <p><strong>Deceased:</strong> {details.deceased_name || 'Not provided'}</p>
                    <p className="mt-1"><strong>Date of Death:</strong> {details.date_of_death || 'Not provided'}</p>
                    <p className="mt-1"><strong>Cemetery:</strong> {details.cemetery_type || 'Not provided'}</p>
                    <p className="mt-1"><strong>Funeral Service:</strong> {details.funeral_service || 'Not provided'}</p>
                    <p className="mt-1"><strong>Residence:</strong> {details.residence || 'Not provided'}</p>
                  </div>
                );
              })()}
              {modal.service_type === 'Private Mass' && (() => {
                const details = parseServiceDetails(modal.service_details);
                return (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <p><strong>Purpose:</strong> {details.purpose || 'Not provided'}</p>
                    <p className="mt-1"><strong>Location:</strong> {details.location_type || 'Not provided'}</p>
                    <p className="mt-1"><strong>Address:</strong> {[details.house_block_lot, details.barangay, details.municipality, details.province].filter(Boolean).join(', ') || 'Not provided'}</p>
                    <p className="mt-1"><strong>Location Contact:</strong> {details.location_contact_name || 'Not provided'} {details.location_contact_number ? `(${details.location_contact_number})` : ''}</p>
                  </div>
                );
              })()}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Documents</h4>

              {loadingDocs ? (
                <div className="text-sm text-gray-500">Loading documents...</div>
              ) : documentSummary ? (
                <>
                  <div className="mb-4">
                    <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                      <span>Document Progress</span>
                      <span>{documentSummary.verified}/{documentSummary.total_required} Verified</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-200">
                      <div
                        className="h-2.5 rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${(documentSummary.verified / Math.max(documentSummary.total_required, 1)) * 100}%` }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                      <span className="text-emerald-600">Verified: {documentSummary.verified}</span>
                      <span className="text-slate-500">Pending: {documentSummary.pending}</span>
                      <span className="text-red-600">Rejected: {documentSummary.rejected}</span>
                      {documentSummary.missing > 0 && <span className="text-amber-600">Missing: {documentSummary.missing}</span>}
                    </div>
                  </div>

                  {documents.length > 0 ? (
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {documents.map((doc) => (
                        <div key={doc.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-slate-800">{doc.document_name}</p>
                              <p className="text-xs text-slate-500">{doc.original_filename}</p>
                              <p className="mt-1 text-[11px] text-slate-400">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${DOCUMENT_STATUS_COLORS[doc.status]}`}>
                              {doc.status}
                            </span>
                          </div>

                          {doc.remarks && <p className="mb-2 text-xs italic text-slate-600">"{doc.remarks}"</p>}

                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="text-xs font-medium text-[#0f2337] underline" onClick={() => handlePreview(doc)}>
                              {isImageMime(doc.mime_type) ? 'Preview' : 'Download'}
                            </button>
                            {doc.status === 'Pending' && (
                              <>
                                <button type="button" className="text-xs font-medium text-emerald-600 underline" onClick={() => handleDocumentAction(doc.id, 'Verified')}>
                                  Verify
                                </button>
                                <button
                                  type="button"
                                  className="text-xs font-medium text-red-600 underline"
                                  onClick={() => {
                                    const remarks = prompt('Enter rejection reason:');
                                    if (remarks?.trim()) {
                                      handleDocumentAction(doc.id, 'Rejected', remarks.trim());
                                    }
                                  }}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {doc.status === 'Rejected' && (
                              <button type="button" className="text-xs font-medium text-emerald-600 underline" onClick={() => handleDocumentAction(doc.id, 'Verified')}>
                                Re-verify
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No documents uploaded.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">No documents available.</p>
              )}
            </div>

            {documentSummary && !documentSummary.complete && ['Pending', 'Under Review'].includes(modal.status) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                ⚠️ Reservation cannot be approved until all required documents are verified.
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">Reservation Remarks</label>
              <textarea
                className="input-field min-h-[100px]"
                placeholder="Remarks (optional)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => handleAction('Approved')}
                disabled={actionLoading || loadingDocs || !documentSummary || !documentSummary.complete}
              >
                {actionLoading ? 'Processing...' : 'Approve'}
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                onClick={() => handleAction('Rejected')}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ImagePreviewModal
        isOpen={!!previewDoc && !!previewUrl}
        src={previewUrl}
        alt={previewDoc?.document_name}
        title={previewDoc?.document_name || 'Image Preview'}
        onClose={closePreview}
      />
    </DashboardLayout>
  );
}
