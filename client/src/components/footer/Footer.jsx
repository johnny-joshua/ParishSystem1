import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PARISH_LOCATION } from '../../utils/constants';

const MAPS_URL = 'https://www.google.com/maps?q=Holy%20Family%20Parish%20Putiao%20Pilar%20Sorsogon';

const EXPLORE_LINKS = [
  { label: 'Home', href: '/#home' },
  { label: 'Parish Services', href: '/#services' },
  { label: 'About Us', href: '/#about' },
  { label: 'Contact', href: '/#contact' },
];

const PORTAL_LINKS = [
  { label: 'Create Account', to: '/register' },
  { label: 'Sign In', to: '/login' },
  { label: 'Reservations', to: '/reservations' },
];

function FooterLink({ href, children }) {
  return (
    <a
      href={href}
      className="text-sm text-blue-100/90 hover:text-parish-gold transition-colors duration-200"
    >
      {children}
    </a>
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
    <footer className="mt-auto bg-parish-blue text-white relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 md:pt-16 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-5">
            <Link to="/" className="inline-flex items-center gap-2.5 group mb-5">
              <span className="text-parish-gold text-2xl leading-none transition-transform group-hover:scale-110">
                ✦
              </span>
              <span className="font-display text-xl font-bold text-white group-hover:text-parish-gold transition-colors">
                {PARISH_LOCATION.name}
              </span>
            </Link>
            <p className="text-blue-100/80 text-sm leading-relaxed max-w-sm mb-6">
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
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-parish-gold mb-4">Explore</h4>
            <ul className="space-y-2.5">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.href}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-parish-gold mb-4">Parish Portal</h4>
            <ul className="space-y-2.5">
              {PORTAL_LINKS.map((link) => (
                <li key={link.to}>
                  <FooterNavLink to={link.to}>{link.label}</FooterNavLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-parish-gold mb-4">Stay Connected</h4>
            <p className="text-sm text-blue-100/80 leading-relaxed mb-4">
              Visit the parish office for sacramental inquiries, or register online to book services.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-parish-gold text-parish-blue text-sm font-semibold px-4 py-2.5 hover:bg-yellow-500 transition shadow-md hover:shadow-lg"
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
    </footer>
  );
}
