import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatusBadge from '../components/cards/StatusBadge';
import LoadingSpinner from '../components/forms/LoadingSpinner';
import DocumentUpload from '../components/forms/DocumentUpload';
import {
  SERVICE_TYPES,
  SERVICE_LABELS,
  SERVICE_SCHEDULE,
  SERVICE_REQUIREMENTS,
  PARISH_LOCATION,
} from '../utils/constants';
import {
  getReservations,
  createReservation,
  checkAvailability,
  checkMonthlyAvailability,
  getDocumentRequirements,
  uploadReservationDocument,
  getReservationDocuments,
} from '../services/api';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SERVICE_DETAIL_FIELDS = {
  Marriage: [
    { key: 'bride_name', label: 'Bride Name' },
    { key: 'groom_name', label: 'Groom Name' },
    { key: 'wedding_date', label: 'Proposed Wedding Date' },
    { key: 'contact_person', label: 'Contact Person' },
    { key: 'wedding_venue', label: 'Preferred Venue / Ceremony Note' },
  ],
  Funeral: [
    { key: 'deceased_name', label: 'Deceased Name' },
    { key: 'family_contact', label: 'Family Contact Person' },
    { key: 'relationship', label: 'Relationship to Deceased' },
    { key: 'funeral_date', label: 'Preferred Funeral Date' },
    { key: 'service_details', label: 'Service Details / Notes' },
  ],
  Baptism: [
    { key: 'child_name', label: 'Child Name' },
    { key: 'child_birthdate', label: 'Child Birthdate' },
    { key: 'parents_name', label: 'Parents / Guardians' },
    { key: 'godparents', label: 'Godparents' },
    { key: 'baptism_date', label: 'Preferred Baptism Date' },
  ],
  'Mass Intention': [
    { key: 'intention_name', label: 'Intention Name / Requested For' },
    { key: 'offering_amount', label: 'Offering Amount (Optional)' },
    { key: 'celebrant_note', label: 'Special Request / Prayer Intention' },
  ],
  'Private Mass': [
    { key: 'event_name', label: 'Event / Occasion Name' },
    { key: 'attendees_count', label: 'Expected Attendees' },
    { key: 'preferred_priest', label: 'Preferred Priest (Optional)' },
    { key: 'purpose_note', label: 'Purpose of the Mass' },
  ],
};

function getDefaultServiceDetails(serviceType) {
  const fields = SERVICE_DETAIL_FIELDS[serviceType] || [];
  return Object.fromEntries(fields.map((field) => [field.key, '']));
}

function buildServiceRequirements(serviceDetails, notes) {
  const lines = [];
  Object.entries(serviceDetails || {}).forEach(([key, value]) => {
    const field = Object.values(SERVICE_DETAIL_FIELDS)
      .flat()
      .find((item) => item.key === key);
    if (value && value.toString().trim()) {
      lines.push(`${field?.label || key}: ${value}`);
    }
  });

  if (notes && notes.trim()) {
    lines.push(`Additional Notes: ${notes.trim()}`);
  }

  return lines.join('\n');
}

