import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatusBadge from '../components/cards/StatusBadge';
import LoadingSpinner from '../components/forms/LoadingSpinner';
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  checkAppointmentAvailability,
  checkAppointmentMonthlyAvailability,
} from '../services/api';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PURPOSE_OPTIONS = [
  'Getting a Certificate',
  'Requesting a Church Record',
  'Record Inquiry',
  'Sacramental Inquiry',
  'Document Request',
  'Parish Office Inquiry',
  'Other',
];
const APPOINTMENT_STEPS = ['Personal Information', 'Purpose', 'Date & Time', 'Review & Submit'];

/** Current calendar date in Asia/Manila (YYYY-MM-DD), matching backend parishToday(). */
function manilaTodayIso() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date());
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

function getCalendarDateTitle(iso, status, todayIso) {
  const isPast = iso < todayIso || status === 'past';

  if (status === 'available' && !isPast) {
    return 'Available';
  }
  if (isPast) {
    return 'Past Date';
  }
  if (status === 'full') {
    return 'Fully Booked';
  }
  const dayOfWeek = new Date(`${iso}T12:00:00`).getDay();
  if (dayOfWeek === 0 || dayOfWeek === 2) {
    return 'Closed';
  }
  if (iso === todayIso && status === 'unavailable') {
    return 'No Remaining Slots Today';
  }
  return 'Not available';
}

