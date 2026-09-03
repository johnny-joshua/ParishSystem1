import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import {
  IconAppointments,
  IconCalendar,
  IconDashboard,
  IconReservations,
} from '../icons/ParishionerNavIcons';

export default function Sidebar({ isMobileOpen = false, onClose = () => {} }) {
  const { isAdmin } = useAuth();
  const { t } = useSettings();

  const userPageLinks = [
    { to: '/dashboard', label: t('nav.dashboard'), Icon: IconDashboard },
    { to: '/make-request', label: 'Make a Request', Icon: IconReservations },
    { to: '/reservations', label: t('nav.viewReservation'), Icon: IconReservations },
    { to: '/appointments', label: t('nav.viewAppointment'), Icon: IconAppointments },
  ];

  const adminLinks = [
    { to: '/admin/dashboard', label: t('nav.dashboard'), icon: '🏠' },
    { to: '/admin/parish-calendar', label: 'Parish Calendar', Icon: IconCalendar },
    { to: '/admin/reservations', label: t('sidebar.reservations'), icon: '📋' },
    { to: '/admin/appointments', label: t('sidebar.appointments'), icon: '📅' },
    { to: '/admin/records', label: t('sidebar.records'), icon: '📁' },
    { to: '/admin/users', label: t('sidebar.users'), icon: '👥' },
    { to: '/admin/sms-logs', label: 'SMS Logs', icon: '📱' },
    { to: '/admin/reports', label: 'Reports', icon: '📊' },
  ];

  if (isAdmin) {
    return (
      <aside
        className={`fixed left-0 top-16 sm:top-20 z-40 h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-5rem)] w-[82vw] max-w-[280px] overflow-y-auto border-r border-slate-200 bg-gradient-to-b from-[#f8fafc] to-[#f3f5f8] shadow-[0_12px_28px_rgba(15,31,45,0.06)] transition-transform duration-200 dark:border-gray-700 dark:bg-gray-900 2xl:top-0 2xl:h-screen 2xl:w-64 2xl:translate-x-0 2xl:shadow-[0_12px_28px_rgba(15,31,45,0.06)] ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full 2xl:translate-x-0'
        }`}
      >
        <div className="flex h-full flex-col p-4">
          <nav className="mt-1 space-y-1.5" aria-label="Admin navigation">
            {adminLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#0f2337] text-white shadow-md shadow-[#0f2337]/15'
                      : 'text-slate-700 hover:bg-[#f1e7d1] hover:text-[#0f2337] dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-base transition-colors duration-200 ${
                        isActive ? 'bg-white/10 text-[#d7b57a]' : 'bg-slate-100 text-slate-600 group-hover:bg-[#e9dcc0] group-hover:text-[#0f2337]'
                      }`}
                    >
                      {link.Icon ? <link.Icon className="h-[18px] w-[18px]" /> : link.icon}
                    </span>
                    <span className="leading-snug">{link.label}</span>
                    {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-[#d7b57a]" aria-hidden="true" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`fixed left-0 top-16 sm:top-20 z-40 h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-5rem)] w-[82vw] max-w-[280px] overflow-y-auto border-r border-gray-200/80 bg-white shadow-sm transition-transform duration-200 dark:border-gray-700 dark:bg-gray-900 2xl:top-0 2xl:h-screen 2xl:w-64 2xl:translate-x-0 2xl:shadow-sm ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full 2xl:translate-x-0'
      }`}
    >
      <div className="flex flex-col h-full px-3 py-5">
        <nav className="space-y-1.5 mt-1" aria-label="Parishioner navigation">
          {userPageLinks.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-parish-blue text-white shadow-md shadow-parish-blue/20'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-parish-gold-light/70 dark:hover:bg-gray-800 hover:text-parish-blue dark:hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors duration-200 ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'bg-gray-100 text-parish-blue dark:bg-gray-800 dark:text-parish-gold group-hover:bg-parish-gold/15'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                  <span className="leading-snug">{label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-parish-gold shrink-0" aria-hidden />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
