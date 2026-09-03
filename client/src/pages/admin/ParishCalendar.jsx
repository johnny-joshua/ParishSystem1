import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/forms/LoadingSpinner';
import Modal from '../../components/forms/Modal';
import StatusBadge from '../../components/cards/StatusBadge';
import { getParishCalendar } from '../../services/api';

const FILTERS = ['All', 'Reservations', 'Appointments'];
const SERVICES = ['All', 'Marriage', 'Baptism', 'Funeral', 'Private Mass', 'Mass Intention'];
const COLORS = {
  Appointment: 'border-l-sky-500 bg-sky-50 text-sky-900',
  Marriage: 'border-l-rose-500 bg-rose-50 text-rose-900',
  Baptism: 'border-l-cyan-500 bg-cyan-50 text-cyan-900',
  Funeral: 'border-l-slate-500 bg-slate-100 text-slate-900',
  'Private Mass': 'border-l-amber-500 bg-amber-50 text-amber-900',
  'Mass Intention': 'border-l-emerald-500 bg-emerald-50 text-emerald-900',
};

function localDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
function isoDate(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
function manilaToday() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function formatDate(value, options = { month: 'long', day: 'numeric', year: 'numeric' }) { return localDate(value).toLocaleDateString(undefined, options); }
function formatTime(value) {
  const [hour, minute] = value.slice(0, 5).split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}
function startOfWeek(value) { const result = new Date(value); const day = result.getDay(); result.setDate(result.getDate() - (day === 0 ? 6 : day - 1)); return result; }
function endOfWeek(value) { const result = startOfWeek(value); result.setDate(result.getDate() + 6); return result; }

function EventChip({ event, onClick, compact = false }) {
  return <button type="button" onClick={() => onClick(event)} className={`w-full overflow-hidden rounded-lg border-l-4 px-2 py-1.5 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow ${COLORS[event.type] || 'border-l-[#0f2337] bg-slate-50 text-slate-800'}`}><span className="font-semibold">{formatTime(event.time)}</span><span className="block truncate font-medium">{event.type} · {event.name}</span></button>;
}

export default function ParishCalendar() {
  const [events, setEvents] = useState([]);
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(() => new Date(`${manilaToday()}T12:00:00`));
  const [filter, setFilter] = useState('All');
  const [service, setService] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getParishCalendar().then((response) => setEvents(response.data.events || [])).catch(() => setError('Unable to load the parish calendar right now.')).finally(() => setLoading(false));
  }, []);

  const filteredEvents = useMemo(() => events.filter((event) => (filter === 'All' || (filter === 'Reservations' ? event.kind === 'reservation' : event.kind === 'appointment')) && (service === 'All' || event.type === service)), [events, filter, service]);
  const eventMap = useMemo(() => filteredEvents.reduce((map, event) => { (map[event.date] ||= []).push(event); return map; }, {}), [filteredEvents]);
  const today = manilaToday();
  const upcoming = filteredEvents.filter((event) => event.date >= today);
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthCells = Array.from({ length: monthStart.getDay() + new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate() }, (_, index) => index < monthStart.getDay() ? null : isoDate(new Date(cursor.getFullYear(), cursor.getMonth(), index - monthStart.getDay() + 1)));
  const weekDays = Array.from({ length: 7 }, (_, index) => { const day = startOfWeek(cursor); day.setDate(day.getDate() + index); return day; });
  const dayKey = isoDate(cursor);
  const title = view === 'month' ? cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : view === 'week' ? `${formatDate(isoDate(weekDays[0]), { month: 'short', day: 'numeric' })} - ${formatDate(isoDate(weekDays[6]), { month: 'short', day: 'numeric', year: 'numeric' })}` : formatDate(dayKey);
  const move = (amount) => { const next = new Date(cursor); if (view === 'month') next.setMonth(next.getMonth() + amount); else next.setDate(next.getDate() + amount * (view === 'week' ? 7 : 1)); setCursor(next); };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  return <DashboardLayout>
    <div className="mb-6 rounded-[28px] bg-gradient-to-r from-[#0f2337] via-[#12314b] to-[#1d4563] p-6 text-white shadow-[0_24px_50px_rgba(15,31,45,0.18)]"><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d7b57a]">Staff schedule reference</p><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="font-display text-3xl">Parish Calendar</h1><p className="mt-2 text-sm text-slate-200">View and monitor upcoming parish reservations and appointments.</p></div><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-slate-200">Asia/Manila</span></div></div>
    {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-2">{FILTERS.map((item) => <button type="button" key={item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${filter === item ? 'bg-[#0f2337] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{item}</button>)}<select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700" value={service} onChange={(event) => setService(event.target.value)}>{SERVICES.map((item) => <option key={item}>{item}</option>)}</select></div><div className="flex items-center gap-2"><button type="button" className="btn-outline px-3 py-2 text-sm" onClick={() => setCursor(new Date(`${manilaToday()}T12:00:00`))}>Today</button><button type="button" className="btn-outline px-3 py-2 text-sm" onClick={() => move(-1)}>←</button><h2 className="min-w-[180px] text-center text-sm font-semibold text-[#0f2337]">{title}</h2><button type="button" className="btn-outline px-3 py-2 text-sm" onClick={() => move(1)}>→</button><select className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700" value={view} onChange={(event) => setView(event.target.value)}><option value="month">Month</option><option value="week">Week</option><option value="day">Day</option></select></div></div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {view === 'month' && <><div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="py-3">{day}</div>)}</div><div className="grid grid-cols-7">{Array.from({ length: ((monthStart.getDay() + 6) % 7) + new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate() }, (_, index) => { const value = index < ((monthStart.getDay() + 6) % 7) ? null : isoDate(new Date(cursor.getFullYear(), cursor.getMonth(), index - ((monthStart.getDay() + 6) % 7) + 1)); return <div key={value || `empty-${index}`} className="min-h-[112px] border-b border-r border-slate-100 p-1.5 sm:min-h-[140px]">{value && <><div className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${value === today ? 'bg-[#0f2337] text-white' : 'text-slate-600'}`}>{Number(value.slice(-2))}</div><div className="space-y-1">{(eventMap[value] || []).map((event) => <EventChip key={event.id} event={event} onClick={setSelectedEvent} compact />)}</div></>}</div>; })}</div></>}
        {view === 'week' && <div className="grid grid-cols-7 overflow-x-auto">{weekDays.map((day) => { const key = isoDate(day); return <div key={key} className="min-w-[120px] border-r border-slate-100"><div className={`border-b border-slate-200 bg-slate-50 p-3 text-center text-xs font-semibold ${key === today ? 'text-[#0f2337]' : 'text-slate-600'}`}>{day.toLocaleDateString(undefined, { weekday: 'short' })}<span className="mt-1 block text-lg">{day.getDate()}</span></div><div className="space-y-2 p-2">{(eventMap[key] || []).map((event) => <EventChip key={event.id} event={event} onClick={setSelectedEvent} />)}</div></div>; })}</div>}
        {view === 'day' && <div className="p-5"><div className="mb-4 text-sm font-semibold text-slate-600">{formatDate(dayKey, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div><div className="space-y-2">{(eventMap[dayKey] || []).map((event) => <EventChip key={event.id} event={event} onClick={setSelectedEvent} />)}{!eventMap[dayKey]?.length && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No approved schedules for this day.</p>}</div></div>}
      </section>
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-[#0f2337]">Upcoming Schedule</h2><span className="rounded-full bg-[#f5ead0] px-2 py-1 text-xs font-semibold text-[#775b25]">{upcoming.length}</span></div>{upcoming.length ? <div className="space-y-4">{upcoming.map((event, index) => <div key={event.id} className="border-b border-slate-100 pb-3 last:border-0"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{index === 0 && event.date === today ? 'Today' : formatDate(event.date, { weekday: 'short', month: 'short', day: 'numeric' })}</p><button type="button" className="mt-1 text-left text-sm font-semibold text-[#0f2337] hover:text-[#1f5b78]" onClick={() => setSelectedEvent(event)}>{formatTime(event.time)} · {event.type}</button><p className="text-xs text-slate-600">{event.name}{event.kind === 'appointment' && ` · ${event.purpose}`}</p></div>)}</div> : <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center"><p className="font-semibold text-slate-700">No Upcoming Schedules</p><p className="mt-1 text-sm text-slate-500">There are currently no approved reservations or appointments scheduled.</p></div>}</aside>
    </div>
    <Modal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} title={selectedEvent?.type || 'Schedule Details'} size="md">{selectedEvent && <div className="space-y-3 text-sm text-slate-700"><div className="rounded-xl bg-slate-50 p-4"><p className="text-lg font-semibold text-[#0f2337]">{selectedEvent.type}</p><p className="mt-1">{formatDate(selectedEvent.date)} at {formatTime(selectedEvent.time)}</p><StatusBadge status={selectedEvent.status} /></div><p><strong>{selectedEvent.kind === 'appointment' ? 'Parishioner' : 'Client'}:</strong> {selectedEvent.name}</p><p><strong>{selectedEvent.kind === 'appointment' ? 'Appointment ID' : 'Reservation ID'}:</strong> {selectedEvent.record_label}</p>{selectedEvent.purpose && <p><strong>Purpose:</strong> {selectedEvent.purpose}</p>}{Object.entries(selectedEvent.details || {}).filter(([, value]) => value).map(([key, value]) => <p key={key}><strong>{key.replaceAll('_', ' ')}:</strong> {value}</p>)}<p><strong>Status:</strong> {selectedEvent.status}</p></div>}</Modal>
  </DashboardLayout>;
}
