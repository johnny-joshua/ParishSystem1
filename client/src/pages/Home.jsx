import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/navbar/Navbar';
import Footer from '../components/footer/Footer';
import { CORE_FEATURE_CARDS, SERVICE_CARDS } from '../utils/constants';

export default function Home() {
  const featuresScrollRef = useRef(null);
  const servicesScrollRef = useRef(null);

  const scrollByDirection = (ref, direction) => {
    if (!ref.current) return;
    const amount = Math.round(ref.current.clientWidth * 0.86);
    ref.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  // React's onWheel is passive, so preventDefault() must use a native non-passive listener.
  useEffect(() => {
    const handleHorizontalWheel = (e) => {
      const el = e.currentTarget;
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollBy({ left: e.deltaY, behavior: 'smooth' });
    };

    const nodes = [featuresScrollRef.current, servicesScrollRef.current].filter(Boolean);
    nodes.forEach((node) => {
      node.addEventListener('wheel', handleHorizontalWheel, { passive: false });
    });

    return () => {
      nodes.forEach((node) => {
        node.removeEventListener('wheel', handleHorizontalWheel);
      });
    };
  }, []);

  return (
    <div className="home-page min-h-screen flex flex-col bg-parish-cream">
      <Navbar />
      <section id="home" className="hero-shell relative overflow-hidden text-white py-20 md:py-28">
        <div className="absolute inset-0 opacity-30" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(215,181,122,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),transparent_22%)]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="text-center lg:text-left">
              <div className="hero-panel inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] md:text-xs font-semibold uppercase tracking-[0.25em] text-[#d7b57a] mb-6">
                <span className="inline-block h-2 w-2 rounded-full bg-[#d7b57a]" />
                Putiao, Pilar, Sorsogon
              </div>
              <h1 className="brand-heading text-4xl md:text-5xl lg:text-[4.2rem] font-bold mb-5 max-w-4xl leading-[0.96] tracking-[-0.04em] text-[#f9f8f4] lg:mx-0 mx-auto">
                Holy Family Parish
              </h1>
              <p className="text-base md:text-lg text-[#dfe7f3] max-w-xl leading-relaxed lg:mx-0 mx-auto">
                Register, book parish services, schedule appointments, and manage centralized sacramental records online.
              </p>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start mt-8">
                <Link
                  to="/register"
                  className="btn-gold text-base md:text-lg px-8 py-3 shadow-[0_16px_32px_rgba(215,181,122,0.28)] hover:-translate-y-0.5 hover:shadow-[0_20px_38px_rgba(215,181,122,0.34)] transition-all"
                >
                  Get Started
                </Link>
                <Link
                  to="/login"
                  className="border border-white/70 bg-white/5 text-white hover:bg-white hover:text-[#0f1f2d] font-medium text-base md:text-lg px-8 py-3 rounded-lg transition-all shadow-[0_10px_24px_rgba(7,12,22,0.15)] backdrop-blur-sm"
                >
                  Login
                </Link>
              </div>
            </div>

            <div className="relative justify-self-center w-full max-w-xl">
              <div className="premium-card rounded-[2rem] border border-white/10 bg-white/5 p-7 md:p-8 shadow-[0_26px_70px_rgba(0,0,0,0.22)] backdrop-blur-sm">
                <div className="rounded-[1.5rem] border border-[#d7b57a]/30 bg-[#0f1f2d]/70 p-6 md:p-7">
                  <p className="font-display uppercase tracking-[0.25em] text-3xl text-[#d7b57a]">Mass Schedule</p>
                  <div className="mt-5 space-y-3 text-sm text-[#dfe7f3]">
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
                      <span>Saturday</span>
                      <span className="font-semibold text-[#d7b57a]">6:00 AM</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
                      <span>Sunday</span>
                      <span className="font-semibold text-[#d7b57a]">6:00 AM / 8:00 AM</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
                      <span>Tuesday</span>
                      <span className="font-semibold text-[#d7b57a]">Closed</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
                      <span>Weekdays</span>
                      <span className="font-semibold text-[#d7b57a]">6:00 AM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-16 md:py-20 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-parish-gold font-semibold text-xs uppercase tracking-[0.25em] mb-2">Parish History</p>
            <h2 className="font-display text-3xl text-parish-blue">A community rooted in faith</h2>
          </div>
        </div>

        <div className="relative mb-12">
          <div
            ref={featuresScrollRef}
            className="mobile-scroll-snap flex gap-4 sm:gap-5 hide-scrollbar snap-x snap-mandatory pb-2 px-0 md:px-0"
          >
            {CORE_FEATURE_CARDS.map((feature) => (
              <article
                key={feature.name}
                className="feature-card group w-[82vw] min-w-[82vw] sm:w-auto sm:min-w-[340px] lg:min-w-[370px] bg-white rounded-[1.6rem] border border-[#e5e7eb] shadow-[0_18px_40px_rgba(15,31,45,0.08)] hover:shadow-[0_26px_56px_rgba(15,31,45,0.12)] transition-all duration-500 snap-start overflow-hidden hover:-translate-y-1"
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={feature.image}
                    alt={feature.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                  <h3 className="absolute bottom-4 left-4 right-4 text-white text-xl font-semibold">
                    {feature.name}
                  </h3>
                </div>
                <div className="p-5">
                  <p className="text-sm text-gray-600 leading-relaxed min-h-[3.75rem]">{feature.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-parish-gold font-semibold text-xs uppercase tracking-[0.25em] mb-2">Parish Services</p>
            <h2 id="services" className="font-display text-2xl md:text-3xl text-parish-blue scroll-mt-24">
              Care for every sacramental need
            </h2>
          </div>
          <p className="text-sm md:text-base text-gray-600 max-w-xl md:text-right">
            Scroll left or right to explore each parish service card.
          </p>
        </div>
        <div className="relative">
          <div
            ref={servicesScrollRef}
            className="mobile-scroll-snap flex gap-4 sm:gap-5 hide-scrollbar snap-x snap-mandatory pb-2 px-0 md:px-0"
          >
            {SERVICE_CARDS.map((service) => (
              <article
                key={service.name}
                className="service-card group w-[82vw] min-w-[82vw] sm:w-auto sm:min-w-[340px] lg:min-w-[370px] bg-white rounded-[1.6rem] border border-[#e5e7eb] shadow-[0_18px_40px_rgba(15,31,45,0.08)] hover:shadow-[0_26px_56px_rgba(15,31,45,0.12)] transition-all duration-500 snap-start overflow-hidden hover:-translate-y-1"
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                  <h3 className="absolute bottom-4 left-4 right-4 text-white text-xl font-semibold">
                    {service.name}
                  </h3>
                </div>
                <div className="p-5">
                  <p className="text-sm text-gray-600 leading-relaxed min-h-[3.75rem]">{service.description}</p>
                  <Link
                    to="/login"
                    className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-parish-blue hover:text-parish-blue-light transition"
                  >
                    Reserve now
                    <span className="transform transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="mt-10 md:mt-12 text-right">
          <Link
            to="/reservations"
            className="btn-gold text-base px-8 py-3 inline-flex items-center gap-2 shadow-lg shadow-yellow-500/20 hover:-translate-y-0.5 transition-transform"
          >
            Reserve Now !!!
          </Link>
        </div>
      </section>
      <section id="about" className="scroll-mt-24 overflow-hidden">
        <div className="relative bg-parish-blue text-white">
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '28px 28px',
            }}
            aria-hidden
          />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              <div className="lg:col-span-7">
                <span className="inline-block text-parish-gold text-sm font-semibold tracking-[0.25em] uppercase mb-4">
                  Holy Family Parish
                </span>
                <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6">
                  About Us
                </h2>
                <p className="text-blue-100/90 text-lg leading-relaxed max-w-2xl">
                  Holy Family Parish is committed to serving parishioners through prayer, sacraments, and pastoral care.
                  This platform modernizes reservations, appointments, and records so the parish office can serve the
                  community with greater efficiency, clarity, and compassion.
                </p>
              </div>
              <div className="lg:col-span-5">
                <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 md:p-9">
                  <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-parish-gold to-transparent" />
                  <blockquote className="font-display text-xl md:text-2xl leading-snug text-white/95 italic mb-6">
                    &ldquo;A community of faith, hope, and love—welcoming all who seek Christ.&rdquo;
                  </blockquote>
                  <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
                    <div>
                      <p className="text-parish-gold text-2xl font-bold font-display">7</p>
                      <p className="text-xs text-blue-200/80 mt-1 uppercase tracking-wide">Days of Worship</p>
                    </div>
                    <div>
                      <p className="text-parish-gold text-2xl font-bold font-display">2</p>
                      <p className="text-xs text-blue-200/80 mt-1 uppercase tracking-wide">Sunday Masses</p>
                    </div>
                    <div>
                      <p className="text-parish-gold text-2xl font-bold font-display">1</p>
                      <p className="text-xs text-blue-200/80 mt-1 uppercase tracking-wide">Parish Family</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-parish-gold/50 to-transparent" />
        </div>

        <div className="bg-white py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 md:mb-12">
              <div>
                <p className="text-parish-gold font-semibold text-xs uppercase tracking-[0.2em] mb-2">
                  Weekly Liturgy
                </p>
                <h3 className="font-display text-2xl md:text-3xl text-parish-blue">Parish Mass Schedule</h3>
              </div>
              <p className="text-sm text-gray-500 max-w-md md:text-right">
                Join us for the Holy Eucharist. All are welcome.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 md:gap-4">
              {[
                { day: 'Mon', full: 'Monday', time: '6:00 AM', closed: false },
                { day: 'Tue', full: 'Tuesday', time: 'Closed', closed: true },
                { day: 'Wed', full: 'Wednesday', time: '6:00 AM', closed: false },
                { day: 'Thu', full: 'Thursday', time: '6:00 AM', closed: false },
                { day: 'Fri', full: 'Friday', time: '6:00 AM', closed: false },
                { day: 'Sat', full: 'Saturday', time: '6:00 AM', closed: false },
                {
                  day: 'Sun',
                  full: 'Sunday',
                  time: null,
                  closed: false,
                  featured: true,
                  times: ['6:00 AM', '8:00 AM'],
                },
              ].map((item) => (
                <div
                  key={item.full}
                  className={`group relative rounded-2xl p-4 md:p-5 transition-all duration-300 ${
                    item.featured
                      ? 'col-span-2 sm:col-span-1 bg-gradient-to-br from-parish-gold to-yellow-500 text-parish-blue shadow-lg shadow-parish-gold/30 ring-2 ring-parish-gold/50 lg:scale-[1.02]'
                      : item.closed
                        ? 'bg-gray-100 border border-gray-200'
                        : 'bg-parish-cream border border-parish-gold/20 hover:border-parish-blue/30 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <p
                    className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                      item.featured ? 'text-parish-blue/70' : item.closed ? 'text-gray-400' : 'text-parish-gold'
                    }`}
                  >
                    {item.day}
                  </p>
                  <p
                    className={`font-semibold text-sm mb-2 ${
                      item.closed ? 'text-gray-500' : item.featured ? 'text-parish-blue' : 'text-parish-blue'
                    }`}
                  >
                    {item.full}
                  </p>
                  {item.times ? (
                    <div className="space-y-1.5">
                      {item.times.map((t) => (
                        <p
                          key={t}
                          className="text-xs font-bold bg-parish-blue/10 rounded-md px-2 py-1.5 text-center"
                        >
                          {t}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p
                      className={`text-sm font-bold ${
                        item.closed ? 'text-gray-400 line-through decoration-2' : 'text-parish-blue'
                      }`}
                    >
                      {item.time}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-parish-cream py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5">
              <div className="relative h-[320px] sm:h-[400px] md:h-[480px]">
                <iframe
                  title="Holy Family Parish Location Map"
                  src="https://www.google.com/maps?q=Holy%20Family%20Parish%20Putiao%20Pilar%20Sorsogon&output=embed"
                  className="absolute inset-0 w-full h-full border-0 grayscale-[20%] contrast-[1.05]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
                <div className="absolute inset-0 bg-gradient-to-t from-parish-blue/80 via-parish-blue/20 to-transparent pointer-events-none" />
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
                <div className="max-w-4xl mx-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6 rounded-2xl bg-white/95 backdrop-blur-md border border-white/50 shadow-xl p-6 md:p-8">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="shrink-0 w-12 h-12 rounded-xl bg-parish-blue flex items-center justify-center text-parish-gold text-xl shadow-lg">
                        📍
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-parish-gold uppercase tracking-wider mb-1">
                          Visit Us
                        </p>
                        <h3 className="font-display text-xl md:text-2xl text-parish-blue mb-1">
                          Holy Family Parish
                        </h3>
                        <p className="text-sm text-gray-600">Putiao, Pilar, Sorsogon, Philippines</p>
                        <p className="text-xs text-gray-500 mt-2">Office: Wed - Mon, 8:00 AM – 5:00 PM</p>
                      </div>
                    </div>
                    <a
                      href="https://www.google.com/maps?q=Holy%20Family%20Parish%20Putiao%20Pilar%20Sorsogon"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-parish-blue text-white font-semibold text-sm px-6 py-3.5 hover:bg-parish-blue-light transition shadow-lg hover:shadow-xl"
                    >
                      Open in Maps
                      <span aria-hidden className="text-parish-gold">→</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="contact" className="relative scroll-mt-24 overflow-hidden bg-white py-16 md:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgb(26 39 68 / 0.06) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
          aria-hidden
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 md:mb-14">
            <div>
              <p className="text-parish-gold font-semibold text-xs uppercase tracking-[0.2em] mb-2">
                Get in Touch
              </p>
              <h2 className="font-display text-3xl md:text-4xl text-parish-blue">Contact the Parish</h2>
            </div>
            <p className="text-sm text-gray-500 max-w-md md:text-right leading-relaxed">
              Visit the parish office or use our online portal for reservations, appointments, and sacramental
              records.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-7 space-y-4">
              {[
                {
                  title: 'Parish Office',
                  lines: ['Holy Family Parish', 'Putiao, Pilar, Sorsogon, Philippines'],
                  href: 'https://www.google.com/maps?q=Holy%20Family%20Parish%20Putiao%20Pilar%20Sorsogon',
                  linkLabel: 'Get directions',
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                    />
                  ),
                },
                {
                  title: 'Office Hours',
                  lines: ['Wednesday – Monday', '8:00 AM – 5:00 PM'],
                  note: 'Closed on Tuesdays. Hours may vary on holy days and parish events.',
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  ),
                },
                {
                  title: 'Online Services',
                  lines: ['Baptism, wedding, funeral, and mass reservations'],
                  note: 'Sign in to manage bookings and track your requests.',
                  icon: (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 003 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
                    />
                  ),
                },
              ].map((item) => (
                <article
                  key={item.title}
                  className="group flex gap-4 sm:gap-5 rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-sm hover:border-parish-blue/25 hover:shadow-lg transition-all duration-300"
                >
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-parish-blue/5 text-parish-blue flex items-center justify-center group-hover:bg-parish-blue group-hover:text-parish-gold transition-colors duration-300">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
                      {item.icon}
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-parish-blue mb-1.5">{item.title}</h3>
                    {item.lines.map((line) => (
                      <p key={line} className="text-sm text-gray-600 leading-relaxed">
                        {line}
                      </p>
                    ))}
                    {item.note && <p className="text-xs text-gray-400 mt-2 leading-relaxed">{item.note}</p>}
                    {item.href && (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-parish-blue hover:text-parish-blue-light transition"
                      >
                        {item.linkLabel}
                        <span className="transform transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>
                          →
                        </span>
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <aside className="lg:col-span-5">
              <div className="relative h-full rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5">
                <div className="absolute inset-0 bg-gradient-to-br from-parish-blue via-parish-blue-light to-parish-blue" />
                <div
                  className="absolute inset-0 opacity-[0.08]"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                    backgroundSize: '24px 24px',
                  }}
                  aria-hidden
                />
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-parish-gold to-transparent" />
                <div className="relative flex flex-col h-full p-7 sm:p-8 md:p-9 text-white">
                  <span className="inline-flex w-fit items-center rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-parish-gold mb-5">
                    Parish Portal
                  </span>
                  <h3 className="font-display text-2xl md:text-3xl font-bold leading-tight mb-3">
                    Need assistance?
                  </h3>
                  <p className="text-blue-100/90 text-sm leading-relaxed mb-8 flex-1">
                    Create a free account to request parish services, schedule appointments, and access your
                    sacramental records—all in one place.
                  </p>
                  <div className="space-y-3">
                    <Link
                      to="/register"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-parish-gold text-parish-blue font-semibold text-sm px-6 py-3.5 hover:bg-yellow-500 transition shadow-lg hover:shadow-xl"
                    >
                      Create an account
                      <span aria-hidden>→</span>
                    </Link>
                    <Link
                      to="/login"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-white/40 text-white font-semibold text-sm px-6 py-3.5 hover:bg-white/10 hover:border-white/60 transition"
                    >
                      Sign in to your account
                    </Link>
                  </div>
                  <p className="text-xs text-blue-200/60 mt-6 text-center">
                    Already registered? Sign in to manage your bookings.
                  </p>
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-10 md:mt-12 pt-8 border-t border-gray-200/80">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: 'Walk-in welcome', detail: 'No appointment needed for general inquiries' },
                { label: 'Secure records', detail: 'Digital sacramental records for parishioners' },
                { label: '24/7 booking', detail: 'Submit service requests anytime online' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl bg-parish-cream/80 border border-parish-gold/15 px-4 py-4 text-center sm:text-left"
                >
                  <p className="text-sm font-semibold text-parish-blue">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
