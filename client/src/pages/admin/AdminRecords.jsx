import { useCallback, useEffect, useRef, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatusBadge from '../../components/cards/StatusBadge';
import LoadingSpinner from '../../components/forms/LoadingSpinner';
import Modal from '../../components/forms/Modal';
import ImagePreviewModal from '../../components/forms/ImagePreviewModal';
import { SERVICE_TYPES } from '../../utils/constants';
import {
  fetchReservationDocument,
  getRecordArchive,
  getReservationRecordDetail,
  getUnlinkedRecordDetail,
  deleteReservationRecord,
  deleteUnlinkedRecord,
} from '../../services/api';

function formatDate(value) {
  if (!value) return '—';
  return String(value).slice(0, 10);
}

function formatDateTime(date, time) {
  if (!date) return '—';
  const timePart = time ? ` ${String(time).slice(0, 5)}` : '';
  return `${formatDate(date)}${timePart}`;
}

function formatTime(value) {
  if (!value) return '—';
  return String(value).slice(0, 5);
}

function DetailField({ label, value, className = '' }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</dt>
      <dd className="text-sm text-gray-800 break-words">{value || '—'}</dd>
    </div>
  );
}

function DetailSection({ title, children }) {
  return (
    <section>
      <h4 className="text-sm font-semibold text-parish-blue mb-3 pb-2 border-b border-gray-100">{title}</h4>
      {children}
    </section>
  );
}

function isImageMime(mimeType) {
  return mimeType && mimeType.startsWith('image/');
}

function isPdfMime(mimeType) {
  return mimeType === 'application/pdf';
}

function getDocMime(doc) {
  if (doc?.mime_type) return doc.mime_type;
  const name = String(doc?.original_filename || '').toLowerCase();
  if (/\.(jpe?g)$/.test(name)) return 'image/jpeg';
  if (/\.png$/.test(name)) return 'image/png';
  if (/\.pdf$/.test(name)) return 'application/pdf';
  return '';
}

const DOCUMENT_STATUS_COLORS = {
  Pending: 'bg-gray-200 text-gray-700',
  Verified: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
};

