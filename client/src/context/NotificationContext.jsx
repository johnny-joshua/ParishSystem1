import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  deleteNotification as deleteNotificationApi,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const res = await getNotifications();
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unread_count ?? 0);
    } catch {
      /* ignore polling errors */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return undefined;
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, [refresh, user]);

  const markRead = async (id) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnreadCount(0);
  };

  const remove = async (id) => {
    await deleteNotificationApi(id);
    setNotifications((prev) => {
      const wasUnread = prev.some((n) => n.id === id && !Number(n.is_read));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
      return prev.filter((n) => n.id !== id);
    });
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, refresh, markRead, markAllRead, remove }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}
