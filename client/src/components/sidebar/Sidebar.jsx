import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import {
  IconAppointments,
  IconDashboard,
  IconReservations,
} from '../icons/ParishionerNavIcons';

export default function Sidebar() {
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
    { to: '/admin/reservations', label: t('sidebar.reservations'), icon: '📋' },
    { to: '/admin/appointments', label: t('sidebar.appointments'), icon: '📅' },
    { to: '/admin/records', label: t('sidebar.records'), icon: '📁' },
    { to: '/admin/users', label: t('sidebar.users'), icon: '👥' },
    { to: '/admin/sms-logs', label: 'SMS Logs', icon: '📱' },
    { to: '/admin/reports', label: 'Reports', icon: '📊' },
  ];

  if (isAdmin) {
    return (
      <aside className="w-64 shrink-0 hidden border-r border-slate-200 bg-gradient-to-b from-[#f8fafc] to-[#f3f5f8] shadow-[0_12px_28px_rgba(15,31,45,0.06)] dark:border-gray-700 dark:bg-gray-900 lg:fixed lg:left-0 lg:top-16 lg:z-40 lg:block lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
        <div className="flex h-full flex-col p-4">
          <nav className="mt-1 space-y-1.5" aria-label="Admin navigation">
            {adminLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
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
                      {link.icon}
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
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200/80 dark:border-gray-700 shrink-0 hidden lg:fixed lg:top-16 lg:left-0 lg:z-40 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:block shadow-sm">
      <div className="flex flex-col h-full px-3 py-5">
        <nav className="space-y-1.5 mt-1" aria-label="Parishioner navigation">
          {userPageLinks.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
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