function toIsoMonth(dateValue) {
  const y = dateValue.getFullYear();
  const m = String(dateValue.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function toIsoDate(dateValue) {
  const y = dateValue.getFullYear();
  const m = String(dateValue.getMonth() + 1).padStart(2, '0');
  const d = String(dateValue.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatMonthLabel(monthIso) {
  const [year, month] = monthIso.split('-').map(Number);
  const dateValue = new Date(year, month - 1, 1);
  return dateValue.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function formatSlotTime(time) {
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
}

export default function Reservation() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    service_type: 'Marriage',
    reservation_date: '',
    reservation_time: '',
    requirements: '',
    serviceDetails: getDefaultServiceDetails('Marriage'),
  });
  const [slotItems, setSlotItems] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(toIsoMonth(new Date()));
  const [dateStatuses, setDateStatuses] = useState({});
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  
  // Document-related state
  const [docRequirements, setDocRequirements] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [reservationDocuments, setReservationDocuments] = useState({});
  const [loadingDocs, setLoadingDocs] = useState({});
  const fetchedDocIds = useRef(new Set());
  const submitInProgress = useRef(false);

  const [searchParams] = useSearchParams();
  const formRef = useRef(null);

  const refreshMonthlyStatuses = (serviceType, monthIso) =>
    checkMonthlyAvailability(monthIso, serviceType)
      .then((r) => setDateStatuses(r.data.dates || {}))
      .catch(() => setDateStatuses({}));

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true);
      setError('');
      setMsg('');
      requestAnimationFrame(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [searchParams]);

  const load = () => {
    setLoading(true);
    getReservations()
      .then((r) => setReservations(r.data.reservations || []))
      .catch(() => setError('Failed to load reservations. Please refresh the page.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Load document requirements when service type changes
  useEffect(() => {
    if (form.service_type) {
      getDocumentRequirements().then((r) => {
        setDocRequirements(r.data[form.service_type] || []);
      });
    }
  }, [form.service_type]);

  // Load documents for existing reservations (once per reservation)
  useEffect(() => {
    reservations.forEach((r) => {
      if (fetchedDocIds.current.has(r.id)) return;
      fetchedDocIds.current.add(r.id);
      setLoadingDocs((prev) => ({ ...prev, [r.id]: true }));
      getReservationDocuments(r.id)
        .then((res) => {
          setReservationDocuments((prev) => ({
            ...prev,
            [r.id]: res.data.documents || [],
          }));
        })
        .catch(() => {
          setReservationDocuments((prev) => ({ ...prev, [r.id]: [] }));
        })
        .finally(() => {
          setLoadingDocs((prev) => ({ ...prev, [r.id]: false }));
        });
    });
  }, [reservations]);

  useEffect(() => {
    if (form.reservation_date && form.service_type) {
      checkAvailability(form.reservation_date, form.service_type).then((r) => {
        const available = r.data.available || [];
        const slotList = r.data.slots || [];
        setSlotItems(slotList);

        setDateStatuses((prev) => {
          const totalSlots = slotList.length;
          const availableCount = available.length;
          let status = prev[form.reservation_date]?.status;
          if (totalSlots > 0) {
            status = availableCount === 0 ? 'full' : 'available';
          }
          if (!status) return prev;
          return {
            ...prev,
            [form.reservation_date]: {
              ...(prev[form.reservation_date] || {}),
              status,
              available_count: availableCount,
              total_slots: totalSlots,
            },
          };
        });
      });
    } else {
      setSlotItems([]);
    }
  }, [form.reservation_date, form.service_type]);

  useEffect(() => {
    if (!form.service_type || !calendarMonth) {
      setDateStatuses({});
      return;
    }
    refreshMonthlyStatuses(form.service_type, calendarMonth);
  }, [form.service_type, calendarMonth]);

  const todayIso = toIsoDate(new Date());
  const minDate = (() => {
    if (form.service_type !== 'Private Mass') return todayIso;
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return toIsoDate(d);
  })();

  const monthDate = (() => {
    const [year, month] = calendarMonth.split('-').map(Number);
    return new Date(year, month - 1, 1);
  })();

  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const firstWeekday = monthDate.getDay();
  const dateCells = Array.from({ length: firstWeekday + daysInMonth }, (_, idx) => {
    if (idx < firstWeekday) return null;
    const day = idx - firstWeekday + 1;
    return toIsoDate(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
  });

  const handleServiceChange = (serviceType) => {
    setForm({
      ...form,
      service_type: serviceType,
      reservation_date: '',
      reservation_time: '',
      serviceDetails: getDefaultServiceDetails(serviceType),
    });
    setCalendarMonth(toIsoMonth(new Date()));
  };

  const handleDateSelect = (iso) => {
    setForm({ ...form, reservation_date: iso, reservation_time: '' });
    if (iso.slice(0, 7) !== calendarMonth) {
      setCalendarMonth(iso.slice(0, 7));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitInProgress.current) return;
    setError('');
    setMsg('');
    if (!form.reservation_time) {
      setError('Please select an available time slot.');
      return;
    }
    
    // Check if required documents are uploaded
    const requiredDocs = docRequirements.filter(d => d.required);
    const missingRequired = requiredDocs.filter(d => !uploadedFiles[d.type]);
    if (missingRequired.length > 0) {
      setError(`Please upload all required documents: ${missingRequired.map(d => d.name).join(', ')}`);
      return;
    }

    submitInProgress.current = true;
    try {
      setUploadingDocs(true);
      const mergedRequirements = buildServiceRequirements(form.serviceDetails, form.requirements);
      const payload = {
        ...form,
        requirements: mergedRequirements,
      };

      const response = await createReservation(payload);
      const reservationId = response.data.id;
      
      const uploadPromises = Object.entries(uploadedFiles).map(([docType, file]) => {
        const formData = new FormData();
        formData.append('reservation_id', reservationId);
        formData.append('document_type', docType);
        formData.append('document', file);
        return uploadReservationDocument(formData);
      });
      
      try {
        await Promise.all(uploadPromises);
        setMsg('Reservation submitted successfully with documents!');
      } catch (uploadErr) {
        setError(
          `Reservation submitted, but some documents failed to upload: ${uploadErr.message || 'Unknown error'}. ` +
          'Please upload missing documents from your reservation list below.'
        );
      }
      
      await refreshMonthlyStatuses(form.service_type, calendarMonth);
      setShowForm(false);
      setForm({
        service_type: 'Marriage',
        reservation_date: '',
        reservation_time: '',
        requirements: '',
        serviceDetails: getDefaultServiceDetails('Marriage'),
      });
      setUploadedFiles({});
      fetchedDocIds.current.add(reservationId);
      load();
    } catch (err) {
      setError(err.message || 'Failed to submit reservation');
    } finally {
      setUploadingDocs(false);
      submitInProgress.current = false;
    }
  };

  const reloadReservationDocuments = async (reservationId) => {
    const res = await getReservationDocuments(reservationId);
    setReservationDocuments((prev) => ({
      ...prev,
      [reservationId]: res.data.documents || [],
    }));
  };

  const handleDocumentReplace = (reservationId, docType) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png,.pdf';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setError('');
      setMsg('');

      if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
        alert('Only JPG, PNG, and PDF files are allowed');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit');
        return;
      }

      try {
        const formData = new FormData();
        formData.append('reservation_id', reservationId);
        formData.append('document_type', docType);
        formData.append('document', file);
        await uploadReservationDocument(formData);
        await reloadReservationDocuments(reservationId);
        setMsg('Document replaced successfully. It will be reviewed by the parish office.');
      } catch (err) {
        setError('Failed to replace document: ' + (err.message || 'Unknown error'));
        try {
          await reloadReservationDocuments(reservationId);
        } catch {
          // Keep the replace error visible if refresh also fails.
        }
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  const totalReservations = reservations.length;
  const pendingCount = reservations.filter((item) => ['Pending', 'Submitted', 'In Review'].includes(item.status)).length;
  const approvedCount = reservations.filter((item) => ['Approved', 'Confirmed'].includes(item.status)).length;

  return (
    <DashboardLayout>
      <div className="mb-6 rounded-[32px] border border-[#e8dfd0] bg-gradient-to-r from-[#0f2337] via-[#102b40] to-[#183b56] px-5 py-6 shadow-[0_24px_55px_rgba(15,31,45,0.18)] sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#d7b57a]">Reservation status</p>
            <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">View Reservation</h1>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 backdrop-blur-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-[#d7b57a]" />
            {totalReservations} total request{totalReservations === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-[#e8dfd0] bg-white p-5 shadow-[0_14px_30px_rgba(15,31,45,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Total</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600">All</span>
          </div>
          <div className="mt-4 text-4xl font-display text-[#0f2337]">{totalReservations}</div>
        </div>
        <div className="rounded-[24px] border border-[#f0e3c0] bg-[#fffaf0] p-5 shadow-[0_14px_30px_rgba(15,31,45,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Pending</span>
            <span className="rounded-full bg-[#f5e3b8] px-2.5 py-1 text-[10px] font-medium text-[#8d6928]">Review</span>
          </div>
          <div className="mt-4 text-4xl font-display text-[#b68a3b]">{pendingCount}</div>
        </div>
        <div className="rounded-[24px] border border-[#d9ebdf] bg-[#f3f9f4] p-5 shadow-[0_14px_30px_rgba(15,31,45,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Approved</span>
            <span className="rounded-full bg-[#d8eede] px-2.5 py-1 text-[10px] font-medium text-[#2d6a4b]">Ready</span>
          </div>
          <div className="mt-4 text-4xl font-display text-[#1a6a4a]">{approvedCount}</div>
        </div>
      </div>

      {msg && <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{msg}</div>}

      {showForm && (
        <form ref={formRef} onSubmit={handleSubmit} className="mb-6 overflow-hidden rounded-[30px] border border-[#e8dfd0] bg-white shadow-[0_22px_45px_rgba(15,31,45,0.08)]">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d7b57a]">New request</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#0f2337]">Reservation Request</h2>
              </div>
              <div className="rounded-full border border-[#e8dfd0] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                {PARISH_LOCATION.name}
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

              <div className="rounded-[24px] border border-slate-200 bg-[#f8fafc] p-4 sm:p-5">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Service Type</label>
                <select
                  className="input-field"
                  value={form.service_type}
                  onChange={(e) => handleServiceChange(e.target.value)}
                >
                  {SERVICE_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {SERVICE_LABELS[s] || s}
                    </option>
                  ))}
                </select>

                <div className="mt-4 rounded-2xl border border-[#f2e4bb] bg-[#fffaf0] p-3 text-sm text-slate-700">
                  <div className="mb-1.5"><span className="font-semibold text-[#0f2337]">Parish schedule:</span> {SERVICE_SCHEDULE[form.service_type]}</div>
                  <div><span className="font-semibold text-[#0f2337]">Requirements:</span> {SERVICE_REQUIREMENTS[form.service_type]}</div>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-[#f8fafc] p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Select Date</label>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">Calendar</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                      onClick={() => {
                        const d = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
                        setCalendarMonth(toIsoMonth(d));
                      }}
                    >
                      ← Prev
                    </button>
                    <div className="text-sm font-semibold text-[#0f2337]">{formatMonthLabel(calendarMonth)}</div>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                      onClick={() => {
                        const d = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
                        setCalendarMonth(toIsoMonth(d));
                      }}
                    >
                      Next →
                    </button>
                  </div>

                  <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {WEEKDAY_LABELS.map((day) => (
                      <div key={day} className="py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {dateCells.map((iso, idx) => {
                      if (!iso) {
                        return <div key={`empty-${idx}`} className="h-11" />;
                      }
                      const status = dateStatuses[iso]?.status || 'unavailable';
                      const isSelected = form.reservation_date === iso;
                      const isPastOrTooSoon = iso < minDate;
                      const isAvailable = status === 'available' && !isPastOrTooSoon;
                      const isFull = status === 'full' && !isPastOrTooSoon;

                      let bgCls = 'border border-slate-200 bg-slate-100 text-slate-400';
                      if (isAvailable) bgCls = 'border border-emerald-300 bg-emerald-100 text-emerald-800';
                      if (isFull) bgCls = 'border border-red-300 bg-red-100 text-red-800';
                      if (isSelected) bgCls += ' ring-2 ring-[#0f2337] ring-offset-1';

                      return (
                        <button
                          key={iso}
                          type="button"
                          disabled={!isAvailable}
                          title={
                            isFull
                              ? 'Fully booked'
                              : isPastOrTooSoon
                                ? 'Not available'
                                : isAvailable
                                  ? 'Available — click to select'
                                  : 'Not available for this service'
                          }
                          className={`h-11 rounded-xl text-xs font-semibold transition ${bgCls} ${
                            isAvailable ? 'cursor-pointer hover:brightness-95' : 'cursor-not-allowed'
                          }`}
                          onClick={() => handleDateSelect(iso)}
                        >
                          {Number(iso.slice(8, 10))}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-3.5 rounded bg-emerald-100 ring-1 ring-emerald-300" /> Available</div>
                    <div className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-3.5 rounded bg-red-100 ring-1 ring-red-300" /> Fully booked</div>
                    <div className="flex items-center gap-1.5"><span className="inline-block h-3.5 w-3.5 rounded bg-slate-100 ring-1 ring-slate-300" /> Not available</div>
                  </div>

                  {form.reservation_date && (
                    <p className="mt-3 text-sm font-medium text-[#0f2337]">
                      Selected: {new Date(form.reservation_date + 'T12:00:00').toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-[#f8fafc] p-4 sm:p-5">
                <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Select Time Slot</label>
                {form.reservation_date ? (
                  slotItems.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {slotItems.map((slot) => {
                        const isAvailable = slot.status === 'available';
                        const isSelected = form.reservation_time === slot.time;
                        const base = 'w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition';
                        const cls = isAvailable
                          ? `bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 ${isSelected ? 'ring-2 ring-emerald-500' : ''}`
                          : 'border-red-300 bg-red-50 text-red-800 cursor-not-allowed';
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!isAvailable}
                            className={`${base} ${cls}`}
                            onClick={() => setForm({ ...form, reservation_time: slot.time })}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-base">{formatSlotTime(slot.time)}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isAvailable ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'}`}>
                                {isAvailable ? 'Available' : 'Full'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      No time slots are available for this service on the selected date. Choose a green date on the calendar or another service day per the parish schedule.
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                    Pick a green date on the calendar to see available time slots.
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-[#f8fafc] p-4 sm:p-5">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={form.requirements}
                  onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Documents</h3>
                  <span className="rounded-full bg-[#f5ead0] px-2 py-1 text-[10px] font-medium text-[#775b25]">Required</span>
                </div>
                <DocumentUpload requirements={docRequirements} onFilesChange={setUploadedFiles} />
              </div>

              <div className="rounded-[24px] border border-[#d7b57a] bg-[#fffaf0] p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#775b25]">Before you continue</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  <li>• Confirm your selected date and time.</li>
                  <li>• Upload all required documents before submitting.</li>
                  <li>• Your request will be reviewed by the parish office.</li>
                </ul>
              </div>

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={!form.reservation_date || !form.reservation_time || uploadingDocs}
              >
                {uploadingDocs ? 'Submitting...' : 'Submit Reservation'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-[30px] border border-[#e8dfd0] bg-white shadow-[0_22px_45px_rgba(15,31,45,0.08)]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#0f2337]">Reservation record</h2>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Updated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="px-5 py-4 font-semibold">Service</th>
                <th className="px-5 py-4 font-semibold">Date</th>
                <th className="px-5 py-4 font-semibold">Time</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Documents</th>
                <th className="px-5 py-4 font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => {
                const docs = reservationDocuments[r.id] || [];
                const verifiedCount = docs.filter(d => d.status === 'Verified').length;
                const rejectedCount = docs.filter(d => d.status === 'Rejected').length;
                const docPendingCount = docs.filter(d => d.status === 'Pending').length;
                const totalDocs = docs.length;

                return (
                  <tr key={r.id} className="border-b border-slate-200 align-top transition duration-200 hover:bg-slate-50/90">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-[#0f2337] font-semibold">{SERVICE_LABELS[r.service_type] || r.service_type}</span>
                        <span className="mt-1 text-[11px] uppercase tracking-[0.15em] text-slate-400">Request</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{r.reservation_date}</td>
                    <td className="px-5 py-4 text-slate-700">{formatSlotTime(r.reservation_time || '')}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-4">
                      {loadingDocs[r.id] ? (
                        <span className="text-xs text-slate-400">Loading...</span>
                      ) : totalDocs > 0 ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2 text-[11px] font-medium">
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">Verified {verifiedCount}</span>
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Pending {docPendingCount}</span>
                            <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">Rejected {rejectedCount}</span>
                          </div>
                          {rejectedCount > 0 && (
                            <div className="space-y-2 text-xs text-rose-700">
                              {docs.filter(d => d.status === 'Rejected').map(d => (
                                <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 px-2.5 py-2">
                                  <span>
                                    {d.document_name}
                                    {d.remarks && <span className="italic">: "{d.remarks}"</span>}
                                  </span>
                                  <button
                                    type="button"
                                    className="font-medium text-[#0f2337] underline underline-offset-2"
                                    onClick={() => handleDocumentReplace(r.id, d.document_type)}
                                  >
                                    Replace
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No documents</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{r.remarks || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {reservations.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            No reservations yet.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
