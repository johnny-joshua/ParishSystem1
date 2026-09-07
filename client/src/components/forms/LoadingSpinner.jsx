/**
 * LoadingSpinner — reusable loading indicator.
 *
 * Props
 *   fullPage  – centres the spinner in the full viewport (used by route
 *               guards while authentication is initialising so no protected
 *               content flashes before auth state is resolved).
 *   label     – optional text shown below the spinner.
 *   auth      – when true AND fullPage, shows the "Checking your session…"
 *               branding variant required by the auth loading spec.
 */
export default function LoadingSpinner({ fullPage = false, label = '', auth = false }) {
  const spinner = (
    <div
      className="w-10 h-10 border-4 border-parish-gold border-t-parish-blue rounded-full animate-spin"
      role="status"
      aria-label="Loading"
    />
  );

  if (fullPage) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 bg-parish-cream"
        aria-live="polite"
        aria-busy="true"
      >
        {auth && (
          <div className="flex flex-col items-center gap-1 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#d7b57a]">
              Holy Family Parish
            </span>
          </div>
        )}

        {spinner}

        <p className="text-sm font-medium text-slate-500 mt-1">
          {label || (auth ? 'Checking your session…' : 'Loading…')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12" aria-live="polite" aria-busy="true">
      {spinner}
      {label && <p className="text-sm font-medium text-slate-500">{label}</p>}
    </div>
  );
}
