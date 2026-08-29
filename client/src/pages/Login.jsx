import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/navbar/Navbar';
import Footer from '../components/footer/Footer';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (!user || !user.role) {
        setError('Login failed: Invalid user data received.');
        return;
      }
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f3ee]">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12 md:py-16">
        <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#e8e0d3] bg-white shadow-[0_30px_80px_rgba(15,31,45,0.11)] ring-1 ring-[#f0e8dc]">
          <div className="grid md:grid-cols-[1.05fr_1.35fr]">
            <div className="relative overflow-hidden bg-[#0f2337] px-7 py-10 text-white md:px-10 md:py-12">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(215,181,122,0.22),transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),transparent_24%)]" aria-hidden="true" />
              <div className="relative z-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#d7b57a]">Holy Family Parish</p>
                <h1 className="mt-4 font-display text-3xl md:text-4xl font-bold leading-snug">Welcome back</h1>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-200">
                  Sign in to access your parish account and manage your appointments and reservations.
                </p>

                <div className="mt-8 space-y-3 text-sm text-slate-200">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d7b57a] text-[#0f2337] font-bold text-xs">01</span>
                    <span>Access your parish profile</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d7b57a] text-[#0f2337] font-bold text-xs">02</span>
                    <span>Manage reservations and services</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d7b57a] text-[#0f2337] font-bold text-xs">03</span>
                    <span>Stay updated with parish news</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-8 sm:px-8 md:px-10 md:py-10">
              <div className="mb-6 text-center md:text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d7b57a]">Account Access</p>
                <h2 className="mt-2 font-display text-2xl text-[#0f2337]">Login</h2>
              </div>

              {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#d7b57a] focus:bg-white focus:ring-2 focus:ring-[#d7b57a]/20"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-11 text-sm text-slate-800 outline-none transition focus:border-[#d7b57a] focus:bg-white focus:ring-2 focus:ring-[#d7b57a]/20"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                  <button type="button" className="text-xs font-medium text-slate-500 transition hover:text-slate-700">
                    Forgot password?
                  </button>

                  <button
                    type="submit"
                    className="inline-flex w-full max-w-[180px] items-center justify-center rounded-xl bg-[#0f2337] px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#18324c] disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Login'}
                  </button>
                </div>
              </form>

              <p className="mt-5 text-center text-sm text-slate-600">
                No account?{' '}
                <Link to="/register" className="font-semibold text-[#0f2337] transition hover:text-[#1d3d5c]">
                  Register
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
