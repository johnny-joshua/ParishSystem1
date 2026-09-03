import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/navbar/Navbar';
import Footer from '../components/footer/Footer';

export default function Register() {
  const [form, setForm] = useState({
    fullname: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirm: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    const normalizedEmail = form.email.trim();
    if (!/^[^@\s]+@gmail\.com$/i.test(normalizedEmail)) {
      setFieldErrors({ email: 'Please use a valid Gmail address ending in @gmail.com.' });
      return;
    }
    if (form.password !== form.confirm) {
      setFieldErrors({ confirm: 'Passwords do not match.' });
      return;
    }
    setLoading(true);
    try {
      await register({
        fullname: form.fullname.trim(),
        email: normalizedEmail,
        phone: form.phone.trim(),
        address: form.address.trim(),
        password: form.password,
        confirm_password: form.confirm,
      });
      navigate('/', { replace: true, state: { registered: true } });
    } catch (err) {
      setError(err.message || 'Registration failed.');
      if (err.errors) setFieldErrors(err.errors);
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, type = 'text', required = true) => (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">{label}</label>
      <input
        type={type}
        name={name}
        className={`w-full rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#d7b57a] focus:bg-white focus:ring-2 focus:ring-[#d7b57a]/20 ${fieldErrors[name] ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}
        value={form[name]}
        onChange={handleChange}
        required={required}
      />
      {fieldErrors[name] && <p className="mt-1 text-xs text-red-600">{fieldErrors[name]}</p>}
    </div>
  );

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
                <h1 className="mt-4 font-display text-3xl md:text-4xl font-bold leading-snug">Create your account</h1>

                <div className="mt-8 space-y-3 text-sm text-slate-200">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d7b57a] text-[#0f2337] font-bold text-xs">01</span>
                    <span>Register as parishioner</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d7b57a] text-[#0f2337] font-bold text-xs">02</span>
                    <span>Manage services and appointments</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d7b57a] text-[#0f2337] font-bold text-xs">03</span>
                    <span>Stay connected with parish updates</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-8 sm:px-8 md:px-10 md:py-10">
              <div className="mb-6 text-center md:text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d7b57a]">Account Setup</p>
                <h2 className="mt-2 font-display text-2xl text-[#0f2337]">Register</h2>
              </div>

              {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">{field('fullname', 'Full Name')}</div>
                  <div className="md:col-span-2">{field('email', 'Email', 'email')}</div>
                  <div>{field('phone', 'Phone', 'tel')}</div>
                  <div>{field('address', 'Address', 'text', false)}</div>
                  <div>{field('password', 'Password', 'password')}</div>
                  <div>{field('confirm', 'Confirm Password', 'password')}</div>
                </div>

                <button
                  type="submit"
                  className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[#0f2337] px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#18324c] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : 'Register'}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-600">
                Already registered?{' '}
                <Link to="/login" className="font-semibold text-[#0f2337] transition hover:text-[#1d3d5c]">
                  Sign in
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
