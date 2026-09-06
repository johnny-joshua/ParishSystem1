import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PARISH_LOCATION } from '../../utils/constants';

const MAPS_URL = 'https://www.google.com/maps?q=Holy%20Family%20Parish%20Putiao%20Pilar%20Sorsogon';

const EXPLORE_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Parish Services', to: '/services' },
  { label: 'About Us', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

const PORTAL_LINKS = [
  { label: 'Create Account', to: '/register' },
  { label: 'Sign In', to: '/login' },
  { label: 'Reservations', to: '/reservations' },
];

function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      className="text-sm text-blue-100/90 hover:text-parish-gold transition-colors duration-200"
    >
      {children}
    </Link>
  );
}

function FooterNavLink({ to, children }) {
  return (
    <Link
      to={to}
      className="text-sm text-blue-100/90 hover:text-parish-gold transition-colors duration-200"
    >
      {children}
    </Link>
  );
}

export default function Footer() {
  const { user } = useAuth();
  const year = new Date().getFullYear();

  if (user) return null;

  return (
    <footer className="mt-auto w-full bg-[#14212b] p-0 text-white">
      <div
        className="relative w-full overflow-hidden bg-[#14212b]"
        style={{
          backgroundImage: "linear-gradient(90deg, rgba(20, 33, 43, 0.98) 0%, rgba(20, 33, 43, 0.95) 48%, rgba(20, 33, 43, 0.82) 100%), url('/parish.jpg')",
          backgroundPosition: 'center right',
          backgroundSize: 'cover',
        }}
      >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-12 sm:px-8 md:pt-14 lg:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-5">
            <Link to="/" className="inline-flex items-center gap-2.5 group mb-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-parish-gold text-parish-gold transition-transform group-hover:scale-110">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M4 20h16M6 20V10h12v10M4 10l8-6 8 6M9 20v-5h6v5M12 4v-2M10.5 4h3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
                <span className="font-display text-lg font-bold text-white transition-colors group-hover:text-parish-gold">
                {PARISH_LOCATION.name}
              </span>
            </Link>
              <p className="mb-6 max-w-sm text-sm leading-relaxed text-blue-100/80">
              A centralized digital record management system for sacraments, reservations, and pastoral
              services—serving the faithful of Putiao, Pilar, Sorsogon.
            </p>
            <address className="not-italic space-y-3">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-parish-gold">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-parish-gold mb-0.5">Address</p>
                  <p className="text-sm text-blue-100/90 leading-relaxed">{PARISH_LOCATION.address}</p>
                  <a
                    href={MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-white/70 hover:text-parish-gold transition"
                  >
                    Open in Google Maps
                    <span aria-hidden>→</span>
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-parish-gold">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-parish-gold mb-0.5">Office Hours</p>
                  <p className="text-sm text-blue-100/90">Wednesday – Monday</p>
                  <p className="text-sm text-blue-100/90">8:00 AM – 5:00 PM</p>
                  <p className="text-xs text-blue-200/50 mt-1">Closed Tuesdays</p>
                </div>
              </div>
            </address>
          </div>

          <div className="lg:col-span-2 lg:col-start-7">
            <h4 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-parish-gold">Quick Links</h4>
            <ul className="space-y-2.5">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.to}>
                  <FooterLink to={link.to}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-parish-gold">Parish Portal</h4>
            <ul className="space-y-2.5">
              {PORTAL_LINKS.map((link) => (
                <li key={link.to}>
                  <FooterNavLink to={link.to}>{link.label}</FooterNavLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-parish-gold">Stay Connected</h4>
            <p className="text-sm text-blue-100/80 leading-relaxed mb-4">
              Visit the parish office for sacramental inquiries, or register online to book services.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-parish-gold px-4 py-2.5 text-sm font-semibold text-parish-blue shadow-md transition hover:bg-yellow-500 hover:shadow-lg"
            >
              Get Started
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-parish-gold/60 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-center sm:text-left">
            <p className="text-xs text-blue-200/70 leading-relaxed">
              © {year} {PARISH_LOCATION.name}. Centralized Digital Record Management System.
            </p>
            <p className="text-xs text-blue-200/50">
              Putiao, Pilar, Sorsogon · Philippines
            </p>
          </div>
        </div>
      </div>
      </div>
    </footer>
  );
}
