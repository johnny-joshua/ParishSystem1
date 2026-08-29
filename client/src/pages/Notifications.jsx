import { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingSpinner from '../components/forms/LoadingSpinner';
import Modal from '../components/forms/Modal';
import { useNotifications } from '../context/NotificationContext';
import { useSettings } from '../context/SettingsContext';

function formatWhen(createdAt) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Notifications() {
  const { t } = useSettings();
  const { notifications, unreadCount, loading, markRead, markAllRead, remove } = useNotifications();
  const [selectedNotification, setSelectedNotification] = useState(null);

  const handleDelete = async (id) => {
    if (!window.confirm(t('notifications.deleteConfirm'))) return;
    try {
      await remove(id);
    } catch (err) {
      window.alert(err.message || t('common.error'));
    }
  };

  const openNotification = async (notification) => {
    if (!Number(notification.is_read)) {
      await markRead(notification.id);
    }
    setSelectedNotification(notification);
  };

  const closeNotification = () => {
    setSelectedNotification(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        <div className="mb-7 overflow-hidden rounded-[28px] border border-[#e8dfd0] bg-[#0f2337] px-5 py-5 shadow-[0_24px_60px_rgba(15,31,45,0.18)] sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#d7b57a]">Parish updates</p>
              <h1 className="mt-2 text-3xl font-display text-white">{t('notifications.title')}</h1>
              <p className="mt-2 text-sm text-slate-300">{t('notifications.subtitle')}</p>
            </div>

            <div className="flex items-center gap-3 self-start rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm">
              <span className="text-[10px] uppercase tracking-[0.25em] text-slate-300">Unread</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d7b57a] text-sm font-bold text-[#0f2337]">
                {unreadCount}
              </span>
            </div>
          </div>
        </div>

        {unreadCount > 0 && (
          <div className="mb-6 flex justify-end">
            <button type="button" onClick={markAllRead} className="btn-outline text-sm py-2 px-4">
              {t('common.markAllRead')}
            </button>
          </div>
        )}

        {loading && notifications.length === 0 ? (
          <div className="rounded-[26px] border border-[#efe7db] bg-white p-8 shadow-[0_18px_35px_rgba(15,31,45,0.04)]">
            <LoadingSpinner />
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-[26px] border border-dashed border-[#d9d0c2] bg-[#fdfbf8] px-6 py-14 text-center shadow-[0_18px_35px_rgba(15,31,45,0.04)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f1e7d3] text-2xl">🔔</div>
            <p className="mt-5 text-lg font-semibold text-[#0f2337]">{t('notifications.empty')}</p>
            <p className="mt-2 text-sm text-slate-500">You’ll see new parish notices and reminders here.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`group relative overflow-hidden rounded-[24px] border bg-white p-4 shadow-[0_18px_35px_rgba(15,31,45,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(15,31,45,0.08)] sm:p-5 ${
                  !Number(n.is_read) ? 'border-[#d7b57a]/70 bg-[#fffcf7]' : 'border-[#e8e4dc]'
                }`}
              >
                <div className={`absolute inset-y-0 left-0 w-1.5 ${!Number(n.is_read) ? 'bg-[#d7b57a]' : 'bg-transparent'}`} />

                <div className="flex flex-col gap-4 pl-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!Number(n.is_read) && (
                        <span className="inline-flex items-center rounded-full bg-[#f3e8d3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a6730]">
                          New
                        </span>
                      )}
                      <p className="text-lg font-semibold text-[#0f2337]">{n.title}</p>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{n.message}</p>
                    <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{formatWhen(n.created_at)}</p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => openNotification(n)}
                      className="btn-primary text-sm py-2.5 px-3"
                    >
                      {t('common.view')}
                    </button>
                    {!Number(n.is_read) && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="rounded-lg border border-[#d7b57a] bg-[#f8f0df] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0f2337] transition hover:bg-[#f2e3bf]"
                      >
                        {t('common.markRead')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-red-600 transition hover:bg-red-100"
                      aria-label={t('common.delete')}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal isOpen={!!selectedNotification} onClose={closeNotification} title={selectedNotification?.title || 'Notification'} size="lg">
        {selectedNotification && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#efe7db] bg-[#f9f7f3] px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              {formatWhen(selectedNotification.created_at)}
            </div>

            <div className="whitespace-pre-line text-sm leading-7 text-slate-700">
              {selectedNotification.message}
            </div>

            {selectedNotification.link && (
              <div className="border-t border-slate-200 pt-4">
                <a
                  href={selectedNotification.link}
                  className="inline-flex items-center rounded-xl bg-[#0f2337] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#18324c]"
                >
                  Go to details
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
