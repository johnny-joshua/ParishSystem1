import axios from 'axios';
import { API_BASE } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => {
    const body = res.data;
    if (body && body.success === true && Object.prototype.hasOwnProperty.call(body, 'data')) {
      res.data = body.data;
    }
    return res;
  },
  (err) => {
    const message = err.response?.data?.message || 'An error occurred.';
    return Promise.reject({
      message,
      errors: err.response?.data?.errors,
      status: err.response?.status,
    });
  }
);

export const register = (data) => api.post('/auth/register.php', data);
export const login = (data) => api.post('/auth/login.php', data);
export const logout = () => api.post('/auth/logout.php');
export const getMe = () => api.get('/auth/me.php');
export const updateProfile = (data) => api.patch('/auth/profile.php', data);
export const changePassword = (data) => api.patch('/auth/profile.php', data);
export const checkSession = () => api.get('/auth/check.php');
export const getUsers = (params) => api.get('/auth/users.php', { params });
export const createUser = (data) => api.post('/auth/users.php', data);
export const updateUser = (data) => api.put('/auth/users.php', data);
export const deleteUser = (id) => api.delete(`/auth/users.php?id=${id}`);

export const getReservations = (status) =>
  api.get('/reservations/index.php', { params: status ? { status } : {} });
export const createReservation = (data) => api.post('/reservations/index.php', data, data instanceof FormData ? { headers: { 'Content-Type': false } } : undefined);
export const updateReservation = (data) => api.patch('/reservations/index.php', data);
export const checkAvailability = (date, service_type) =>
  api.get('/reservations/availability.php', { params: { date, service_type } });
export const checkMonthlyAvailability = (month, service_type) =>
  api.get('/reservations/availability.php', { params: { month, service_type } });
export const getReservationDocuments = (reservationId) =>
  api.get('/reservations/documents.php', { params: { reservation_id: reservationId } });
export const uploadReservationDocument = (formData) =>
  api.post('/reservations/documents.php', formData, {
    // Override instance default application/json so FormData is sent as
    // multipart (not JSON-stringified). false clears the header so the
    // browser sets multipart/form-data with the correct boundary.
    headers: { 'Content-Type': false },
  });
export const updateReservationDocument = (data) =>
  api.patch('/reservations/documents.php', data);
export const deleteReservationDocument = (documentId) =>
  api.delete(`/reservations/documents.php?id=${documentId}`);
export const downloadReservationDocument = (documentId) =>
  api.get(`/reservations/download.php?id=${documentId}`, { responseType: 'blob' });
export const getDocumentRequirements = () =>
  api.get('/reservations/requirements.php');

export const getAppointments = (status) =>
  api.get('/appointments/index.php', { params: status ? { status } : {} });
export const getParishCalendar = () => api.get('/calendar/index.php');
export const createAppointment = (data) => api.post('/appointments/index.php', data);
export const updateAppointment = (data) => api.patch('/appointments/index.php', data);
export const checkAppointmentAvailability = (date) =>
  api.get('/appointments/availability.php', { params: { date } });
export const checkAppointmentMonthlyAvailability = (month) =>
  api.get('/appointments/availability.php', { params: { month } });

export const getRecords = (params) => api.get('/records/index.php', { params });
export const createRecord = (data) => api.post('/records/index.php', data);
export const updateRecord = (data) => api.put('/records/index.php', data);
export const deleteRecord = (id) => api.delete(`/records/index.php?id=${id}`);
export const getRecordArchive = (params) => api.get('/records/archive.php', { params });
export const getRecordArchiveDetail = (userId) =>
  api.get('/records/archive.php', { params: { user_id: userId } });
export const getReservationRecordDetail = (reservationId) =>
  api.get('/records/archive.php', { params: { reservation_id: reservationId } });
export const getUnlinkedRecordDetail = (parishRecordId) =>
  api.get('/records/archive.php', { params: { parish_record_id: parishRecordId } });
export const deleteReservationRecord = (reservationId) =>
  api.delete('/records/archive.php', { params: { reservation_id: reservationId } });
export const deleteUnlinkedRecord = (parishRecordId) =>
  api.delete('/records/archive.php', { params: { parish_record_id: parishRecordId } });
export const downloadParishionerFiles = (userId) =>
  api.get('/records/download.php', { params: { user_id: userId }, responseType: 'blob' });

/** Fetch a single reservation document as a blob (binary; bypasses axios JSON interceptor). */
export async function fetchReservationDocument(documentId, options = {}) {
  const params = new URLSearchParams({ id: String(documentId) });
  if (options.disposition === 'inline') {
    params.set('disposition', 'inline');
  }

  const response = await fetch(`${API_BASE}/reservations/download.php?${params}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    let message = 'Failed to load document';
    try {
      const payload = await response.json();
      if (payload?.message) message = payload.message;
    } catch {
      // Non-JSON error body.
    }
    throw new Error(message);
  }

  const contentType = (response.headers.get('content-type') || 'application/octet-stream')
    .split(';')[0]
    .trim();
  const rawBlob = await response.blob();
  const blob = rawBlob.type
    ? rawBlob
    : new Blob([rawBlob], { type: contentType });

  return {
    blob,
    contentType: blob.type || contentType,
  };
}

export const getDashboardStats = () => api.get('/dashboard/stats.php');

export const getReportsSummary = (params) => api.get('/reports/summary.php', { params });
export const getReportsReservations = (params) => api.get('/reports/reservations.php', { params });
export const getReportsAppointments = (params) => api.get('/reports/appointments.php', { params });
export const getReportsUsers = (params) => api.get('/reports/users.php', { params });
export const getReportsRecords = (params) => api.get('/reports/records.php', { params });
export const getReportsNotifications = (params) => api.get('/reports/notifications.php', { params });
export const getReportsDashboard = (params) => api.get('/reports/dashboard.php', { params });
export const exportReports = (params) => api.get('/reports/export.php', { params, responseType: 'blob' });

export const getNotifications = () => api.get('/notifications/index.php');
export const markNotificationRead = (id) =>
  api.patch('/notifications/index.php', { id });
export const markAllNotificationsRead = () =>
  api.patch('/notifications/index.php', { mark_all_read: true });
export const deleteNotification = (id) =>
  api.delete(`/notifications/index.php?id=${id}`);

export const getSettings = () => api.get('/settings/index.php');
export const updateSettings = (data) => api.patch('/settings/index.php', data);

export const getSMSLogs = (params) => api.get('/sms/index.php', { params });

export default api;
