import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useSettings } from '../../context/SettingsContext';
import Modal from '../forms/Modal';
import {
  IconLogout,
  IconNotifications,
  IconProfile,
  IconSettings,
} from '../icons/ParishionerNavIcons';

function MenuItem({ to, icon, children, badge, onSelect }) {
  const className =
    'flex items-center gap-2.5 px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition';
  return (
    <Link to={to} role="menuitem" onClick={onSelect} className={className}>
      <span className="w-5 text-center text-base leading-none shrink-0" aria-hidden>
        {icon}
      </span>
      <span className="flex-1">{children}</span>
      {badge > 0 && (
        <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

function ParishionerMenuItem({ to, icon: Icon, children, badge, onSelect }) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onSelect}
      className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-parish-gold-light/80 dark:hover:bg-gray-700/80 transition-colors duration-200"
    >
      <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700/80 text-parish-blue dark:text-parish-gold shrink-0">
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <span className="flex-1 leading-snug">{children}</span>
      {badge > 0 && (
        <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

export default function Navbar() {
  const { user, logout, isAdmin, login } = useAuth();
  const { unreadCount } = useNotifications();
  const { t } = useSettings();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const profileRef = useRef(null);
  const initials = (user?.fullname || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'U';

  const closeProfile = () => setProfileOpen(false);

  const handleQuickLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const loggedUser = await login(loginForm.email, loginForm.password);
      if (!loggedUser || !loggedUser.role) {
        throw new Error('Login failed: Invalid user data received.');
      }

      setAccountOpen(false);
      navigate(loggedUser.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
    } catch (error) {
      setLoginError(error.message || 'Login failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  useEffect(() => {
    const onDocMouseDown = (e) => {
      const clickedInsideProfile = profileRef.current && profileRef.current.contains(e.target);
      const clickedInsideAccount = e.target.closest('[data-account-menu="true"]');

      if (!clickedInsideProfile) setProfileOpen(false);
      if (!clickedInsideAccount) setAccountOpen(false);
    };

    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0f2337]/95 backdrop-blur-xl shadow-[0_12px_28px_rgba(6,14,22,0.14)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-5 h-16 sm:h-20">
          {!user && <div className="w-0 md:w-0" aria-hidden="true" />}

          {user && (
            <div className="flex min-w-0 items-center lg:min-w-[180px] lg:shrink-0">
              <Link
                to="/"
                className="text-[10px] sm:text-sm md:text-base font-display font-bold tracking-[0.08em] uppercase text-[#f7f3eb] transition-colors duration-200 hover:text-[#d7b57a]"
              >
                Holy Family Parish
              </Link>
            </div>
          )}

          <div className="flex-1 flex justify-center min-w-0">
            <div className="hidden sm:flex items-center justify-center gap-1 md:gap-7 lg:gap-10 px-1 md:px-4">
              {!user && (
                <>
                  <a
                    href="/#home"
                    className="px-3 py-2 text-[11px] md:text-xs font-semibold uppercase tracking-[0.22em] text-white/85 transition-all duration-200 hover:text-[#d7b57a] hover:translate-y-[-1px]"
                  >
                    {t('nav.home')}
                  </a>
                  <a
                    href="/#services"
                    className="px-3 py-2 text-[11px] md:text-xs font-semibold uppercase tracking-[0.22em] text-white/85 transition-all duration-200 hover:text-[#d7b57a] hover:translate-y-[-1px]"
                  >
                    {t('nav.services')}
                  </a>
                  <a
                    href="/#about"
                    className="px-3 py-2 text-[11px] md:text-xs font-semibold uppercase tracking-[0.22em] text-white/85 transition-all duration-200 hover:text-[#d7b57a] hover:translate-y-[-1px]"
                  >
                    {t('nav.about')}
                  </a>
                  <a
                    href="/#contact"
                    className="px-3 py-2 text-[11px] md:text-xs font-semibold uppercase tracking-[0.22em] text-white/85 transition-all duration-200 hover:text-[#d7b57a] hover:translate-y-[-1px]"
                  >
                    {t('nav.contact')}
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 sm:gap-3 min-w-0">
            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  aria-label="Profile menu"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  onClick={() => setProfileOpen((v) => !v)}
                  className={`relative w-10 h-10 rounded-full bg-[#d7b57a] text-[#0f2337] font-semibold text-xs transition-all duration-200 flex items-center justify-center border border-[#d7b57a]/80 shadow-[0_8px_18px_rgba(215,181,122,0.25)] ${
                    isAdmin
                      ? 'hover:brightness-95'
                      : `hover:ring-2 hover:ring-[#d7b57a]/40 ${
                          profileOpen ? 'ring-2 ring-white/70 shadow-md' : 'hover:brightness-95'
                        }`
                  }`}
                >
                  <span className="leading-none">{initials}</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-parish-blue">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {profileOpen && (
                  <div
                    role="menu"
                    className={
                      isAdmin
                        ? 'absolute right-0 mt-2 w-64 overflow-hidden rounded-[22px] border border-slate-200 bg-white text-gray-800 shadow-[0_26px_60px_rgba(15,31,45,0.16)] ring-1 ring-black/5 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'
                        : 'absolute right-0 mt-2.5 w-64 rounded-2xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-2xl shadow-gray-900/10 ring-1 ring-gray-200/80 dark:ring-gray-700 overflow-hidden'
                    }
                  >
                    <div
                      className={
                        isAdmin
                          ? 'bg-gradient-to-r from-[#0f2337] via-[#12314b] to-[#1d4563] px-4 py-4 text-white'
                          : 'px-4 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-br from-parish-gold-light/40 to-white dark:from-gray-800 dark:to-gray-800'
                      }
                    >
                      {isAdmin ? (
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-[#d7b57a] ring-1 ring-white/15">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold leading-tight">{user.fullname}</p>
                            <p className="mt-0.5 truncate text-[11px] text-slate-200">{user.email}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-parish-blue text-parish-gold font-semibold text-sm shrink-0 border-2 border-white dark:border-gray-700 shadow-sm">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-tight text-parish-blue dark:text-white truncate">
                              {user.fullname}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight mt-0.5 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {isAdmin ? (
                      <div className="py-2">
                        <ParishionerMenuItem to="/profile" icon={IconProfile} onSelect={closeProfile}>
                          {t('nav.manageProfile')}
                        </ParishionerMenuItem>
                        <ParishionerMenuItem
                          to="/notifications"
                          icon={IconNotifications}
                          badge={unreadCount}
                          onSelect={closeProfile}
                        >
                          {t('nav.notifications')}
                        </ParishionerMenuItem>
                        <ParishionerMenuItem to="/settings" icon={IconSettings} onSelect={closeProfile}>
                          {t('nav.settings')}
                        </ParishionerMenuItem>

                        <div className="my-2 mx-4 border-t border-gray-100 dark:border-gray-700" />

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            closeProfile();
                            setLogoutConfirmOpen(true);
                          }}
                          className="w-full text-left flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                        >
                          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/20 shrink-0">
                            <IconLogout className="w-[18px] h-[18px]" />
                          </span>
                          {t('nav.logout')}
                        </button>
                      </div>
                    ) : (
                      <div className="py-2">
                        <ParishionerMenuItem to="/profile" icon={IconProfile} onSelect={closeProfile}>
                          {t('nav.manageProfile')}
                        </ParishionerMenuItem>
                        <ParishionerMenuItem
                          to="/notifications"
                          icon={IconNotifications}
                          badge={unreadCount}
                          onSelect={closeProfile}
                        >
                          {t('nav.notifications')}
                        </ParishionerMenuItem>
                        <ParishionerMenuItem to="/settings" icon={IconSettings} onSelect={closeProfile}>
                          {t('nav.settings')}
                        </ParishionerMenuItem>

                        <div className="my-2 mx-4 border-t border-gray-100 dark:border-gray-700" />

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            closeProfile();
                            setLogoutConfirmOpen(true);
                          }}
                          className="w-full text-left flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                        >
                          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/20 shrink-0">
                            <IconLogout className="w-[18px] h-[18px]" />
                          </span>
                          {t('nav.logout')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="relative" data-account-menu="true">
                  <button
                    type="button"
                    onClick={() => setAccountOpen((value) => !value)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#d7b57a]/80 bg-[#d7b57a] px-4 py-2.5 text-[11px] md:text-xs font-semibold uppercase tracking-[0.18em] text-[#0f2337] shadow-[0_10px_22px_rgba(215,181,122,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#e0c07d]"
                  >
                    <span>{t('nav.login')}</span>
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    >
                      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {accountOpen && (
                    <div className="absolute right-0 mt-3 w-[22rem] overflow-hidden rounded-[26px] border border-[#e8dfd0] bg-white shadow-[0_26px_60px_rgba(15,31,45,0.18)] ring-1 ring-black/5">
                      <div className="bg-gradient-to-r from-[#0f2337] via-[#12314b] to-[#1d4563] px-4 py-4 text-white">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#d7b57a]" aria-hidden="true">
                              <path d="M12 3L18 6V11C18 15.5 15.5 18.8 12 20C8.5 18.8 6 15.5 6 11V6L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                              <path d="M9.5 12L11.2 13.7L14.8 10.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d7b57a]">Welcome back</p>
                            <p className="mt-1 text-base font-semibold">Sign in</p>
                          </div>
                        </div>
                      </div>

                      <form onSubmit={handleQuickLogin} className="space-y-4 p-4">
                        {loginError && (
                          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                            {loginError}
                          </div>
                        )}

                        <div>
                          <label htmlFor="quick-login-email" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                            Email
                          </label>
                          <input
                            id="quick-login-email"
                            type="email"
                            value={loginForm.email}
                            onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#d7b57a] focus:bg-white focus:ring-2 focus:ring-[#d7b57a]/20"
                            placeholder="you@example.com"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="quick-login-password" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                            Password
                          </label>
                          <div className="relative">
                            <input
                              id="quick-login-password"
                              type={showPassword ? 'text' : 'password'}
                              value={loginForm.password}
                              onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-11 text-sm text-slate-800 outline-none transition focus:border-[#d7b57a] focus:bg-white focus:ring-2 focus:ring-[#d7b57a]/20"
                              placeholder="••••••••"
                              required
                            />
                            <button
                              type="button"
                              tabIndex={-1}
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                              onClick={() => setShowPassword((value) => !value)}
                              className="absolute inset-y-0 right-3 flex items-center text-slate-500 transition hover:text-slate-700"
                            >
                              {showPassword ? (
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" aria-hidden="true">
                                  <path d="M2 12C3.6 8.7 7.01 6 12 6C16.99 6 20.4 8.7 22 12C20.4 15.3 16.99 18 12 18C7.01 18 3.6 15.3 2 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" aria-hidden="true">
                                  <path d="M3 3L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                  <path d="M10.58 10.58C10.21 11.02 10 11.55 10 12C10 13.1 10.9 14 12 14C12.45 14 12.98 13.79 13.42 13.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M9.88 5.08C10.57 4.9 11.27 4.8 12 4.8C17.2 4.8 20.7 9.45 21.6 11.1C21.77 11.42 21.77 11.82 21.6 12.14C21.08 13.14 19.8 15.02 17.67 16.38" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M7.91 7.91C5.87 8.95 4.29 10.53 3.4 12.14C3.23 12.46 3.23 12.86 3.4 13.18C4.38 14.93 6.06 16.72 8.5 17.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => setAccountOpen(false)}
                            className="text-xs font-medium text-slate-500 transition hover:text-slate-700"
                          >
                            Forgot password?
                          </button>

                          <button
                            type="submit"
                            disabled={loginLoading}
                            className="inline-flex items-center justify-center rounded-xl bg-[#0f2337] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#18324c] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {loginLoading ? 'Signing in...' : 'Login'}
                          </button>
                        </div>

                        <div className="border-t border-slate-100 pt-3">
                          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                            <span>New here?</span>
                            <Link
                              to="/register"
                              onClick={() => setAccountOpen(false)}
                              className="font-semibold text-[#0f2337] transition hover:text-[#1a3a58]"
                            >
                              Create account
                            </Link>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}
                </div>

                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-[11px] md:text-xs font-semibold uppercase tracking-[0.18em] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10"
                >
                  {t('nav.register')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={logoutConfirmOpen} onClose={() => setLogoutConfirmOpen(false)} title={t('nav.logoutTitle')} size="sm">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl text-red-600">
            ⎋
          </div>
          <p className="mb-6 text-base font-medium text-slate-700">Are you sure you want to log out?</p>
          <div className="flex w-full gap-3">
            <button
              type="button"
              onClick={() => setLogoutConfirmOpen(false)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              No
            </button>
            <button
              type="button"
              onClick={async () => {
                setLogoutConfirmOpen(false);
                await handleLogout();
              }}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Yes
            </button>
          </div>
        </div>
      </Modal>
    </nav>
  );
}