function PdfIcon({ className = 'w-10 h-10 text-gray-400' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function UploadedDocumentsSection({ documents = [] }) {
  const blobUrlsRef = useRef([]);
  const [thumbnails, setThumbnails] = useState({});
  const [thumbErrors, setThumbErrors] = useState({});
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    let cancelled = false;
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
    setThumbnails({});
    setThumbErrors({});

    const imageDocs = documents.filter((doc) => isImageMime(doc.mime_type));

    imageDocs.forEach(async (doc) => {
      try {
        const { blob } = await fetchReservationDocument(doc.id);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobUrlsRef.current.push(url);
        setThumbnails((prev) => ({ ...prev, [doc.id]: url }));
      } catch {
        if (!cancelled) {
          setThumbErrors((prev) => ({ ...prev, [doc.id]: true }));
        }
      }
    });

    return () => {
      cancelled = true;
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current = [];
    };
  }, [documents]);

  const closePreview = () => {
    setPreviewDoc(null);
    setPreviewUrl(null);
  };

  const openImagePreview = (doc) => {
    const url = thumbnails[doc.id];
    if (url) {
      setPreviewUrl(url);
      setPreviewDoc(doc);
    }
  };

  const handleDownload = async (doc) => {
    setActionLoading(`download-${doc.id}`);
    try {
      const { blob } = await fetchReservationDocument(doc.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = doc.original_filename || doc.document_name;
      document.body.appendChild(anchor);
      anchor.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
    } catch (err) {
      alert(err.message || 'Failed to download file');
    } finally {
      setActionLoading(null);
    }
  };

  const handleView = async (doc) => {
    setActionLoading(`view-${doc.id}`);
    try {
      const { blob } = await fetchReservationDocument(doc.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      alert(err.message || 'Failed to open file');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <DetailSection title="Uploaded Documents">
        {documents.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {documents.map((doc) => {
              const isImage = isImageMime(doc.mime_type);
              const isPdf = isPdfMime(doc.mime_type);
              const thumbUrl = thumbnails[doc.id];
              const thumbFailed = thumbErrors[doc.id];
              const isDownloading = actionLoading === `download-${doc.id}`;
              const isViewing = actionLoading === `view-${doc.id}`;

              return (
                <div
                  key={doc.id}
                  className="flex gap-3 border border-gray-100 rounded-lg p-3 bg-gray-50"
                >
                  <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-white border border-gray-200">
                    {isImage ? (
                      thumbUrl ? (
                        <button
                          type="button"
                          className="w-full h-full block cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-parish-blue/40"
                          onClick={() => openImagePreview(doc)}
                          title="Click to view larger"
                        >
                          <img
                            src={thumbUrl}
                            alt={doc.original_filename}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : thumbFailed ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-xs text-red-500 px-1 text-center">
                          Preview unavailable
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 animate-pulse">
                          <span className="text-xs text-gray-400">Loading…</span>
                        </div>
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <PdfIcon />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-800">{doc.document_name}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                          DOCUMENT_STATUS_COLORS[doc.status] || 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate" title={doc.original_filename}>
                      {doc.original_filename}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {doc.service_type} · Uploaded {formatDate(doc.uploaded_at)}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {isImage && thumbUrl && (
                        <button
                          type="button"
                          className="text-xs text-parish-blue underline disabled:opacity-50"
                          onClick={() => openImagePreview(doc)}
                        >
                          View
                        </button>
                      )}
                      {isPdf && (
                        <button
                          type="button"
                          className="text-xs text-parish-blue underline disabled:opacity-50"
                          onClick={() => handleView(doc)}
                          disabled={isViewing}
                        >
                          {isViewing ? 'Opening…' : 'View'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-xs text-gray-600 underline disabled:opacity-50"
                        onClick={() => handleDownload(doc)}
                        disabled={isDownloading}
                      >
                        {isDownloading ? 'Downloading…' : 'Download'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">No uploaded files</p>
        )}
      </DetailSection>

      <ImagePreviewModal
        isOpen={!!previewDoc && !!previewUrl}
        src={previewUrl}
        alt={previewDoc?.original_filename}
        title={previewDoc?.document_name || 'Image Preview'}
        onClose={closePreview}
      />
    </>
  );
}

function RecordDetailsContent({ detail }) {
  const {
    parishioner,
    reservations = [],
    appointments = [],
    parish_records: parishRecords = [],
    documents = [],
  } = detail;

  return (
    <div className="space-y-6">
      <DetailSection title="Parishioner Information">
        <dl className="grid sm:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
          <DetailField label="Full Name" value={parishioner.fullname} />
          <DetailField label="Email" value={parishioner.email} />
          <DetailField label="Contact Number" value={parishioner.phone} />
          <DetailField label="Member Since" value={formatDate(parishioner.member_since)} />
          <DetailField label="Address" value={parishioner.address} className="sm:col-span-2" />
        </dl>
      </DetailSection>

      <DetailSection title="Service Requests & Reservations">
        {reservations.length > 0 ? (
          <div className="space-y-3">
            {reservations.map((reservation) => (
              <div key={reservation.id} className="border border-gray-100 rounded-lg p-4 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="font-medium text-gray-800">{reservation.service_type}</span>
                  <StatusBadge status={reservation.status} />
                </div>
                <dl className="grid sm:grid-cols-2 gap-3">
                  <DetailField label="Reservation Date" value={formatDate(reservation.reservation_date)} />
                  <DetailField label="Preferred Time" value={formatTime(reservation.reservation_time)} />
                  <DetailField label="Date Submitted" value={formatDate(reservation.created_at)} />
                  <DetailField label="Reservation ID" value={`RES-${String(reservation.id).padStart(5, '0')}`} />
                  <DetailField label="Status" value={reservation.status} />
                  <DetailField
                    label="Personal Information &amp; Requirements"
                    value={reservation.requirements}
                    className="sm:col-span-2 whitespace-pre-wrap"
                  />
                  {reservation.remarks && (
                    <DetailField label="Remarks" value={reservation.remarks} className="sm:col-span-2" />
                  )}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">No service reservations on file.</p>
        )}
      </DetailSection>

      {appointments.length > 0 && (
        <DetailSection title="Appointments">
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="border border-gray-100 rounded-lg p-4 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="font-medium text-gray-800">{appointment.purpose}</span>
                  <StatusBadge status={appointment.status} />
                </div>
                <dl className="grid sm:grid-cols-2 gap-3">
                  <DetailField label="Appointment Date" value={formatDate(appointment.appointment_date)} />
                  <DetailField label="Preferred Time" value={formatTime(appointment.appointment_time)} />
                  <DetailField label="Date Submitted" value={formatDate(appointment.created_at)} />
                  <DetailField label="Status" value={appointment.status} />
                  {appointment.remarks && (
                    <DetailField label="Remarks" value={appointment.remarks} className="sm:col-span-2" />
                  )}
                </dl>
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {parishRecords.length > 0 && (
        <DetailSection title="Archive Notes">
          <div className="space-y-3">
            {parishRecords.map((note) => (
              <div key={note.id} className="border border-gray-100 rounded-lg p-4 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="font-medium text-gray-800">{note.service_type}</span>
                  <span className="text-xs text-gray-400">{formatDate(note.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{note.details}</p>
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      <UploadedDocumentsSection documents={documents} />
    </div>
  );
}

function formatApiError(err, fallback = 'Failed to load records. Please try again.') {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.message) return err.message;
  return fallback;
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function EmptyState({ hasFilters }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-800 mb-1">No records found</h3>
      <p className="text-sm text-gray-500 max-w-sm">
        {hasFilters
          ? 'No parishioner records match your search or filters. Try adjusting your criteria.'
          : 'There are no parishioner records in the archive yet.'}
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="card">
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">Unable to load records</h3>
        <p className="text-sm text-gray-500 max-w-md mb-4">{message}</p>
        <button type="button" className="btn-primary text-sm" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  );
}

export default function AdminRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ q: '', service: '', status: '' });
  const [filters, setFilters] = useState({ q: '', service: '', status: '' });
  const [viewRecord, setViewRecord] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getRecordArchive(filters);
      setRecords(response.data.records || []);
    } catch (err) {
      setError(formatApiError(err));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(draft);
  };

  const handleClearFilters = () => {
    const cleared = { q: '', service: '', status: '' };
    setDraft(cleared);
    setFilters(cleared);
  };

  const hasActiveFilters = Boolean(filters.q || filters.service || filters.status);

  const closeView = () => {
    setViewRecord(null);
    setDetail(null);
    setDetailError('');
  };

  const openView = async (record) => {
    setViewRecord(record);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);

    try {
      const response =
        record.is_unlinked
          ? await getUnlinkedRecordDetail(record.parish_record_id)
          : await getReservationRecordDetail(record.reservation_id);
      setDetail(response.data);
    } catch (err) {
      setDetailError(formatApiError(err, 'Failed to load record details.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const recordKey = (record) => record.reservation_id ?? `unlinked-${record.parish_record_id}`;

  const openDeleteConfirm = (record) => {
    setDeleteError('');
    setDeleteTarget(record);
  };

  const closeDeleteConfirm = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      if (deleteTarget.is_unlinked) {
        await deleteUnlinkedRecord(deleteTarget.parish_record_id);
      } else {
        await deleteReservationRecord(deleteTarget.reservation_id);
      }
      setRecords((prev) => prev.filter((r) => recordKey(r) !== recordKey(deleteTarget)));
      if (viewRecord && recordKey(viewRecord) === recordKey(deleteTarget)) {
        closeView();
      }
      setDeleteTarget(null);
      setSuccessMessage('The parishioner record has been permanently deleted.');
    } catch (err) {
      setDeleteError(formatApiError(err, 'The record could not be deleted. Please try again.'));
    } finally {
      setDeleting(false);
    }
  };

  const stats = {
    total: records.length,
  };

  const serviceFolders = SERVICE_TYPES.map((service) => ({
    service,
    records: records.filter((record) => record.service_type === service),
  }));

  const scrollToServiceFolder = (service) => {
    const id = `record-folder-${service.toLowerCase().replace(/\s+/g, '-')}`;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <DashboardLayout>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-xl border border-[#e7dfd2] bg-[#fffdf8] p-4 shadow-[0_8px_22px_rgba(83,65,34,0.06)]">
          <p className="text-xs font-semibold text-[#6e7274]">Total Records</p>
          <p className="mt-2 font-display text-3xl text-[#1f3342]">{stats.total}</p>
          <span className="mt-2 inline-flex rounded-full bg-[#f5ead5] px-2 py-1 text-[10px] font-medium text-[#a6813f]">All</span>
        </div>
        {serviceFolders.map(({ service, records: folderRecords }) => (
          <div key={service} className="rounded-xl border border-[#e7dfd2] bg-[#fffdf8] p-4 shadow-[0_8px_22px_rgba(83,65,34,0.06)]">
            <p className="truncate text-xs font-semibold text-[#6e7274]">{service}</p>
            <p className="mt-2 font-display text-3xl text-[#1f3342]">{folderRecords.length}</p>
            <button type="button" className="mt-2 inline-flex rounded-full bg-[#f5ead5] px-3 py-1 text-[10px] font-medium text-[#a6813f] transition hover:bg-[#ead9b8]" onClick={() => scrollToServiceFolder(service)}>View</button>
          </div>
        ))}
      </div>

      <form onSubmit={handleSearch} className="mb-6 rounded-xl border border-[#e7dfd2] bg-[#fffdf8] p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mt-1 text-sm text-[#6e7274]">Find records by name or service type</p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="text-sm font-medium text-[#a6813f] transition hover:text-[#775b25]"
              onClick={handleClearFilters}
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_0.9fr_auto]">
          <div>
            <label htmlFor="records-search" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a7d7f]">
              Search
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <SearchIcon />
              </span>
              <input
                id="records-search"
                className="w-full rounded-full border border-[#e7dfd2] bg-white px-3.5 py-2.5 pl-10 text-xs text-[#58616a] outline-none focus:border-[#b18a45] focus:ring-2 focus:ring-[#d7b57a]/20"
                placeholder="Search by full name, email, or phone"
                value={draft.q}
                onChange={(e) => setDraft({ ...draft, q: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="records-service" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a7d7f]">
              Service Type
            </label>
            <select
              id="records-service"
              className="w-full rounded-full border border-[#e7dfd2] bg-white px-3.5 py-2.5 text-xs text-[#58616a] outline-none focus:border-[#b18a45] focus:ring-2 focus:ring-[#d7b57a]/20"
              value={draft.service}
              onChange={(e) => setDraft({ ...draft, service: e.target.value })}
            >
              <option value="">All service types</option>
              {SERVICE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="w-full rounded-full bg-[#b18a45] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#967338] lg:w-auto">
            Search
          </button>
        </div>
      </form>

      {successMessage && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-sm font-semibold text-emerald-800">Record Deleted Successfully</p>
          <p className="mt-1 text-sm text-emerald-700">{successMessage}</p>
        </div>
      )}

      {loading ? (
        <div className="card border border-slate-200 bg-slate-50">
          <LoadingSpinner />
          <p className="pb-6 text-center text-sm text-slate-500">Loading records...</p>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
        ) : (
          records.length === 0 ? (
          <div className="card border border-slate-200 p-0">
            <EmptyState hasFilters={hasActiveFilters} />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Record Management</p>
            </div>

            {serviceFolders.map(({ service, records: folderRecords }) => (
              <section key={service} id={`record-folder-${service.toLowerCase().replace(/\s+/g, '-')}`} className="card scroll-mt-6 overflow-hidden border border-slate-200 p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <div>
                    <h2 className="font-display text-2xl text-[#0f2337]">📁 {service}</h2>
                    <p className="mt-1 text-xs text-slate-500">{folderRecords.length} client folder{folderRecords.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                {folderRecords.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-500">No reservations in this service folder.</p>
                ) : (
                  <div className="grid gap-4 p-5 lg:grid-cols-2">
                    {folderRecords.map((record) => (
                      <article key={recordKey(record)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#d7b57a] hover:shadow-md">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl" aria-hidden="true">📁</span>
                          <div className="min-w-0 flex-1">
                            <h3 className="break-words font-semibold text-[#0f2337]">{record.fullname}</h3>
                            <p className="mt-1 text-xs text-slate-500">Reservation #{record.reservation_id || 'manual'} · Submitted {formatDate(record.created_at || record.latest_activity_at)}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {record.status && record.status !== '—' && <StatusBadge status={record.status} />}
                              <span className="text-xs text-slate-500">{formatDateTime(record.record_date, record.record_time)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            onClick={() => openDeleteConfirm(record)}
                          >
                            🗑 Delete
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center rounded-lg bg-[#0f2337] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#18324c]"
                            onClick={() => openView(record)}
                          >
                            Open Folder
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
          )
      )}

      <Modal isOpen={!!viewRecord} onClose={closeView} title="Record Details" size="lg">
        {viewRecord && (
          <p className="mb-4 -mt-2 text-sm text-slate-600">
            {viewRecord.fullname}
            {viewRecord.is_unlinked && (
              <span className="ml-2 rounded bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-orange-600">
                Manual entry
              </span>
            )}
          </p>
        )}

        {detailLoading ? (
          <div className="py-8">
            <LoadingSpinner />
            <p className="mt-2 text-center text-sm text-slate-500">Loading record details...</p>
          </div>
        ) : detailError ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-sm text-red-600">{detailError}</p>
            <button type="button" className="btn-primary text-sm" onClick={() => viewRecord && openView(viewRecord)}>
              Try again
            </button>
          </div>
        ) : detail ? (
          <RecordDetailsContent detail={detail} />
        ) : null}
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={closeDeleteConfirm} title="Delete Parishioner Record?" size="sm">
        {deleteTarget && (
          <div>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <span className="font-semibold text-[#0f2337]">{deleteTarget.fullname}</span>&apos;s record?
              This action will remove the record and its associated documents. This action cannot be undone.
            </p>
            {deleteError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-semibold text-red-800">Unable to Delete Record</p>
                <p className="mt-1 text-sm text-red-700">{deleteError}</p>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                onClick={closeDeleteConfirm}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
