/**
 * Unauthorized — displayed when an authenticated user attempts to access a
 * route their role does not permit (HTTP 403 equivalent on the frontend).
 *
 * The "Back to Dashboard" button uses getDashboardByRole so the link always
 * points to the correct role-scoped dashboard without hardcoding paths here.
 */
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardByRole } from '../utils/roleRedirect';

export default function Unauthorized() {
  const { role, user } = useAuth();

  const dashboardPath = user ? getDashboardByRole(role) : '/login';
  const dashboardLabel = user ? 'Back to Dashboard' : 'Go to Login';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f3ee] px-4 text-center">
      {/* Decorative top bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0f2337] via-[#d7b57a] to-[#0f2337]" aria-hidden="true" />

      <div className="max-w-md w-full">
        {/* Parish brand */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#d7b57a] mb-6">
          Holy Family Parish
        </p>

        {/* 403 badge */}
        <div
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#0f2337] text-[#d7b57a] text-3xl font-bold shadow-lg mb-6 select-none"
          aria-hidden="true"
        >
          403
        </div>

        <h1 className="font-display text-3xl font-bold text-[#0f2337] mb-3">
          Access Denied
        </h1>

        <p className="text-slate-600 text-sm leading-relaxed mb-8">
          You do not have permission to view this page.
          {user ? (
            <> Your account role does not grant access to the requested resource.</>
          ) : (
            <> Please log in with an authorised account to continue.</>
          )}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to={dashboardPath}
            id="unauthorized-dashboard-btn"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f2337] px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#18324c] focus:outline-none focus:ring-2 focus:ring-[#d7b57a] focus:ring-offset-2"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path
                d="M19 12H5M5 12l7-7M5 12l7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {dashboardLabel}
          </Link>

          <Link
            to="/"
            id="unauthorized-home-btn"
            className="inline-flex items-center justify-center rounded-xl border border-[#d7b57a] px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#0f2337] transition hover:bg-[#d7b57a]/10 focus:outline-none focus:ring-2 focus:ring-[#d7b57a] focus:ring-offset-2"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
