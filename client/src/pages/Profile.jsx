import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingSpinner from '../components/forms/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { getMe, updateProfile } from '../services/api';

function ReadOnlyField({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-[#eae3d8] bg-[#faf8f3] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="break-words text-sm font-semibold text-[#0f2337]">{value || '—'}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default function Profile() {
  const { user, loadUser } = useAuth();
  const { t } = useSettings();
  const [account, setAccount] = useState({
    email: '',
    role: '',
    created_at: '',
  });
  const [saved, setSaved] = useState({
    fullname: '',
    phone: '',
    address: '',
  });
  const [form, setForm] = useState({
    fullname: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    getMe()
      .then((res) => {
        const u = res.data?.user || {};
        setAccount({
          email: u.email || '',
          role: u.role || '',
          created_at: u.created_at || '',
        });
        const profile = {
          fullname: u.fullname || '',
          phone: u.phone || '',
          address: u.address || '',
        };
        setSaved(profile);
        setForm(profile);
      })
      .finally(() => setLoading(false));
  }, []);

  const memberSince = account.created_at
    ? new Date(account.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const initials = (form.fullname || user?.fullname || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'U';

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setErrors({});
    setSaving(true);
    try {
      const payload = {
        fullname: form.fullname.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      };
      await updateProfile(payload);
      await loadUser();
      setSaved(payload);
      setForm(payload);
      setMessage({ type: 'success', text: t('profile.updated') });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || t('profile.updateFailed') });
      if (err.errors) setErrors(err.errors);
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, type = 'text', required = true) => (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{label}</label>
      <input
        type={type}
        name={name}
        className={`w-full rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#d7b57a] focus:bg-white focus:ring-2 focus:ring-[#d7b57a]/20 ${errors[name] ? 'border-red-300' : 'border-slate-200'}`}
        value={form[name]}
        onChange={handleChange}
        required={required}
      />
      {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name]}</p>}
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        <div className="mb-7 overflow-hidden rounded-[28px] border border-[#e8dfd0] bg-[#0f2337] px-5 py-5 shadow-[0_26px_60px_rgba(15,31,45,0.18)] sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#f0e1bc] bg-[#d7b57a] text-xl font-bold text-[#0f2337] shadow-[0_18px_30px_rgba(215,181,122,0.35)]">
                {initials}
              </div>
              <div>
                <h1 className="mt-2 text-3xl font-display text-white">{t('profile.title')}</h1>
                <p className="mt-1 text-sm text-slate-300">{t('profile.subtitle')}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-200 backdrop-blur-sm">
              {account.role ? account.role.charAt(0).toUpperCase() + account.role.slice(1) : 'Member'}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_1.4fr]">
          <section className="rounded-[26px] border border-[#e8dfd0] bg-white p-5 shadow-[0_16px_30px_rgba(15,31,45,0.04)] sm:p-6">
            <h2 className="text-lg font-semibold text-[#0f2337]">{t('profile.registeredInfo')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('profile.registeredInfoDesc')}</p>
            <div className="mt-5 grid gap-3">
              <ReadOnlyField label={t('profile.email')} value={account.email} hint={t('profile.emailHint')} />
              {memberSince && <ReadOnlyField label={t('profile.memberSince')} value={memberSince} />}
              <ReadOnlyField label={t('profile.fullName')} value={saved.fullname} />
              <ReadOnlyField label={t('profile.phone')} value={saved.phone} />
              <ReadOnlyField label={t('profile.address')} value={saved.address || t('profile.noAddress')} />
            </div>
          </section>

          <section className="rounded-[26px] border border-[#e8dfd0] bg-white p-5 shadow-[0_16px_30px_rgba(15,31,45,0.04)] sm:p-6">
            <h2 className="text-lg font-semibold text-[#0f2337]">{t('profile.editTitle')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('profile.editDesc')}</p>

            {message.text && (
              <div
                className={`mt-4 rounded-2xl border px-3 py-2.5 text-sm ${
                  message.type === 'success'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {field('fullname', t('profile.fullName'))}
              {field('phone', t('profile.phone'), 'tel')}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('profile.address')}</label>
                <textarea
                  name="address"
                  rows={4}
                  className={`w-full rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#d7b57a] focus:bg-white focus:ring-2 focus:ring-[#d7b57a]/20 ${errors.address ? 'border-red-300' : 'border-slate-200'}`}
                  value={form.address}
                  onChange={handleChange}
                  placeholder={t('profile.addressPlaceholder')}
                />
                {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? t('common.loading') : t('profile.saveChanges')}
                </button>
                <Link to="/settings" className="text-sm font-medium text-[#0f2337] transition hover:text-[#1b3a58] hover:underline">
                  {t('profile.changeEmailPassword')}
                </Link>
              </div>
            </form>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
