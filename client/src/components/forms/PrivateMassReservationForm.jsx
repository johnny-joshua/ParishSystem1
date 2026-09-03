import { useEffect, useMemo, useState } from 'react';
import DocumentUpload from './DocumentUpload';
import { checkAvailability, checkMonthlyAvailability, createReservation, getDocumentRequirements } from '../../services/api';
import { SERVICE_LABELS, SERVICE_SCHEDULE, SERVICE_REQUIREMENTS, SERVICE_TYPES } from '../../utils/constants';

const STEPS = ['Service', 'Personal Information', 'Purpose', 'Location Details', 'Date & Time', 'Review & Submit'];
const PURPOSES = ['House Blessing', 'Thanksgiving', 'Memorial / Death Anniversary', 'Family Gathering', 'Others'];
const LOCATIONS = ['Private Residence/House', 'New House', 'Other Private Location'];
const purposeFields = {
  'House Blessing': [['family_name', 'Name of the Family/Household', 'text'], ['family_members', 'Number of Family Members', 'number'], ['preferred_time', 'Preferred Time', 'time']],
  Thanksgiving: [['person_family_name', 'Name of Person/Family', 'text'], ['preferred_time', 'Preferred Time', 'time']],
  'Memorial / Death Anniversary': [['deceased_name', 'Name of Deceased', 'text'], ['date_of_death', 'Date of Death', 'date'], ['relationship', 'Relationship to the Requester', 'text'], ['preferred_time', 'Preferred Time', 'time']],
  'Family Gathering': [['person_family_name', 'Name of Person/Family', 'text'], ['preferred_time', 'Preferred Time', 'time']],
  Others: [['custom_purpose', 'Please specify the purpose', 'textarea']],
};
const locationFields = [['house_block_lot', 'House / Block / Lot', 'text'], ['barangay', 'Barangay', 'text'], ['municipality', 'Municipality', 'text'], ['province', 'Province', 'text'], ['landmark', 'Landmark (Optional)', 'text']];
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
const formatDate = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'Not provided';
const formatTime = (value) => { const [hour, minute] = value.slice(0, 5).split(':').map(Number); return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`; };

export default function PrivateMassReservationForm({ user, onClose, onSubmitted, onServiceChange }) {
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState({ fullname: user?.fullname || '', contact_number: user?.phone || '', purpose: '', location_type: '', location_contact_name: '', location_contact_number: '' });
  const [purposeDetails, setPurposeDetails] = useState({});
  const [locationDetails, setLocationDetails] = useState({});
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [month, setMonth] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }));
  const [statuses, setStatuses] = useState({});
  const [slots, setSlots] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [files, setFiles] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeRequirements = useMemo(() => requirements, [requirements]);
  useEffect(() => { getDocumentRequirements().then((response) => setRequirements(response.data['Private Mass'] || [])); }, []);
  useEffect(() => { checkMonthlyAvailability(month, 'Private Mass').then((response) => setStatuses(response.data.dates || {})).catch(() => setStatuses({})); }, [month]);
  useEffect(() => { if (!date) { setSlots([]); return; } checkAvailability(date, 'Private Mass').then((response) => setSlots(response.data.slots || [])).catch(() => setSlots([])); }, [date]);

  const update = (key, value) => setDetails((current) => ({ ...current, [key]: value }));
  const validate = () => {
    if (step === 1 && (!details.fullname.trim() || !details.contact_number.trim())) return 'Full Name and Contact Number are required.';
    if (step === 2) {
      if (!details.purpose) return 'Please select the purpose of the Private Mass.';
      const required = (purposeFields[details.purpose] || []).filter(([, label]) => !label.includes('Optional'));
      if (required.some(([key]) => !String(purposeDetails[key] || '').trim())) return 'Please complete all required purpose details.';
    }
    if (step === 3) {
      if (!details.location_type) return 'Please select the Private Mass location.';
      if (locationFields.filter(([, label]) => !label.includes('Optional')).some(([key]) => !String(locationDetails[key] || '').trim()) || !details.location_contact_name.trim() || !details.location_contact_number.trim()) return 'Please complete all required location and contact details.';
    }
    if (step === 4 && (!date || !time)) return 'Please select an available Private Mass date and time.';
    if (step === 4 && !slots.some((slot) => slot.time === time && slot.status === 'available')) return 'Please select an available Private Mass time.';
    if (step === 4 || step === 5) {
      const missing = activeRequirements.filter((item) => item.required && !files[item.type]);
      if (missing.length) return `Please upload: ${missing.map((item) => item.name).join(', ')}.`;
    }
    return '';
  };
  const next = () => { const message = validate(); setError(message); if (!message) setStep((current) => Math.min(current + 1, STEPS.length - 1)); };
  const submit = async (event) => {
    event.preventDefault();
    if (step !== STEPS.length - 1) return;
    const message = [1, 2, 3, 4].map((stepToValidate) => validate(stepToValidate)).find(Boolean);
    if (message) { setError(message); return; }
    setSubmitting(true); setError('');
    try {
      const serviceDetails = { ...details, ...purposeDetails, ...locationDetails };
      const payload = new FormData();
      payload.append('service_type', 'Private Mass');
      payload.append('reservation_date', date);
      payload.append('reservation_time', time);
      payload.append('serviceDetails', JSON.stringify(serviceDetails));
      payload.append('requirements', `Private Mass: ${details.purpose}`);
      payload.append('valid_id', files.valid_id);
      await createReservation(payload);
      onSubmitted(); onClose();
    } catch (requestError) { setError(requestError.message || 'Unable to create the Private Mass reservation. Please try again later.'); } finally { setSubmitting(false); }
  };
  const monthDate = new Date(`${month}-01T12:00:00`);
  const offset = (monthDate.getDay() + 6) % 7;
  const days = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: offset + days }, (_, index) => index < offset ? null : `${month}-${String(index - offset + 1).padStart(2, '0')}`);
  const input = (key, label, type, value, setter) => <label className="block text-sm text-slate-700"><span className="mb-2 block font-medium">{label}{!label.includes('Optional') && <span className="text-red-600"> *</span>}</span>{type === 'textarea' ? <textarea className="input-field min-h-[90px]" value={value || ''} onChange={(event) => setter(event.target.value)} /> : <input className="input-field" type={type} min={type === 'number' ? 1 : undefined} value={value || ''} onChange={(event) => setter(event.target.value)} />}</label>;

  return <form onSubmit={submit} className="mb-6 overflow-hidden rounded-[30px] border border-[#e8dfd0] bg-white shadow-[0_22px_45px_rgba(15,31,45,0.08)]"><div className="border-b border-slate-200 bg-slate-50 px-5 py-5"><h2 className="text-2xl font-semibold text-[#0f2337]">Private Mass Reservation</h2><div className="mt-4 flex gap-2 overflow-x-auto">{STEPS.map((label, index) => <button type="button" key={label} onClick={() => index <= step && setStep(index)} className={`min-w-[125px] rounded-xl border px-3 py-2 text-left text-xs font-semibold ${step === index ? 'border-[#0f2337] bg-[#0f2337] text-white' : index < step ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>{index + 1}. {label}</button>)}</div></div><div className="p-5 sm:p-6">{error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {step === 0 && <div className="rounded-[24px] border border-slate-200 bg-[#f8fafc] p-4 sm:p-5"><label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Service Type</label><select className="input-field" value="Private Mass" onChange={(event) => onServiceChange?.(event.target.value)}>{SERVICE_TYPES.map((service) => <option key={service}>{SERVICE_LABELS[service] || service}</option>)}</select><div className="mt-4 rounded-2xl border border-[#f2e4bb] bg-[#fffaf0] p-3 text-sm text-slate-700"><div><span className="font-semibold text-[#0f2337]">Parish schedule:</span> {SERVICE_SCHEDULE['Private Mass']}</div><div className="mt-1"><span className="font-semibold text-[#0f2337]">Requirements:</span> {SERVICE_REQUIREMENTS['Private Mass']}</div></div></div>}
    {step === 1 && <div className="grid gap-4 sm:grid-cols-2">{input('fullname', 'Full Name', 'text', details.fullname, (value) => update('fullname', value))}{input('contact_number', 'Contact Number', 'tel', details.contact_number, (value) => update('contact_number', value))}</div>}
    {step === 2 && <div><label className="block text-sm font-medium text-slate-700">What is the purpose of the Private Mass? <span className="text-red-600">*</span><select className="input-field mt-2" value={details.purpose} onChange={(event) => { update('purpose', event.target.value); setPurposeDetails({}); }}><option value="">Select...</option>{PURPOSES.map((purpose) => <option key={purpose}>{purpose}</option>)}</select></label>{details.purpose && <div className="mt-5 grid gap-4 sm:grid-cols-2">{purposeFields[details.purpose].map(([key, label, type]) => <div key={key}>{input(key, label, type, purposeDetails[key], (value) => setPurposeDetails((current) => ({ ...current, [key]: value })))}</div>)}</div>}</div>}
    {step === 3 && <div><label className="block text-sm font-medium text-slate-700">Where will the Private Mass be held? <span className="text-red-600">*</span><select className="input-field mt-2" value={details.location_type} onChange={(event) => update('location_type', event.target.value)}><option value="">Select...</option>{LOCATIONS.map((location) => <option key={location}>{location}</option>)}</select></label>{details.location_type && <div className="mt-5 grid gap-4 sm:grid-cols-2">{locationFields.map(([key, label, type]) => <div key={key}>{input(key, label, type, locationDetails[key], (value) => setLocationDetails((current) => ({ ...current, [key]: value })))}</div>)}{input('location_contact_name', 'Contact Person at Location - Name', 'text', details.location_contact_name, (value) => update('location_contact_name', value))}{input('location_contact_number', 'Contact Person at Location - Contact Number', 'tel', details.location_contact_number, (value) => update('location_contact_number', value))}</div>}</div>}
    {step === 4 && <div><div className="rounded-[24px] border border-slate-200 bg-[#f8fafc] p-4 sm:p-5"><p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Select Preferred Date</p><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" onClick={() => setMonth(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit' }))}>← Prev</button><strong>{monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong><button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" onClick={() => setMonth(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit' }))}>Next →</button></div><div className="grid grid-cols-7 gap-1">{cells.map((value, index) => { const available = statuses[value]?.status === 'available'; const selected = date === value; return value ? <button type="button" key={value} disabled={!available} className={`h-11 rounded-xl border text-xs font-semibold ${available ? 'border-emerald-300 bg-emerald-100 text-emerald-800' : 'border-slate-200 bg-slate-100 text-slate-400'} ${selected ? 'ring-2 ring-[#0f2337] ring-offset-1' : ''}`} onClick={() => { setDate(value); setTime(''); }}>{Number(value.slice(-2))}</button> : <span key={`empty-${index}`} />; })}</div></div></div>{date && <div className="mt-5"><p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Available Time</p><div className="grid gap-2 sm:grid-cols-2">{slots.map((slot) => { const available = slot.status === 'available'; const selected = time === slot.time; const label = slot.time === '08:00:00' ? '8:00 AM - 12:00 PM' : '1:00 PM - 4:00 PM'; return <button type="button" key={slot.time} disabled={!available} className={`rounded-xl border px-4 py-3 text-left text-sm font-medium ${available ? `border-emerald-300 bg-emerald-50 text-emerald-800 ${selected ? 'ring-2 ring-[#0f2337]' : ''}` : 'border-red-200 bg-red-50 text-red-700'}`} onClick={() => setTime(slot.time)}>{label} <span className="ml-2 text-xs">{available ? 'Available' : 'Unavailable'}</span></button>; })}</div></div>}<div className="mt-6"><DocumentUpload requirements={activeRequirements} onFilesChange={setFiles} /></div></div>}
    {step === 5 && <div className="space-y-4 text-sm text-slate-700"><div className="rounded-2xl border border-slate-200 p-4"><h3 className="font-semibold text-[#0f2337]">Personal Information</h3><p className="mt-1"><strong>Full Name:</strong> {details.fullname}</p><p className="mt-1"><strong>Contact Number:</strong> {details.contact_number}</p></div><div className="rounded-2xl border border-slate-200 p-4"><h3 className="font-semibold text-[#0f2337]">Purpose</h3><p className="mt-1"><strong>Purpose:</strong> {details.purpose}</p>{Object.entries(purposeDetails).filter(([, value]) => value).map(([key, value]) => <p key={key} className="mt-1"><strong>{key.replaceAll('_', ' ')}:</strong> {value}</p>)}</div><div className="rounded-2xl border border-slate-200 p-4"><h3 className="font-semibold text-[#0f2337]">Location</h3><p className="mt-1"><strong>Type:</strong> {details.location_type}</p>{Object.entries(locationDetails).filter(([, value]) => value).map(([key, value]) => <p key={key} className="mt-1"><strong>{key.replaceAll('_', ' ')}:</strong> {value}</p>)}<p className="mt-1"><strong>Contact Person:</strong> {details.location_contact_name} ({details.location_contact_number})</p></div><div className="rounded-2xl border border-slate-200 p-4"><h3 className="font-semibold text-[#0f2337]">Schedule and Requirement</h3><p className="mt-1"><strong>Date:</strong> {formatDate(date)}</p><p className="mt-1"><strong>Time:</strong> {time ? formatTime(time) : 'Not selected'}</p>{activeRequirements.map((item) => <p key={item.type} className="mt-1"><strong>{item.name}:</strong> {files[item.type]?.name || 'Missing'}</p>)}</div></div>}
    <div className="mt-6 flex gap-3">{step > 0 && <button type="button" className="btn-outline flex-1" onClick={() => setStep((current) => current - 1)}>Back / Edit</button>}{step < STEPS.length - 1 ? <button type="button" className="btn-primary flex-1" onClick={next}>Next</button> : <button type="submit" className="btn-primary flex-1" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Private Mass Reservation'}</button>}</div></div></form>;
}
