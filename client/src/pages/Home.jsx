import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Footer from '../components/footer/Footer';
import Navbar from '../components/navbar/Navbar';
import { CORE_FEATURE_CARDS, PARISH_LOCATION, SERVICE_CARDS } from '../utils/constants';

const QUICK_ACTIONS = [
  { label: 'Reservations', detail: 'Book parish services online.', to: '/reservations', icon: 'calendar' },
  { label: 'Appointments', detail: 'Schedule with the parish office.', to: '/appointments', icon: 'appointment' },
  { label: 'Digital Records', detail: 'Access your sacramental records.', to: '/profile', icon: 'records' },
  { label: 'Notifications', detail: 'Get important parish updates.', to: '/notifications', icon: 'bell' },
];

function getPhilippineTime() {
  const parts = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { time: `${values.hour}:${values.minute}`, meridiem: values.dayPeriod?.toUpperCase() || '' };
}

function QuickActionIcon({ type }) {
  const paths = {
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 9h16M8 13h.01M12 13h.01M16 13h.01M8 16h.01M12 16h.01" /></>,
    appointment: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 9h16M8 14l2 2 5-5" /></>,
    records: <><path d="M7 3h8l3 3v15H7z" /><path d="M15 3v4h4M10 12h5M10 16h5" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  };

  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showRegisteredNotice, setShowRegisteredNotice] = useState(Boolean(location.state?.registered));
  const [philippineTime, setPhilippineTime] = useState(getPhilippineTime);

  useEffect(() => {
    if (location.state?.registered) navigate('/', { replace: true, state: {} });
  }, [location.state, navigate]);

  useEffect(() => {
    const clock = window.setInterval(() => setPhilippineTime(getPhilippineTime()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  return (
    <div className="home-page mx-auto min-h-screen max-w-[1500px] overflow-hidden bg-[#faf8f1] text-[#4e555a] shadow-[0_0_40px_rgba(83,65,34,0.08)]">
      <Navbar />
      {showRegisteredNotice && <div className="relative z-10 border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-center"><p className="text-sm font-semibold text-emerald-800">Registration Successful</p><p className="text-sm text-emerald-700">Your account has been created successfully. Please log in to continue.</p><button type="button" aria-label="Dismiss" className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600" onClick={() => setShowRegisteredNotice(false)}>✕</button></div>}
      <main>
        <section className="hero-shell relative min-h-[390px] overflow-hidden border-b border-[#eadfce] sm:min-h-[440px]">
          <img src="/parish.jpg" alt="Holy Family Parish church" className="absolute inset-0 z-0 h-full w-full object-cover object-[70%_center] saturate-[1.1] sepia-[0.2] opacity-68" />
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#faf8f1]/95 via-[#faf8f1]/75 via-45% to-[#faf8f1]/10" aria-hidden="true" />
          <div className="relative z-20 mx-auto flex min-h-[390px] max-w-7xl items-center px-4 py-12 sm:min-h-[440px] sm:px-6 lg:px-8">
            <div className="relative z-20 max-w-xl text-center lg:text-left"><p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#b18a45]">Welcome to </p><h1 className="brand-heading mx-auto mb-5 max-w-xl text-5xl leading-[0.98] text-[#273746] sm:text-6xl lg:mx-0 lg:text-7xl">Holy Family<span className="mt-5 text-[#b18a45]">Parish</span></h1><p className="mx-auto max-w-lg text-base font-medium leading-relaxed text-[#4e555a] lg:mx-0">A family united in faith, serving with love.</p><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#7a7d7f] lg:mx-0">We are a parish family rooted in faith, growing in faith, and committed to serving one another in Christ's love.</p><div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start"><Link to="/services" className="btn-gold px-6 py-3">Reserve a Service <span aria-hidden>→</span></Link><Link to="/about" className="rounded-lg border border-[#d5c7b0] bg-white/90 px-6 py-3 font-semibold text-[#58616a] transition hover:border-[#b18a45] hover:text-[#a6813f]">Learn More</Link></div></div>
            <div className="absolute right-0 top-0 z-20 flex h-24 w-36 items-center gap-3 rounded-bl-2xl border-b border-l border-white/80 bg-[#fffdf8]/90 px-4 text-left shadow-[0_10px_24px_rgba(83,65,34,0.14)] backdrop-blur-sm sm:h-28 sm:w-40 sm:px-5">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d7b57a] bg-[#faf5e9] text-[#b18a45]" aria-hidden="true">
                <span className="absolute left-1/2 top-2 h-3 w-px origin-bottom -translate-x-1/2 rotate-[25deg] bg-[#273746]" />
                <span className="absolute left-1/2 top-2 h-4 w-px origin-bottom -translate-x-1/2 -rotate-[55deg] bg-[#b18a45]" />
                <span className="h-1 w-1 rounded-full bg-[#273746]" />
              </span>
              <span className="min-w-0"><span className="flex items-baseline gap-1 font-display text-xl leading-none tracking-tight text-[#273746]"><span>{philippineTime.time}</span><span className="text-[9px] font-semibold tracking-[0.16em] text-[#58616a]">{philippineTime.meridiem}</span></span><span className="mt-2 block text-[7px] uppercase leading-tight tracking-[0.12em] text-[#8a806f]">Philippine Standard Time</span></span>
            </div>
          </div>
        </section>
        <section className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 sm:px-6"><div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#e4dacb] bg-white/95 shadow-[0_14px_30px_rgba(83,65,34,0.12)] backdrop-blur-sm sm:grid-cols-4">{QUICK_ACTIONS.map((action, index) => <Link key={action.label} to={action.to} className={`group p-4 text-center transition hover:bg-[#fbf5e9] sm:p-5 ${index < 3 ? 'border-r border-[#eee6d9]' : ''} ${index < 2 ? 'border-b border-[#eee6d9] sm:border-b-0' : ''}`}><span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#d7b57a] text-[#b18a45]"><QuickActionIcon type={action.icon} /></span><span className="mt-2 block text-xs font-semibold text-[#273746]">{action.label}</span><span className="mt-1 block text-[10px] leading-relaxed text-[#8a8d8e]">{action.detail}</span></Link>)}</div></section>
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8"><div className="relative min-h-[190px] overflow-hidden rounded-xl border border-[#eadfce] bg-[#efe4d1] shadow-[0_10px_28px_rgba(83,65,34,0.08)]"><img src="/faith.png" alt="Faith, service, and community" className="absolute inset-0 h-full w-full object-cover object-center saturate-[0.92] sepia-[0.08]" /><div className="absolute inset-0 bg-gradient-to-r from-[#fffaf0]/95 via-[#fffaf0]/78 via-48% to-[#fffaf0]/15" aria-hidden="true" /><div className="relative z-10 flex min-h-[190px] max-w-[52%] flex-col justify-center px-6 py-7 sm:px-8 sm:py-8"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#b18a45]">Our mission</p><h2 className="font-display text-2xl leading-tight text-[#273746] sm:text-3xl">Faith · Service · Community</h2><p className="mt-3 max-w-md text-xs leading-relaxed text-[#7a7d7f]">Holy Family Parish is a Catholic community committed to serving God and helping people grow through prayer, sacraments, and pastoral care.</p><Link to="/about" className="btn-gold mt-4 inline-flex w-fit px-4 py-2 text-xs">Learn More <span aria-hidden>→</span></Link></div></div></section>
      </main>
      <Footer />
    </div>
  );
}