export default function Appointment() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState({
    appointment_date: '',
    appointment_time: '',
    purpose: '',
    custom_purpose: '',
    fullname: '',
    email: '',
    phone: '',
    address: '',
  });
  const [slotItems, setSlotItems] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => manilaTodayIso().slice(0, 7));
  const [dateStatuses, setDateStatuses] = useState({});
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submitInProgress = useRef(false);
  const [cancelling, setCancelling] = useState(false);
  const cancelInProgress = useRef(false);

  const [searchParams] = useSearchParams();
  const formRef = useRef(null);

  const refreshMonthlyStatuses = (monthIso) =>
    checkAppointmentMonthlyAvailability(monthIso)
      .then((r) => {
        setDateStatuses(r.data.dates || {});
        return r.data.dates || {};
      })
      .catch(() => {
        setDateStatuses({});
        return {};
      });

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        fullname: prev.fullname || user.fullname || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
        address: prev.address || user.address || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowForm(true);
      setCurrentStep(0);
      setError('');
      setMsg('');
      requestAnimationFrame(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [searchParams]);

  const load = () => {
    getAppointments()
      .then((r) => setAppointments(r.data.appointments || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const selectedDate = form.appointment_date;

    if (!selectedDate) {
      setSlotItems([]);
      setLoadingSlots(false);
      return undefined;
    }

    setLoadingSlots(true);
    checkAppointmentAvailability(selectedDate)
      .then((r) => {
        if (cancelled) return;
        const available = r.data.available || [];
        const slotList = (r.data.slots || []).filter((slot) => slot.status === 'available');
        setSlotItems(
          slotList.length > 0
            ? slotList
            : available.map((time) => ({ time, status: 'available' }))
        );

        setDateStatuses((prev) => {
          const totalSlots = slotList.length;
          const availableCount = available.length;
          let status = prev[selectedDate]?.status;
          if (totalSlots > 0) {
            status = availableCount === 0 ? 'full' : 'available';
          } else if (status === 'available' || status === 'full') {
            // Day endpoint returned no slots (weekend/past) — keep monthly status
            return prev;
          }
          if (!status) return prev;
          return {
            ...prev,
            [selectedDate]: {
              ...(prev[selectedDate] || {}),
              status,
              available_count: availableCount,
              total_slots: totalSlots,
            },
          };
        });
      })
      .catch(() => {
        if (!cancelled) setSlotItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.appointment_date]);

  useEffect(() => {
    let cancelled = false;

    if (!calendarMonth) {
      setDateStatuses({});
      return undefined;
    }

    checkAppointmentMonthlyAvailability(calendarMonth)
      .then((r) => {
        if (!cancelled) setDateStatuses(r.data.dates || {});
      })
      .catch(() => {
        if (!cancelled) setDateStatuses({});
      });

    return () => {
      cancelled = true;
    };
  }, [calendarMonth]);

  const todayIso = manilaTodayIso();
  const minDate = todayIso;

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

  const handleDateSelect = (iso) => {
    setForm({ ...form, appointment_date: iso, appointment_time: '' });
    if (iso.slice(0, 7) !== calendarMonth) {
      setCalendarMonth(iso.slice(0, 7));
    }
  };

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const purposeValue = form.purpose === 'Other' ? form.custom_purpose.trim() : form.purpose;

  const canContinue = () => {
    if (currentStep === 0) return form.fullname.trim() && form.email.trim() && form.phone.trim() && form.address.trim();
    if (currentStep === 1) return form.purpose && (form.purpose !== 'Other' || form.custom_purpose.trim());
    if (currentStep === 2) return form.appointment_date && form.appointment_time;
    return true;
  };

  const nextStep = () => {
    setError('');
    if (!canContinue()) {
      setError(currentStep === 0 ? 'Please complete all personal information fields.' : currentStep === 1 ? 'Please choose or specify the appointment purpose.' : 'Please select an available date and time.');
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, APPOINTMENT_STEPS.length - 1));
  };

  const backStep = () => {
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const refreshDaySlots = (selectedDate) => {
    if (!selectedDate) {
      setSlotItems([]);
      setLoadingSlots(false);
      return Promise.resolve();
    }
    setLoadingSlots(true);
    return checkAppointmentAvailability(selectedDate)
      .then((r) => {
        const available = r.data.available || [];
        const slotList = (r.data.slots || []).filter((slot) => slot.status === 'available');
        setSlotItems(
          slotList.length > 0
            ? slotList
            : available.map((time) => ({ time, status: 'available' }))
        );
        setDateStatuses((prev) => {
          const totalSlots = slotList.length;
          const availableCount = available.length;
          let status = prev[selectedDate]?.status;
          if (totalSlots > 0) {
            status = availableCount === 0 ? 'full' : 'available';
          }
          if (!status) return prev;
          return {
            ...prev,
            [selectedDate]: {
              ...(prev[selectedDate] || {}),
              status,
              available_count: availableCount,
              total_slots: totalSlots,
            },
          };
        });
      })
      .catch(() => setSlotItems([]))
      .finally(() => setLoadingSlots(false));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Guard against rapid double-clicks / duplicate POSTs (ref is sync; state drives UI).
    if (submitInProgress.current || submitting) return;

    setError('');
    if (!form.appointment_time) {
      setError('Please select an available time slot.');
      return;
    }

    submitInProgress.current = true;
    setSubmitting(true);
    try {
      await createAppointment({
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        purpose: purposeValue,
      });
      setMsg('Appointment request submitted successfully!');
      await refreshMonthlyStatuses(calendarMonth);
      setShowForm(false);
      setCurrentStep(0);
      setForm({ appointment_date: '', appointment_time: '', purpose: '', custom_purpose: '', fullname: user?.fullname || '', email: user?.email || '', phone: user?.phone || '', address: user?.address || '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
      submitInProgress.current = false;
    }
  };

  const canCancelAppointment = (status) => status === 'Pending' || status === 'Approved';

  const handleCancelAppointment = async (appointment) => {
    if (!canCancelAppointment(appointment.status)) return;
    // Guard against rapid double-clicks / duplicate PATCHes (ref is sync; state drives UI).
    if (cancelInProgress.current || cancelling) return;
    if (
      !window.confirm(
        `Cancel your appointment on ${appointment.appointment_date} at ${formatSlotTime(appointment.appointment_time || '')}?`
      )
    ) {
      return;
    }

    cancelInProgress.current = true;
    setCancelling(true);
    setError('');
    setMsg('');
    try {
      await updateAppointment({ id: appointment.id, status: 'Cancelled' });
      setMsg('Appointment cancelled successfully.');
      load();
      await refreshMonthlyStatuses(calendarMonth);
      if (form.appointment_date) {
        await refreshDaySlots(form.appointment_date);
        if (form.appointment_time === appointment.appointment_time) {
          setForm((prev) => ({ ...prev, appointment_time: '' }));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to cancel appointment.');
    } finally {
      setCancelling(false);
      cancelInProgress.current = false;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  const totalAppointments = appointments.length;
  const pendingAppointments = appointments.filter((item) => ['Pending', 'Submitted', 'In Review'].includes(item.status)).length;
  const approvedAppointments = appointments.filter((item) => ['Approved', 'Confirmed'].includes(item.status)).length;

  return (
    <DashboardLayout>
      <div className="mb-6 rounded-[32px] border border-[#e8dfd0] bg-gradient-to-r from-[#0f2337] via-[#102b40] to-[#183b56] px-5 py-6 shadow-[0_24px_55px_rgba(15,31,45,0.18)] sm:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#d7b57a]">Appointment status</p>
            <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">View Appointment</h1>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 backdrop-blur-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-[#d7b57a]" />
            {totalAppointments} total request{totalAppointments === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-[#e8dfd0] bg-white p-5 shadow-[0_14px_30px_rgba(15,31,45,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Total</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600">All</span>
          </div>
          <div className="mt-4 text-4xl font-display text-[#0f2337]">{totalAppointments}</div>
        </div>
        <div className="rounded-[24px] border border-[#f0e3c0] bg-[#fffaf0] p-5 shadow-[0_14px_30px_rgba(15,31,45,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Pending</span>
            <span className="rounded-full bg-[#f5e3b8] px-2.5 py-1 text-[10px] font-medium text-[#8d6928]">Review</span>
          </div>
          <div className="mt-4 text-4xl font-display text-[#b68a3b]">{pendingAppointments}</div>
        </div>
        <div className="rounded-[24px] border border-[#d9ebdf] bg-[#f3f9f4] p-5 shadow-[0_14px_30px_rgba(15,31,45,0.05)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Approved</span>
            <span className="rounded-full bg-[#d8eede] px-2.5 py-1 text-[10px] font-medium text-[#2d6a4b]">Ready</span>
          </div>
          <div className="mt-4 text-4xl font-display text-[#1a6a4a]">{approvedAppointments}</div>
        </div>
      </div>

      {msg && <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{msg}</div>}

      {showForm && (
        <form ref={formRef} onSubmit={handleSubmit} className="card mb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-parish-gold">Request Appointment</p>
              <h2 className="mt-1 font-display text-2xl text-parish-blue">{APPOINTMENT_STEPS[currentStep]}</h2>
            </div>
            <span className="rounded-full bg-parish-gold-light px-3 py-1 text-xs font-semibold text-parish-blue">Step {currentStep + 1} of {APPOINTMENT_STEPS.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {APPOINTMENT_STEPS.map((step, index) => (
              <button key={step} type="button" onClick={() => index <= currentStep && setCurrentStep(index)} className={`rounded-lg px-2 py-2 text-left text-xs font-semibold ${index === currentStep ? 'bg-parish-blue text-white' : index < currentStep ? 'bg-parish-gold-light text-parish-blue' : 'bg-gray-100 text-gray-400'}`}>
                {index + 1}. {step}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-600">
            <strong>Office hours:</strong> Monday and Wednesday–Saturday
            <br />
            Available appointment slots: 8:00–11:00 AM and 1:00–5:00 PM (30-minute intervals)
            <br />
            Tuesday and Sunday are closed. Green dates have open slots; red dates are fully booked.
          </p>
          {error && <div className="bg-red-50 text-red-700 p-3 rounded text-sm">{error}</div>}
          {currentStep === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['fullname', 'Full Name'],
                ['email', 'Email Address'],
                ['phone', 'Contact Number'],
                ['address', 'Address'],
              ].map(([field, label]) => (
                <label key={field} className="text-sm font-medium text-gray-700 sm:last:col-span-2">
                  {label}
                  <input className="input-field mt-2" type={field === 'email' ? 'email' : 'text'} value={form[field]} onChange={(e) => updateField(field, e.target.value)} required />
                </label>
              ))}
            </div>
          )}
          {currentStep === 1 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">What is the purpose of your appointment?
                <select className="input-field mt-2" value={form.purpose} onChange={(e) => updateField('purpose', e.target.value)} required>
                  <option value="">Choose a purpose</option>
                  {PURPOSE_OPTIONS.map((purpose) => <option key={purpose} value={purpose}>{purpose}</option>)}
                </select>
              </label>
              {form.purpose === 'Other' && (
                <label className="block text-sm font-medium text-gray-700">Please specify your purpose
                  <textarea className="input-field mt-2" rows={3} value={form.custom_purpose} onChange={(e) => updateField('custom_purpose', e.target.value)} required />
                </label>
              )}
            </div>
          )}
          {currentStep === 2 && <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Select Date</label>
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    className="px-3 py-1 rounded border text-sm hover:bg-white"
                    onClick={() => {
                      const d = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
                      setCalendarMonth(toIsoMonth(d));
                    }}
                  >
                    ← Prev
                  </button>
                  <div className="text-sm font-semibold">{formatMonthLabel(calendarMonth)}</div>
                  <button
                    type="button"
                    className="px-3 py-1 rounded border text-sm hover:bg-white"
                    onClick={() => {
                      const d = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
                      setCalendarMonth(toIsoMonth(d));
                    }}
                  >
                    Next →
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-xs text-gray-600 mb-1">
                  {WEEKDAY_LABELS.map((day) => (
                    <div key={day} className="text-center py-1 font-medium">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {dateCells.map((iso, idx) => {
                    if (!iso) {
                      return <div key={`empty-${idx}`} className="h-10" />;
                    }
                    const status = dateStatuses[iso]?.status || 'unavailable';
                    const isSelected = form.appointment_date === iso;
                    const isPast = iso < minDate || status === 'past';
                    const isAvailable = status === 'available' && !isPast;
                    const isFull = status === 'full' && !isPast;
                    const isDisabled = !isAvailable;

                    let bgCls = 'bg-gray-100 text-gray-400 border-gray-200';
                    if (isAvailable) bgCls = 'bg-green-100 text-green-800 border-green-400';
                    if (isFull) bgCls = 'bg-red-100 text-red-800 border-red-400';
                    if (isSelected) bgCls += ' ring-2 ring-parish-blue ring-offset-1';

                    const title = getCalendarDateTitle(iso, status, todayIso);

                    return (
                      <button
                        key={iso}
                        type="button"
                        disabled={isDisabled}
                        title={title}
                        className={`h-10 rounded border text-xs font-semibold ${bgCls} ${
                          isAvailable ? 'hover:brightness-95 cursor-pointer' : 'cursor-not-allowed'
                        }`}
                        onClick={() => handleDateSelect(iso)}
                      >
                        {Number(iso.slice(8, 10))}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-green-100 border border-green-400 inline-block" />
                    Available
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-red-100 border border-red-400 inline-block" />
                    Fully booked
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-gray-100 border border-gray-300 inline-block" />
                    Not available / closed / past
                  </div>
                </div>
                {form.appointment_date && (
                  <p className="mt-3 text-sm text-parish-blue font-medium">
                    Selected:{' '}
                    {new Date(form.appointment_date + 'T12:00:00').toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Select Time Slot</label>
              {form.appointment_date ? (
                loadingSlots ? (
                  <div className="text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg p-4">
                    Loading available time slots...
                  </div>
                ) : slotItems.length > 0 ? (
                  <div className="space-y-4">
                    {[
                      ['Morning', slotItems.filter((slot) => slot.time < '11:00:00')],
                      ['Afternoon', slotItems.filter((slot) => slot.time >= '13:00:00')],
                    ].map(([period, periodSlots]) => periodSlots.length > 0 && (
                      <div key={period}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{period}</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {periodSlots.map((slot) => {
                      const isSelected = form.appointment_time === slot.time;
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          className={`w-full px-4 py-3 rounded-lg border text-sm font-medium transition text-left bg-green-50 border-green-300 text-green-800 hover:bg-green-100 ${
                            isSelected ? 'ring-2 ring-green-500' : ''
                          }`}
                          onClick={() => setForm({ ...form, appointment_time: slot.time })}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-base">{formatSlotTime(slot.time)}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-200 text-green-900">
                              Available
                            </span>
                          </div>
                        </button>
                      );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-200">
                    No open time slots remain for this date. Choose another green date on the calendar.
                  </div>
                )
              ) : (
                <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4">
                  Pick a green date on the calendar to see available time slots.
                </div>
              )}
            </div>
          </div>}
          {currentStep === 3 && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-parish-blue">Review Appointment Request</h3>
              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                <div><dt className="text-gray-500">Full Name</dt><dd className="font-medium">{form.fullname}</dd></div>
                <div><dt className="text-gray-500">Email</dt><dd className="font-medium break-words">{form.email}</dd></div>
                <div><dt className="text-gray-500">Contact Number</dt><dd className="font-medium">{form.phone}</dd></div>
                <div><dt className="text-gray-500">Address</dt><dd className="font-medium">{form.address}</dd></div>
                <div><dt className="text-gray-500">Purpose</dt><dd className="font-medium">{purposeValue}</dd></div>
                <div><dt className="text-gray-500">Appointment ID</dt><dd className="font-medium">Generated on submission</dd></div>
                <div><dt className="text-gray-500">Appointment Date</dt><dd className="font-medium">{new Date(form.appointment_date + 'T12:00:00').toLocaleDateString()}</dd></div>
                <div><dt className="text-gray-500">Appointment Time</dt><dd className="font-medium">{formatSlotTime(form.appointment_time)}</dd></div>
              </dl>
              <p className="text-sm text-slate-600">This request will be submitted as Under Review for parish office approval.</p>
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            {currentStep > 0 && <button type="button" className="btn-outline" onClick={backStep}>Back / Edit</button>}
            {currentStep < APPOINTMENT_STEPS.length - 1 ? (
              <button type="button" className="btn-primary" onClick={nextStep}>Continue</button>
            ) : (
              <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Appointment Request'}</button>
            )}
          </div>
        </form>
      )}

      {error && !showForm && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="overflow-hidden rounded-[30px] border border-[#e8dfd0] bg-white shadow-[0_22px_45px_rgba(15,31,45,0.08)]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#0f2337]">Appointment record</h2>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Updated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <th className="px-5 py-4 font-semibold">Date</th>
                <th className="px-5 py-4 font-semibold">Time</th>
                <th className="px-5 py-4 font-semibold">Purpose</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} className="border-b border-slate-200 align-top transition duration-200 hover:bg-slate-50/90">
                  <td className="px-5 py-4 text-slate-700">{a.appointment_date}</td>
                  <td className="px-5 py-4 text-slate-700">{a.appointment_time?.slice(0, 5)}</td>
                  <td className="px-5 py-4 text-slate-700">{a.purpose}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={a.status === 'Pending' ? 'Under Review' : a.status} />
                  </td>
                  <td className="px-5 py-4">
                    {canCancelAppointment(a.status) ? (
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800 text-sm font-medium underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                        onClick={() => handleCancelAppointment(a)}
                        disabled={cancelling}
                      >
                        {cancelling ? 'Cancelling...' : 'Cancel'}
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {appointments.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            No appointments yet.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
