import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/forms/LoadingSpinner';
import Modal from '../../components/forms/Modal';
import StatusBadge from '../../components/cards/StatusBadge';
import { getParishCalendar } from '../../services/api';
import { SERVICE_COLORS } from '../../utils/constants';

const FILTERS = ['All', 'Reservations', 'Appointments'];
const SERVICES = ['All', 'Marriage', 'Baptism', 'Funeral', 'Private Mass', 'Mass Intention'];

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
  const color = SERVICE_COLORS[event.type] || '#b1a897';
  return <button type="button" onClick={() => onClick(event)} style={{ borderLeftColor: color, color }} className="w-full overflow-hidden rounded-lg border-l-4 bg-[#faf5e9] px-2 py-1.5 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow"><span className="font-semibold">{formatTime(event.time)}</span><span className="block truncate font-medium">{event.type} · {event.name}</span></button>;
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
    {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#e7dfd2] bg-[#fffdf8] p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-2">{FILTERS.map((item) => <button type="button" key={item} onClick={() => setFilter(item)} className={`rounded-full px-4 py-2 text-xs font-semibold ${filter === item ? 'bg-[#b18a45] text-white' : 'border border-[#e7dfd2] bg-white text-[#58616a] hover:bg-[#faf5e9]'}`}>{item}</button>)}<select className="rounded-full border border-[#e7dfd2] bg-white px-4 py-2 text-xs text-[#58616a]" value={service} onChange={(event) => setService(event.target.value)}>{SERVICES.map((item) => <option key={item}>{item}</option>)}</select></div><div className="flex flex-wrap items-center gap-2"><button type="button" className="rounded-full border border-[#e7dfd2] bg-white px-3 py-2 text-xs" onClick={() => setCursor(new Date(`${manilaToday()}T12:00:00`))}>Today</button><button type="button" className="rounded-full border border-[#e7dfd2] bg-white px-3 py-2 text-xs" onClick={() => move(-1)}>‹</button><h2 className="min-w-[160px] text-center text-xs font-semibold text-[#273746]">{title}</h2><button type="button" className="rounded-full border border-[#e7dfd2] bg-white px-3 py-2 text-xs" onClick={() => move(1)}>›</button><select className="rounded-full border border-[#e7dfd2] bg-white px-3 py-2 text-xs text-[#58616a]" value={view} onChange={(event) => setView(event.target.value)}><option value="month">Month</option><option value="week">Week</option><option value="day">Day</option></select></div></div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="overflow-hidden rounded-xl border border-[#e7dfd2] bg-[#fffdf8] shadow-sm">
        {view === 'month' && <><div className="grid grid-cols-7 border-b border-[#e7dfd2] bg-[#f8f4ec] text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a7d7f]">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="py-3">{day}</div>)}</div><div className="grid grid-cols-7">{Array.from({ length: ((monthStart.getDay() + 6) % 7) + new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate() }, (_, index) => { const value = index < ((monthStart.getDay() + 6) % 7) ? null : isoDate(new Date(cursor.getFullYear(), cursor.getMonth(), index - ((monthStart.getDay() + 6) % 7) + 1)); return <div key={value || `empty-${index}`} className="min-h-[112px] border-b border-r border-[#eee7db] p-1.5 sm:min-h-[140px]">{value && <><div className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${value === today ? 'bg-[#b18a45] text-white' : 'text-[#58616a]'}`}>{Number(value.slice(-2))}</div><div className="space-y-1">{(eventMap[value] || []).map((event) => <EventChip key={event.id} event={event} onClick={setSelectedEvent} compact />)}</div></>}</div>; })}</div></>}
        {view === 'week' && <div className="grid grid-cols-7 overflow-x-auto">{weekDays.map((day) => { const key = isoDate(day); return <div key={key} className="min-w-[120px] border-r border-slate-100"><div className={`border-b border-slate-200 bg-slate-50 p-3 text-center text-xs font-semibold ${key === today ? 'text-[#0f2337]' : 'text-slate-600'}`}>{day.toLocaleDateString(undefined, { weekday: 'short' })}<span className="mt-1 block text-lg">{day.getDate()}</span></div><div className="space-y-2 p-2">{(eventMap[key] || []).map((event) => <EventChip key={event.id} event={event} onClick={setSelectedEvent} />)}</div></div>; })}</div>}
        {view === 'day' && <div className="p-5"><div className="mb-4 text-sm font-semibold text-slate-600">{formatDate(dayKey, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div><div className="space-y-2">{(eventMap[dayKey] || []).map((event) => <EventChip key={event.id} event={event} onClick={setSelectedEvent} />)}{!eventMap[dayKey]?.length && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No approved schedules for this day.</p>}</div></div>}
      </section>
      <aside className="rounded-xl border border-[#e7dfd2] bg-[#fffdf8] p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-lg text-[#273746]">Upcoming Events</h2><span className="text-xs text-[#a6813f]">View All →</span></div>{upcoming.length ? <div className="space-y-3">{upcoming.map((event, index) => <div key={event.id} className="flex items-center gap-3 border-b border-[#eee7db] pb-3 last:border-0"><div className="w-11 shrink-0 rounded-lg bg-[#f5efe3] p-2 text-center"><p className="text-[9px] uppercase text-[#a6813f]">{formatDate(event.date, { month: 'short' })}</p><p className="font-display text-lg text-[#273746]">{Number(event.date.slice(-2))}</p></div><div className="min-w-0 flex-1"><button type="button" className="text-left text-xs font-semibold text-[#273746] hover:text-[#a6813f]" onClick={() => setSelectedEvent(event)}>{event.type}</button><p className="text-[10px] text-[#7a7d7f]">{formatTime(event.time)} · {event.name}</p></div><span className="rounded-full bg-[#f5ead5] px-2 py-1 text-[9px] text-[#a6813f]">{event.kind === 'appointment' ? 'Appointment' : 'Reservation'}</span></div>)}</div> : <div className="rounded-xl border border-dashed border-[#d8ccb9] p-5 text-center"><p className="font-semibold text-[#58616a]">No Upcoming Schedules</p><p className="mt-1 text-sm text-[#7a7d7f]">There are currently no approved schedules.</p></div>}</aside>
    </div>
    <Modal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} title={selectedEvent?.type || 'Schedule Details'} size="md">{selectedEvent && <div className="space-y-3 text-sm text-slate-700"><div className="rounded-xl bg-slate-50 p-4"><p className="text-lg font-semibold text-[#0f2337]">{selectedEvent.type}</p><p className="mt-1">{formatDate(selectedEvent.date)} at {formatTime(selectedEvent.time)}</p><StatusBadge status={selectedEvent.status} /></div><p><strong>{selectedEvent.kind === 'appointment' ? 'Parishioner' : 'Client'}:</strong> {selectedEvent.name}</p><p><strong>{selectedEvent.kind === 'appointment' ? 'Appointment ID' : 'Reservation ID'}:</strong> {selectedEvent.record_label}</p>{selectedEvent.purpose && <p><strong>Purpose:</strong> {selectedEvent.purpose}</p>}{Object.entries(selectedEvent.details || {}).filter(([, value]) => value).map(([key, value]) => <p key={key}><strong>{key.replaceAll('_', ' ')}:</strong> {value}</p>)}<p><strong>Status:</strong> {selectedEvent.status}</p></div>}</Modal>
  </DashboardLayout>;
}
