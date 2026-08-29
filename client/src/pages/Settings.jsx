import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingSpinner from '../components/forms/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { changePassword, getMe, getSettings, updateProfile, updateSettings } from '../services/api';

const NOTIFICATION_PREFS_KEY = 'hf_parish_notification_prefs';

const DEFAULT_PREFS = {
  reservationUpdates: true,
  appointmentUpdates: true,
  adminRequests: true,
  emailDigest: false,
};

function loadNotificationPrefs() {
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export default function Settings() {
  const { user, loadUser } = useAuth();
  const { language, setLanguage, t } = useSettings();
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [prefs, setPrefs] = useState(loadNotificationPrefs);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    Promise.all([
      getMe()
        .then((res) => setEmail(res.data?.user?.email || user?.email || ''))
        .catch(() => setEmail(user?.email || '')),
      getSettings()
        .then((res) => {
          const enabled = res.data?.appointment_updates;
          if (typeof enabled === 'boolean') {
            setPrefs((p) => ({ ...p, appointmentUpdates: enabled }));
          }
        })
        .catch(() => {
          /* keep local default / cached pref if API unavailable */
        }),
    ]).finally(() => setLoading(false));
  }, [user?.email]);

  useEffect(() => {
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const flash = (msg) => {
    setMessage(msg);
    setError('');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleEmailSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateProfile({ email: email.trim() });
      await loadUser();
      flash(t('settings.emailUpdated'));
    } catch (err) {
      setError(err.message || t('common.loading'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError(t('settings.passwordMismatch'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      flash(t('settings.passwordUpdated'));
    } catch (err) {
      setError(err.message || t('common.loading'));
    } finally {
      setSaving(false);
    }
  };

  const handlePrefChange = async (key, checked) => {
    const previous = prefs;
    setPrefs((p) => ({ ...p, [key]: checked }));

    if (key !== 'appointmentUpdates') {
      return;
    }

    setSavingPrefs(true);
    setError('');
    try {
      const res = await updateSettings({ appointment_updates: checked });
      const enabled = res.data?.appointment_updates;
      if (typeof enabled === 'boolean') {
        setPrefs((p) => ({ ...p, appointmentUpdates: enabled }));
      }
      flash(t('settings.saved'));
    } catch (err) {
      setPrefs(previous);
      setError(err.message || t('common.loading'));
    } finally {
      setSavingPrefs(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl space-y-6">
        <div className="overflow-hidden rounded-[28px] border border-[#e8dfd0] bg-[#0f2337] px-5 py-5 shadow-[0_26px_60px_rgba(15,31,45,0.18)] sm:px-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#d7b57a]">Preferences</p>
          <h1 className="mt-2 text-3xl font-display text-white">{t('settings.title')}</h1>
          <p className="mt-2 text-sm text-slate-300">{t('settings.subtitle')}</p>
        </div>

        {message && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.5fr]">
          <section className="rounded-[26px] border border-[#e8dfd0] bg-white p-5 shadow-[0_16px_30px_rgba(15,31,45,0.04)] sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#0f2337]">{t('settings.language')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('settings.languageDesc')}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { id: 'en', label: t('settings.english') },
                { id: 'tl', label: t('settings.tagalog') },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLanguage(opt.id)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    language === opt.id
                      ? 'border-[#d7b57a] bg-[#f8f0df] text-[#0f2337] shadow-[0_10px_18px_rgba(215,181,122,0.2)]'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[26px] border border-[#e8dfd0] bg-white p-5 shadow-[0_16px_30px_rgba(15,31,45,0.04)] sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[#0f2337]">{t('settings.account')}</h2>
              <p className="mt-1 text-sm text-slate-500">{t('settings.accountDesc')}</p>
            </div>

            <form onSubmit={handleEmailSave} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('settings.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#d7b57a] focus:bg-white focus:ring-2 focus:ring-[#d7b57a]/20"
                  required
                />
              </div>
              <button type="submit" disabled={saving} className="btn-primary">
                {t('settings.changeEmail')}
              </button>
            </form>

            <form onSubmit={handlePasswordSave} className="mt-5 space-y-3 border-t border-slate-200 pt-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('settings.currentPassword')}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#d7b57a] focus:bg-white focus:ring-2 focus:ring-[#d7b57a]/20"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('settings.newPassword')}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#d7b57a] focus:bg-white focus:ring-2 focus:ring-[#d7b57a]/20"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{t('settings.confirmPassword')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#d7b57a] focus:bg-white focus:ring-2 focus:ring-[#d7b57a]/20"
                  required
                  minLength={6}
                />
              </div>

              <button type="submit" disabled={saving} className="btn-primary">
                {t('settings.changePassword')}
              </button>
            </form>
          </section>
        </div>

        <section className="rounded-[26px] border border-[#e8dfd0] bg-white p-5 shadow-[0_16px_30px_rgba(15,31,45,0.04)] sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#0f2337]">{t('settings.prefs')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('settings.prefsDesc')}</p>
          </div>

          <div className="space-y-3">
            {[
              ['reservationUpdates', t('settings.prefReservation')],
              ['appointmentUpdates', t('settings.prefAppointment')],
              ['adminRequests', t('settings.prefAdmin')],
              ['emailDigest', t('settings.prefDigest')],
            ].map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-[#d7b57a]/50 hover:bg-[#fffaf1]">
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <input
                  type="checkbox"
                  checked={prefs[key]}
                  disabled={key === 'appointmentUpdates' && savingPrefs}
                  onChange={(e) => handlePrefChange(key, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#0f2337] focus:ring-[#d7b57a]"
                />
              </label>
            ))}
          </div>
        </section>

      </div>
    </DashboardLayout>
  );
}
