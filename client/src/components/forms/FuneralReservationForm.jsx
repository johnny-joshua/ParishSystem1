import { useEffect, useMemo, useState } from 'react';
import DocumentUpload from './DocumentUpload';
import { checkAvailability, checkMonthlyAvailability, createReservation, getDocumentRequirements, uploadReservationDocument } from '../../services/api';
import { SERVICE_LABELS, SERVICE_SCHEDULE, SERVICE_REQUIREMENTS, SERVICE_TYPES } from '../../utils/constants';

const STEPS = ['Service', 'Personal Information', 'Cemetery', 'Funeral Details', 'Requirements', 'Review & Submit'];
const CEMETERY_TYPES = ['Old Cemetery', 'New Cemetery', 'Old Niche', 'Ossuary'];
const FUNERAL_SERVICES = ['Funeral Mass', 'Funeral Oration', 'Burial / Sepulture', 'Other'];
const PERSONAL_FIELDS = [
  ['deceased_name', 'Full Name of Deceased', 'text'], ['date_of_death', 'Date of Death', 'date'],
  ['age', 'Age', 'number'], ['sex', 'Sex', 'select'], ['civil_status', 'Civil Status', 'select'],
  ['residence', 'Residence / Address', 'textarea'], ['date_of_inquiry', 'Date of Inquiry', 'date'],
  ['spouse_maiden_name', 'Spouse / Maiden Name', 'text'], ['children_count', 'No. of Children (Optional)', 'number'],
];
const CEMETERY_FIELDS = {
  'Old Cemetery': [['lot_location', 'Lot / Location', 'text'], ['kalot_pancheon', 'Kalot / Pancheon', 'text'], ['existing_niche_info', 'Existing Niche Information (if applicable)', 'textarea'], ['previous_occupant', 'Name of Previous Occupant', 'text'], ['previous_burial_date', 'Date of Previous Burial', 'date']],
  'New Cemetery': [['lot_location', 'Lot / Location', 'text'], ['kalot_pancheon', 'Kalot / Pancheon', 'text'], ['new_burial_lot', 'New Burial Lot', 'text'], ['other_cemetery_info', 'Other Cemetery Information', 'textarea']],
  'Old Niche': [['previous_niche_occupant', 'Name of Deceased / Person Previously Occupying Niche', 'text'], ['previous_niche_death_date', 'Date of Death', 'date'], ['book', 'Book', 'text'], ['page', 'Page', 'text'], ['niche_information', 'Niche Information', 'textarea']],
  Ossuary: [['ossuary_chamber', 'Ossuary Chamber', 'text'], ['rental', 'Rental', 'text'], ['maintenance_fee', 'Maintenance Fee', 'text'], ['labor', 'Labor (if applicable)', 'text']],
};
const REQUIRED_CEMETERY_FIELDS = { 'Old Cemetery': ['lot_location', 'kalot_pancheon'], 'New Cemetery': ['lot_location', 'kalot_pancheon', 'new_burial_lot'], 'Old Niche': ['previous_niche_occupant', 'previous_niche_death_date', 'book', 'page'], Ossuary: ['ossuary_chamber', 'rental', 'maintenance_fee'] };

const isoToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
const displayDate = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'Not provided';
const timeLabel = (value) => { const [hour, minute] = value.slice(0, 5).split(':').map(Number); return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`; };

export default function FuneralReservationForm({ user, onClose, onSubmitted, onServiceChange }) {
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState({ deceased_name: '', date_of_death: '', age: '', sex: '', civil_status: '', civil_status_other: '', residence: '', date_of_inquiry: isoToday(), spouse_maiden_name: '', children_count: '', cemetery_type: '', funeral_service: '', funeral_service_other: '' });
  const [cemeteryDetails, setCemeteryDetails] = useState({});
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [month, setMonth] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }));
  const [statuses, setStatuses] = useState({});
  const [slots, setSlots] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [files, setFiles] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeRequirements = useMemo(() => requirements.map((item) => item.type === 'authority_niche_form' ? { ...item, required: details.cemetery_type !== 'Ossuary' } : item), [requirements, details.cemetery_type]);
  useEffect(() => { getDocumentRequirements().then((response) => setRequirements(response.data.Funeral || [])); }, []);
  useEffect(() => { checkMonthlyAvailability(month, 'Funeral').then((response) => setStatuses(response.data.dates || {})).catch(() => setStatuses({})); }, [month]);
  useEffect(() => { if (!date) { setSlots([]); return; } checkAvailability(date, 'Funeral').then((response) => setSlots(response.data.slots || [])).catch(() => setSlots([])); }, [date]);

  const updateDetail = (key, value) => setDetails((current) => ({ ...current, [key]: value }));
  const updateCemetery = (key, value) => setCemeteryDetails((current) => ({ ...current, [key]: value }));
  const validateStep = () => {
    if (step === 1) {
      const required = ['deceased_name', 'date_of_death', 'age', 'sex', 'civil_status', 'residence', 'date_of_inquiry'];
      if (required.some((key) => !String(details[key] || '').trim()) || (details.civil_status === 'Other' && !details.civil_status_other.trim())) return 'Please complete all required deceased information.';
      if (!Number.isInteger(Number(details.age)) || Number(details.age) < 0 || Number(details.age) > 150) return 'Please enter a valid age.';
    }
    if (step === 2) {
      if (!details.cemetery_type) return 'Please select a cemetery or interment type.';
      if (REQUIRED_CEMETERY_FIELDS[details.cemetery_type].some((key) => !String(cemeteryDetails[key] || '').trim())) return 'Please complete all required cemetery information.';
    }
    if (step === 3 && (!details.funeral_service || (details.funeral_service === 'Other' && !details.funeral_service_other.trim()))) return 'Please select or specify the funeral service.';
    if (step === 3 && (!date || !time)) return 'Please select an available funeral date and time.';
    if (step === 4) {
      const missing = activeRequirements.filter((item) => item.required && !files[item.type]);
      if (missing.length) return `Please upload: ${missing.map((item) => item.name).join(', ')}.`;
    }
    return '';
  };
  const next = () => { const message = validateStep(); setError(message); if (!message) setStep((current) => Math.min(current + 1, STEPS.length - 1)); };
  const submit = async (event) => {
    event.preventDefault();
    if (step !== STEPS.length - 1) return;
    const message = [1, 2, 3, 4].map((stepToValidate) => validateStep(stepToValidate)).find(Boolean);
    if (message) { setError(message); return; }
    setSubmitting(true); setError('');
    try {
      const serviceDetails = { ...details, ...cemeteryDetails, civil_status: details.civil_status === 'Other' ? details.civil_status_other : details.civil_status, funeral_service: details.funeral_service === 'Other' ? details.funeral_service_other : details.funeral_service };
      const response = await createReservation({ service_type: 'Funeral', reservation_date: date, reservation_time: time, serviceDetails, requirements: `Funeral reservation for ${details.deceased_name}` });
      await Promise.all(Object.entries(files).map(([type, file]) => { const data = new FormData(); data.append('reservation_id', response.data.id); data.append('document_type', type); data.append('document', file); return uploadReservationDocument(data); }));
      onSubmitted(); onClose();
    } catch (requestError) { setError(requestError.message || 'Unable to create the Funeral reservation. Please try again later.'); } finally { setSubmitting(false); }
  };
  const monthDate = new Date(`${month}-01T12:00:00`);
  const cells = Array.from({ length: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate() + monthDate.getDay() }, (_, index) => index < monthDate.getDay() ? null : `${month}-${String(index - monthDate.getDay() + 1).padStart(2, '0')}`);

  const input = (key, label, type, value, setter) => <label className="block text-sm text-slate-700"><span className="mb-2 block font-medium">{label}{!label.includes('Optional') && <span className="text-red-600"> *</span>}</span>{type === 'textarea' ? <textarea className="input-field min-h-[90px]" value={value || ''} onChange={(event) => setter(event.target.value)} /> : type === 'select' ? <select className="input-field" value={value || ''} onChange={(event) => setter(event.target.value)}><option value="">Select...</option>{key === 'sex' ? <><option>Male</option><option>Female</option></> : <>{['Single', 'Married', 'Widowed', 'Separated', 'Divorced', 'Other'].map((option) => <option key={option}>{option}</option>)}</>}</select> : <input className="input-field" type={type} min={type === 'number' ? 0 : undefined} value={value || ''} onChange={(event) => setter(event.target.value)} />}</label>;

  return <form onSubmit={submit} className="mb-6 overflow-hidden rounded-[30px] border border-[#e8dfd0] bg-white shadow-[0_22px_45px_rgba(15,31,45,0.08)]"><div className="border-b border-slate-200 bg-slate-50 px-5 py-5"><h2 className="text-2xl font-semibold text-[#0f2337]">Funeral Reservation</h2><div className="mt-4 flex gap-2 overflow-x-auto">{STEPS.map((label, index) => <button type="button" key={label} onClick={() => index <= step && setStep(index)} className={`min-w-[125px] rounded-xl border px-3 py-2 text-left text-xs font-semibold ${step === index ? 'border-[#0f2337] bg-[#0f2337] text-white' : index < step ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`}>{index + 1}. {label}</button>)}</div></div><div className="p-5 sm:p-6">{error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {step === 0 && <div className="rounded-[24px] border border-slate-200 bg-[#f8fafc] p-4 sm:p-5"><label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Service Type</label><select className="input-field" value="Funeral" onChange={(event) => onServiceChange?.(event.target.value)}>{SERVICE_TYPES.map((service) => <option key={service} value={service}>{SERVICE_LABELS[service] || service}</option>)}</select><div className="mt-4 rounded-2xl border border-[#f2e4bb] bg-[#fffaf0] p-3 text-sm text-slate-700"><div className="mb-1.5"><span className="font-semibold text-[#0f2337]">Parish schedule:</span> {SERVICE_SCHEDULE.Funeral}</div><div><span className="font-semibold text-[#0f2337]">Requirements:</span> {SERVICE_REQUIREMENTS.Funeral}</div></div></div>}
    {step === 1 && <div className="grid gap-4 sm:grid-cols-2">{PERSONAL_FIELDS.map(([key, label, type]) => <div key={key} className={type === 'textarea' ? 'sm:col-span-2' : ''}>{input(key, label, type, details[key], (value) => updateDetail(key, value))}{key === 'civil_status' && details.civil_status === 'Other' && <div className="mt-3">{input('civil_status_other', 'Please specify civil status', 'text', details.civil_status_other, (value) => updateDetail('civil_status_other', value))}</div>}</div>)}</div>}
    {step === 2 && <div><label className="mb-4 block text-sm font-medium text-slate-700">Where will the deceased be buried/interred? <span className="text-red-600">*</span><select className="input-field mt-2" value={details.cemetery_type} onChange={(event) => { updateDetail('cemetery_type', event.target.value); setCemeteryDetails({}); }}><option value="">Select...</option>{CEMETERY_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>{details.cemetery_type && <div className="grid gap-4 sm:grid-cols-2">{CEMETERY_FIELDS[details.cemetery_type].map(([key, label, type]) => <div key={key} className={type === 'textarea' ? 'sm:col-span-2' : ''}>{input(key, label, type, cemeteryDetails[key], (value) => updateCemetery(key, value))}</div>)}</div>}</div>}
    {step === 3 && <div><label className="block text-sm font-medium text-slate-700">Select Funeral Service <span className="text-red-600">*</span><select className="input-field mt-2" value={details.funeral_service} onChange={(event) => updateDetail('funeral_service', event.target.value)}><option value="">Select...</option>{FUNERAL_SERVICES.map((service) => <option key={service}>{service}</option>)}</select></label>{details.funeral_service === 'Other' && <div className="mt-4">{input('funeral_service_other', 'Please specify', 'text', details.funeral_service_other, (value) => updateDetail('funeral_service_other', value))}</div>}<div className="mt-6 rounded-[24px] border border-slate-200 bg-[#f8fafc] p-4 sm:p-5"><p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Select Date</p><div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50" onClick={() => setMonth(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit' }))}>← Prev</button><strong className="text-sm font-semibold text-[#0f2337]">{monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong><button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50" onClick={() => setMonth(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit' }))}>Next →</button></div><div className="grid grid-cols-7 gap-1">{cells.map((value, index) => { const available = statuses[value]?.status === 'available'; const selected = date === value; return value ? <button type="button" key={value} disabled={!available} className={`h-11 rounded-xl text-xs font-semibold transition ${available ? 'border border-emerald-300 bg-emerald-100 text-emerald-800 cursor-pointer hover:brightness-95' : 'border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'} ${selected ? 'ring-2 ring-[#0f2337] ring-offset-1' : ''}`} onClick={() => { setDate(value); setTime(''); }}>{Number(value.slice(-2))}</button> : <span key={`empty-${index}`} />; })}</div></div><label className="mb-3 mt-5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Select Time Slot</label>{date && <div className="grid gap-2 sm:grid-cols-2">{slots.map((slot) => { const available = slot.status === 'available'; const selected = time === slot.time; return <button type="button" key={slot.time} disabled={!available} className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${available ? `bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 ${selected ? 'ring-2 ring-emerald-500' : ''}` : 'border-red-300 bg-red-50 text-red-800 cursor-not-allowed'}`} onClick={() => setTime(slot.time)}><div className="flex items-center justify-between gap-2"><span className="text-base">{timeLabel(slot.time)}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${available ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'}`}>{available ? 'Available' : 'Full'}</span></div></button>; })}</div>}</div></div>}
    {step === 4 && <DocumentUpload requirements={activeRequirements} onFilesChange={setFiles} />}
    {step === 5 && <div className="space-y-4 text-sm text-slate-700"><div className="rounded-2xl border border-slate-200 p-4"><h3 className="font-semibold text-[#0f2337]">Deceased Information</h3>{PERSONAL_FIELDS.map(([key, label]) => <p key={key} className="mt-1"><strong>{label}:</strong> {key.includes('date') ? displayDate(details[key]) : details[key] || 'Not provided'}</p>)}</div><div className="rounded-2xl border border-slate-200 p-4"><h3 className="font-semibold text-[#0f2337]">Cemetery Information</h3><p className="mt-1"><strong>Type:</strong> {details.cemetery_type}</p>{(CEMETERY_FIELDS[details.cemetery_type] || []).map(([key, label]) => <p key={key} className="mt-1"><strong>{label}:</strong> {key.includes('date') ? displayDate(cemeteryDetails[key]) : cemeteryDetails[key] || 'Not provided'}</p>)}</div><div className="rounded-2xl border border-slate-200 p-4"><h3 className="font-semibold text-[#0f2337]">Funeral Details</h3><p className="mt-1"><strong>Service:</strong> {details.funeral_service === 'Other' ? details.funeral_service_other : details.funeral_service}</p><p className="mt-1"><strong>Schedule:</strong> {displayDate(date)} at {time ? timeLabel(time) : 'Not selected'}</p></div><div className="rounded-2xl border border-slate-200 p-4"><h3 className="font-semibold text-[#0f2337]">Documents</h3>{activeRequirements.map((item) => <p key={item.type} className="mt-1"><strong>{item.name}:</strong> {files[item.type]?.name || 'Missing'}</p>)}</div></div>}
    <div className="mt-6 flex gap-3">{step > 0 && <button type="button" className="btn-outline flex-1" onClick={() => setStep((current) => current - 1)}>Back / Edit</button>}{step < STEPS.length - 1 ? <button type="button" className="btn-primary flex-1" onClick={next}>Next</button> : <button type="submit" className="btn-primary flex-1" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Funeral Reservation'}</button>}</div></div></form>;
}
