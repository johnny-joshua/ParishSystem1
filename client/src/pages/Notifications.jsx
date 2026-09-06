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
  const [notificationFilter, setNotificationFilter] = useState('all');

  const readCount = notifications.filter((notification) => Number(notification.is_read)).length;
  const visibleNotifications = notifications.filter((notification) => {
    if (notificationFilter === 'unread') return !Number(notification.is_read);
    if (notificationFilter === 'read') return Number(notification.is_read);
    return true;
  });

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
      <div className="max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[#e7dfd2] bg-[#fffdf8] p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex w-fit rounded-full border border-[#e7dfd2] bg-white p-1">{[['all', 'All', notifications.length], ['unread', 'Unread', unreadCount], ['read', 'Read', readCount]].map(([value, label, count]) => <button key={value} type="button" onClick={() => setNotificationFilter(value)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${notificationFilter === value ? 'bg-[#f5ead5] text-[#a6813f] shadow-sm' : 'text-[#7a7d7f] hover:bg-[#faf5e9]'}`}>{label} <span className="ml-1 rounded-full bg-[#f1e7d3] px-1.5 py-0.5 text-[10px] text-[#775b25]">{count}</span></button>)}</div>{unreadCount > 0 && <button type="button" onClick={markAllRead} className="w-fit rounded-full border border-[#b18a45] bg-[#b18a45] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#967338]">{t('common.markAllRead')}</button>}</div>

        {loading && notifications.length === 0 ? (
          <div className="rounded-[26px] border border-[#efe7db] bg-white p-8 shadow-[0_18px_35px_rgba(15,31,45,0.04)]">
            <LoadingSpinner />
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="rounded-[26px] border border-dashed border-[#d9d0c2] bg-[#fdfbf8] px-6 py-14 text-center shadow-[0_18px_35px_rgba(15,31,45,0.04)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f1e7d3] text-2xl">🔔</div>
            <p className="mt-5 text-lg font-semibold text-[#0f2337]">{t('notifications.empty')}</p>
            <p className="mt-2 text-sm text-slate-500">You’ll see new parish notices and reminders here.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {visibleNotifications.map((n) => (
              <li
                key={n.id}
                  className={`group relative overflow-hidden rounded-xl border bg-[#fffdf8] p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-4 ${
                  !Number(n.is_read) ? 'border-[#d7b57a] bg-[#fffaf1]' : 'border-[#e7dfd2]'
                }`}
              >
                <div className={`absolute inset-y-0 left-0 w-1.5 ${!Number(n.is_read) ? 'bg-[#d7b57a]' : 'bg-transparent'}`} />

                <div className="flex flex-col gap-3 pl-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!Number(n.is_read) && (
                        <span className="inline-flex items-center rounded-full bg-[#f3e8d3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a6730]">
                          New
                        </span>
                      )}
                      <p className="text-base font-semibold text-[#0f2337]">{n.title}</p>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-600">{n.message}</p>
                    <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">{formatWhen(n.created_at)}</p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => openNotification(n)}
                      className="rounded-lg bg-[#14212b] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#243b4d]"
                    >
                      {t('common.view')}
                    </button>
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="rounded-lg border border-[#d7b57a] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#a6813f] transition hover:bg-[#f5ead5]"
                    >
                      {t('common.markRead')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-500 transition hover:bg-red-50"
                      aria-label={t('common.delete')}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
