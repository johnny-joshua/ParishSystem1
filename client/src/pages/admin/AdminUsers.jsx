import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/forms/LoadingSpinner';
import Modal from '../../components/forms/Modal';
import { useSettings } from '../../context/SettingsContext';
import { createUser, deleteUser, getUsers, updateUser } from '../../services/api';

const EMPTY_FORM = {
  id: null,
  fullname: '',
  email: '',
  phone: '',
  address: '',
  role: 'user',
  password: '',
};

const PAGE_SIZE = 15;

function formatApiError(err, fallback) {
  if (err?.errors && typeof err.errors === 'object') {
    const messages = Object.values(err.errors).filter(Boolean);
    if (messages.length) return messages.join(' ');
  }
  return err?.message || fallback;
}

export default function AdminUsers() {
  const { t } = useSettings();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 0, total: 0 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: PAGE_SIZE };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      const res = await getUsers(params);
      setUsers(res.data?.users || []);
      setPagination(res.data?.pagination || { page: 1, pages: 0, total: 0 });
    } catch (err) {
      setError(formatApiError(err, t('common.error')));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search, t]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setForm({
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      phone: user.phone,
      address: user.address || '',
      role: user.role,
      password: '',
    });
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(EMPTY_FORM);
    setError('');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        fullname: form.fullname.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        role: form.role,
      };

      if (form.id) {
        payload.id = form.id;
        if (form.password.trim()) {
          payload.password = form.password;
        }
        await updateUser(payload);
        flash(t('users.updated'));
      } else {
        payload.password = form.password;
        await createUser(payload);
        flash(t('users.created'));
      }
      closeModal();
      load();
    } catch (err) {
      setError(formatApiError(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(t('users.deleteConfirm'))) return;
    setError('');
    try {
      await deleteUser(user.id);
      flash(t('users.deleted'));
      if (users.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        load();
      }
    } catch (err) {
      setError(formatApiError(err, t('common.error')));
    }
  };

  const roleLabel = (role) =>
    role === 'admin' ? t('users.roleAdmin') : t('users.roleUser');

  const adminCount = users.filter((user) => user.role === 'admin').length;
  const parishionerCount = users.filter((user) => user.role === 'user').length;

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f6d2d]">Admin panel</p>
          <h1 className="font-display text-3xl text-parish-blue">{t('users.title')}</h1>
          <p className="mt-1 text-sm text-gray-600">{t('users.subtitle')}</p>
        </div>
        <button type="button" className="btn-gold" onClick={openCreate}>
          + {t('users.addUser')}
        </button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="card border-l-4 border-[#0f2337] bg-gradient-to-br from-[#f9fbfd] to-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total users</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-parish-blue">{pagination.total || users.length}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Live</span>
          </div>
        </div>
        <div className="card border-l-4 border-[#d7b57a] bg-gradient-to-br from-[#fffaf1] to-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Administrators</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-[#0f2337]">{adminCount}</span>
            <span className="rounded-full bg-[#f5ead0] px-2 py-1 text-xs font-medium text-[#775b25]">Admins</span>
          </div>
        </div>
        <div className="card border-l-4 border-emerald-500 bg-gradient-to-br from-[#f3fff9] to-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Parishioners</p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-3xl font-bold text-emerald-700">{parishionerCount}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Members</span>
          </div>
        </div>
      </div>

      {message && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">{message}</div>}
      {error && !modalOpen && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">{error}</div>}

      <form onSubmit={handleSearch} className="card mb-6 grid gap-3 border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input
          className="input-field lg:col-span-2"
          placeholder={t('users.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input-field"
          value={roleFilter}
          aria-label={t('users.filterRole')}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t('users.roleAll')}</option>
          <option value="user">{t('users.roleUser')}</option>
          <option value="admin">{t('users.roleAdmin')}</option>
        </select>
        <button type="submit" className="btn-primary">
          {t('common.search')}
        </button>
      </form>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="card overflow-hidden border border-slate-200 p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-5 py-3">{t('profile.fullName')}</th>
                    <th className="px-5 py-3">{t('profile.email')}</th>
                    <th className="px-5 py-3">{t('profile.phone')}</th>
                    <th className="px-5 py-3">{t('profile.role')}</th>
                    <th className="px-5 py-3">{t('profile.memberSince')}</th>
                    <th className="px-5 py-3 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-200 transition hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 min-w-[2.75rem] items-center justify-center rounded-full bg-gradient-to-br from-[#0f2337] to-[#1b3c56] text-sm font-bold text-white shadow-sm ring-2 ring-white">
                            {user.fullname?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-800">{user.fullname}</div>
                            <div className="text-xs text-slate-500">ID #{user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{user.email}</td>
                      <td className="px-5 py-4 text-slate-600">{user.phone}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.role === 'admin'
                              ? 'bg-[#0f2337]/10 text-[#0f2337]'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500">{user.created_at?.slice(0, 10)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            className="rounded-lg border border-[#0f2337] px-3 py-1.5 text-xs font-semibold text-[#0f2337] transition hover:bg-[#0f2337] hover:text-white"
                            onClick={() => openEdit(user)}
                          >
                            {t('users.editUser')}
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-600 hover:text-white"
                            onClick={() => handleDelete(user)}
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">{t('users.noUsers')}</p>
            )}
          </div>

          {pagination.pages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                className="btn-outline text-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ←
              </button>
              <span className="text-sm text-gray-600">
                {t('users.page')} {pagination.page} {t('users.of')} {pagination.pages}
              </span>
              <button
                type="button"
                className="btn-outline text-sm"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                →
              </button>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={form.id ? t('users.editUser') : t('users.addUser')}
        size="lg"
      >
        <div className="mb-5 rounded-2xl bg-gradient-to-r from-[#0f2337] via-[#12314b] to-[#1c4463] p-4 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#d7b57a]" aria-hidden="true">
                <path d="M16 19V17C16 15.3 14.7 14 13 14H11C9.3 14 8 15.3 8 17V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 19V17.5C5 16.1 6.1 15 7.5 15H8.5M19 19V17.5C19 16.1 17.9 15 16.5 15H15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d7b57a]">Account</p>
              <p className="text-lg font-semibold">{form.id ? t('users.editUser') : t('users.addUser')}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">{t('profile.fullName')}</label>
              <input
                className="input-field"
                value={form.fullname}
                onChange={(e) => setForm({ ...form, fullname: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">{t('profile.email')}</label>
              <input
                type="email"
                className="input-field"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">{t('profile.phone')}</label>
              <input
                className="input-field"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">{t('profile.address')}</label>
              <textarea
                className="input-field"
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={t('profile.addressPlaceholder')}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">{t('profile.role')}</label>
              <select
                className="input-field"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="user">{t('users.roleUser')}</option>
                <option value="admin">{t('users.roleAdmin')}</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                {form.id ? t('users.passwordOptional') : t('users.password')}
              </label>
              <input
                type="password"
                className="input-field"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!form.id}
                minLength={form.password ? 8 : undefined}
              />
              <p className="mt-1 text-xs text-gray-500">{t('users.passwordHint')}</p>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? t('common.loading') : t('common.save')}
            </button>
            <button type="button" className="btn-outline" onClick={closeModal}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
