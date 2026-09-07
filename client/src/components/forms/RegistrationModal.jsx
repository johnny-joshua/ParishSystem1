/**
 * RegistrationModal.jsx
 *
 * A modern, minimalist User Registration Modal component.
 * Renders via a React portal into document.body.
 *
 * Features:
 *  - Smooth scale/fade entrance animation
 *  - Backdrop blur + backdrop-click to dismiss
 *  - Escape key listener to dismiss
 *  - Full-Name, Email, Password, Confirm Password fields
 *  - Show/hide password toggles (Eye / EyeOff icons from lucide-react)
 *  - Live password strength meter
 *  - Terms & Conditions checkbox
 *  - Inline field-level validation with error messages
 *  - Loading spinner on submit
 *  - Success state panel
 *  - Dark-mode support via Tailwind dark: variants
 *  - Accessible: roles, aria-labels, focus-rings
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Validation helpers
───────────────────────────────────────────── */
const VALIDATORS = {
  fullName: (v) =>
    v.trim().length < 2 ? 'Full name must be at least 2 characters.' : '',
  email: (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
      ? ''
      : 'Please enter a valid email address.',
  password: (v) =>
    v.length < 8
      ? 'Password must be at least 8 characters.'
      : !/[A-Z]/.test(v)
      ? 'Include at least one uppercase letter.'
      : !/[0-9]/.test(v)
      ? 'Include at least one number.'
      : '',
  confirmPassword: (v, password) =>
    v !== password ? 'Passwords do not match.' : '',
  terms: (v) => (v ? '' : 'You must accept the Terms & Conditions.'),
};

/* ─────────────────────────────────────────────
   Password strength meter helper
───────────────────────────────────────────── */
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-400' };
  if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-400' };
  if (score === 4) return { score, label: 'Good', color: 'bg-emerald-400' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
}

/* ─────────────────────────────────────────────
   InputField — reusable labeled input sub-component
───────────────────────────────────────────── */
function InputField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  touched,
  icon: Icon,
  placeholder,
  autoComplete,
  rightAdornment,
  disabled,
}) {
  const hasError = touched && error;
  const isValid = touched && !error && value;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
      >
        {label}
      </label>

      <div className="relative group">
        {Icon && (
          <span
            className={`pointer-events-none absolute inset-y-0 left-3.5 flex items-center transition-colors duration-200
              ${hasError ? 'text-red-400' : isValid ? 'text-emerald-500' : 'text-slate-400 group-focus-within:text-[#d7b57a]'}`}
          >
            <Icon size={15} strokeWidth={1.75} />
          </span>
        )}

        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={`w-full rounded-xl border bg-slate-50 py-3 text-sm text-slate-800 outline-none transition-all duration-200
            placeholder:text-slate-400
            focus:bg-white focus:ring-2 focus:ring-offset-0
            disabled:cursor-not-allowed disabled:opacity-50
            dark:bg-zinc-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-zinc-800
            ${Icon ? 'pl-10' : 'pl-3.5'}
            ${rightAdornment ? 'pr-11' : 'pr-3.5'}
            ${hasError
              ? 'border-red-300 focus:border-red-400 focus:ring-red-200 dark:border-red-700 dark:focus:ring-red-800/40'
              : isValid
              ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-200 dark:border-emerald-700 dark:focus:ring-emerald-800/40'
              : 'border-slate-200 focus:border-[#d7b57a] focus:ring-[#d7b57a]/20 dark:border-zinc-700 dark:focus:border-[#d7b57a] dark:focus:ring-[#d7b57a]/20'
            }`}
        />

        {rightAdornment && (
          <span className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightAdornment}
          </span>
        )}

        {isValid && !rightAdornment && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-emerald-500">
            <CheckCircle2 size={15} strokeWidth={2} />
          </span>
        )}
      </div>

      {hasError && (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400"
        >
          <AlertCircle size={12} strokeWidth={2} />
          {error}
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   RegistrationModal — main export
───────────────────────────────────────────── */
export default function RegistrationModal({
  isOpen,
  onClose,
  onSuccess,
  onLoginClick,
}) {
  const [fields, setFields] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false,
  });
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [visible, setVisible] = useState(false);
  const firstInputRef = useRef(null);

  /* ── Open / close animation ── */
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
      setTimeout(() => firstInputRef.current?.focus(), 120);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  /* ── Escape key ── */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Body scroll lock ── */
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  /* ── Derived errors ── */
  const errors = {
    fullName: VALIDATORS.fullName(fields.fullName),
    email: VALIDATORS.email(fields.email),
    password: VALIDATORS.password(fields.password),
    confirmPassword: VALIDATORS.confirmPassword(fields.confirmPassword, fields.password),
    terms: VALIDATORS.terms(fields.terms),
  };
  const isFormValid = Object.values(errors).every((e) => e === '');

  /* ── Event handlers ── */
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFields((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setServerError('');
  }, []);

  const handleBlur = useCallback((e) => {
    setTouched((prev) => ({ ...prev, [e.target.name]: true }));
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      onClose?.();
      setFields({ fullName: '', email: '', password: '', confirmPassword: '', terms: false });
      setTouched({});
      setServerError('');
      setSubmitted(false);
      setShowPassword(false);
      setShowConfirm(false);
    }, 220);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true, terms: true });
    if (!isFormValid) return;

    setLoading(true);
    setServerError('');
    try {
      // Replace with your real API call
      await new Promise((resolve) => setTimeout(resolve, 1800));
      setSubmitted(true);
      onSuccess?.({ fullName: fields.fullName, email: fields.email });
    } catch (err) {
      setServerError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pwStrength = getPasswordStrength(fields.password);

  if (!isOpen) return null;

  /* ── Success panel ── */
  const SuccessPanel = (
    <div className="flex flex-col items-center gap-4 px-8 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
        <CheckCircle2 className="text-emerald-500" size={32} strokeWidth={1.75} />
      </div>
      <h3 className="font-display text-xl text-slate-800 dark:text-slate-100">Account Created!</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Welcome,{' '}
        <span className="font-semibold text-slate-700 dark:text-slate-200">{fields.fullName}</span>.
        {' '}Your account has been successfully created.
      </p>
      <button
        onClick={handleClose}
        className="mt-2 rounded-xl bg-[#0f1f2d] px-8 py-3 text-sm font-semibold text-white
          transition-all duration-200 hover:bg-[#1d3551] active:scale-[0.97]
          dark:bg-[#d7b57a] dark:text-[#0f1f2d] dark:hover:bg-[#c9a25c]"
      >
        Continue
      </button>
    </div>
  );

  /* ── Form panel ── */
  const FormPanel = (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 p-6 sm:p-8">
      {/* Server error banner */}
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50
            px-4 py-3 text-sm text-red-700
            dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-400"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Full Name */}
      <div ref={firstInputRef} tabIndex={-1}>
        <InputField
          id="reg-full-name"
          label="Full Name"
          type="text"
          value={fields.fullName}
          onChange={(e) => handleChange({ target: { name: 'fullName', value: e.target.value, type: 'text' } })}
          onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
          error={errors.fullName}
          touched={touched.fullName}
          icon={User}
          placeholder="Jane Doe"
          autoComplete="name"
          disabled={loading}
        />
      </div>

      {/* Email */}
      <InputField
        id="reg-email"
        label="Email Address"
        type="email"
        value={fields.email}
        onChange={(e) => handleChange({ target: { name: 'email', value: e.target.value, type: 'email' } })}
        onBlur={() => setTouched((p) => ({ ...p, email: true }))}
        error={errors.email}
        touched={touched.email}
        icon={Mail}
        placeholder="jane@example.com"
        autoComplete="email"
        disabled={loading}
      />

      {/* Password + strength meter */}
      <div className="space-y-2">
        <InputField
          id="reg-password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={fields.password}
          onChange={(e) => handleChange({ target: { name: 'password', value: e.target.value, type: 'password' } })}
          onBlur={() => setTouched((p) => ({ ...p, password: true }))}
          error={errors.password}
          touched={touched.password}
          icon={Lock}
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          disabled={loading}
          rightAdornment={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showPassword ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
            </button>
          }
        />

        {/* Password strength bar */}
        {fields.password && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((seg) => (
                <div
                  key={seg}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    seg <= pwStrength.score ? pwStrength.color : 'bg-slate-200 dark:bg-zinc-700'
                  }`}
                />
              ))}
            </div>
            {pwStrength.label && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Strength:{' '}
                <span className={`font-semibold ${
                  pwStrength.score <= 1 ? 'text-red-500' : pwStrength.score <= 3 ? 'text-amber-500' : 'text-emerald-500'
                }`}>
                  {pwStrength.label}
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <InputField
        id="reg-confirm-password"
        label="Confirm Password"
        type={showConfirm ? 'text' : 'password'}
        value={fields.confirmPassword}
        onChange={(e) => handleChange({ target: { name: 'confirmPassword', value: e.target.value, type: 'password' } })}
        onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
        error={errors.confirmPassword}
        touched={touched.confirmPassword}
        icon={Lock}
        placeholder="Re-enter password"
        autoComplete="new-password"
        disabled={loading}
        rightAdornment={
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
          >
            {showConfirm ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
          </button>
        }
      />

      {/* Terms checkbox */}
      <div className="space-y-1.5">
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors duration-200
            ${touched.terms && errors.terms
              ? 'border-red-200 bg-red-50/60 dark:border-red-800/50 dark:bg-red-900/10'
              : fields.terms
              ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/50 dark:bg-emerald-900/10'
              : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800/40 dark:hover:bg-zinc-800'
            }`}
        >
          <input
            id="reg-terms"
            name="terms"
            type="checkbox"
            checked={fields.terms}
            onChange={handleChange}
            onBlur={() => setTouched((p) => ({ ...p, terms: true }))}
            disabled={loading}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#d7b57a]"
          />
          <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            I agree to the{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#b18a45] underline-offset-2 hover:underline dark:text-[#d7b57a]"
              onClick={(e) => e.stopPropagation()}
            >
              Terms &amp; Conditions
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#b18a45] underline-offset-2 hover:underline dark:text-[#d7b57a]"
              onClick={(e) => e.stopPropagation()}
            >
              Privacy Policy
            </a>
            .
          </span>
        </label>
        {touched.terms && errors.terms && (
          <p role="alert" className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
            <AlertCircle size={12} strokeWidth={2} />
            {errors.terms}
          </p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full overflow-hidden rounded-xl bg-[#0f1f2d] px-4 py-3.5
          text-sm font-semibold uppercase tracking-[0.14em] text-white
          shadow-[0_4px_20px_rgba(15,31,45,0.25)]
          transition-all duration-200
          hover:bg-[#1d3551] hover:shadow-[0_6px_28px_rgba(15,31,45,0.35)]
          active:scale-[0.98]
          disabled:cursor-not-allowed disabled:opacity-60
          dark:bg-[#d7b57a] dark:text-[#0f1f2d]
          dark:hover:bg-[#c9a25c] dark:shadow-[0_4px_20px_rgba(215,181,122,0.2)]"
      >
        <span className="flex items-center justify-center gap-2.5">
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating Account&hellip;
            </>
          ) : (
            <>
              <ShieldCheck size={16} strokeWidth={2} />
              Create Account
            </>
          )}
        </span>
      </button>

      {/* Footer link */}
      <p className="pt-1 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onLoginClick}
          className="font-semibold text-[#b18a45] transition-colors
            hover:text-[#0f1f2d] dark:text-[#d7b57a] dark:hover:text-white"
        >
          Log in
        </button>
      </p>
    </form>
  );

  /* ── Portal render ── */
  return createPortal(
    <div
      role="presentation"
      aria-hidden={!isOpen}
      onClick={handleClose}
      className={`fixed inset-0 z-[300] flex items-center justify-center p-4
        bg-black/40 backdrop-blur-sm
        transition-opacity duration-200
        ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reg-modal-title"
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md overflow-hidden rounded-2xl
          border border-slate-200 bg-white
          shadow-[0_32px_80px_rgba(15,31,45,0.22)]
          transition-all duration-[220ms] ease-out
          dark:border-zinc-700 dark:bg-zinc-900
          ${visible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-2'}`}
      >
        {/* ── Modal header ── */}
        <div className="relative bg-[#0f1f2d] px-6 py-6 sm:px-8 dark:bg-zinc-950">
          {/* Gold accent bar */}
          <div className="absolute left-0 top-0 h-0.5 w-full bg-gradient-to-r from-[#d7b57a]/0 via-[#d7b57a] to-[#d7b57a]/0" />

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d7b57a]">
                Holy Family Parish
              </p>
              <h2
                id="reg-modal-title"
                className="mt-2 font-display text-2xl font-semibold text-white"
              >
                {submitted ? 'Welcome aboard!' : 'Create an account'}
              </h2>
            </div>

            {/* Close (X) button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close registration modal"
              className="flex h-8 w-8 items-center justify-center rounded-lg
                text-white/50 transition-colors duration-150
                hover:bg-white/10 hover:text-white
                focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          {!submitted && (
            <p className="mt-2 text-sm text-blue-100/70">
              Sign up to manage your parish services and bookings.
            </p>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div className="max-h-[calc(100svh-12rem)] overflow-y-auto">
          {submitted ? SuccessPanel : FormPanel}
        </div>
      </section>
    </div>,
    document.body
  );
}
