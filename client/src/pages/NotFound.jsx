/**
 * NotFound — displayed for any URL that does not match a defined route
 * (HTTP 404 equivalent on the frontend).
 *
 * Previously App.jsx used <Navigate to="/" replace /> as the catch-all,
 * which silently swallowed every mistyped URL. This page replaces that.
 */
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardByRole } from '../utils/roleRedirect';

export default function NotFound() {
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f3ee] px-4 text-center">
      {/* Decorative top bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0f2337] via-[#d7b57a] to-[#0f2337]" aria-hidden="true" />

      <div className="max-w-md w-full">
        {/* Parish brand */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#d7b57a] mb-6">
          Holy Family Parish
        </p>

        {/* Decorative 404 */}
        <div className="relative mb-6 select-none" aria-hidden="true">
          <span className="font-display text-[8rem] font-bold leading-none text-[#0f2337]/8 absolute inset-0 flex items-center justify-center">
            404
          </span>
          <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#0f2337] text-[#d7b57a] text-3xl font-bold shadow-lg">
            404
          </div>
        </div>

        <h1 className="font-display text-3xl font-bold text-[#0f2337] mb-3">
          Page Not Found
        </h1>

        <p className="text-slate-600 text-sm leading-relaxed mb-8">
          The page you are looking for does not exist or may have been moved.
          Please check the URL and try again.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {user ? (
            <Link
              to={getDashboardByRole(role)}
              id="notfound-dashboard-btn"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f2337] px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#18324c] focus:outline-none focus:ring-2 focus:ring-[#d7b57a] focus:ring-offset-2"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
                <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              id="notfound-login-btn"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f2337] px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#18324c] focus:outline-none focus:ring-2 focus:ring-[#d7b57a] focus:ring-offset-2"
            >
              Go to Login
            </Link>
          )}

          <Link
            to="/"
            id="notfound-home-btn"
            className="inline-flex items-center justify-center rounded-xl border border-[#d7b57a] px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#0f2337] transition hover:bg-[#d7b57a]/10 focus:outline-none focus:ring-2 focus:ring-[#d7b57a] focus:ring-offset-2"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
