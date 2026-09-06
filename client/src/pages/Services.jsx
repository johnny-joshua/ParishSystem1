import { Link } from 'react-router-dom';
import { useState } from 'react';
import Footer from '../components/footer/Footer';
import Navbar from '../components/navbar/Navbar';
import { CORE_FEATURE_CARDS, SERVICE_CARDS } from '../utils/constants';

const APPOINTMENT_CARD = {
  name: 'Appointments',
  description: 'Meet with the parish staff for your concerns.',
  image: CORE_FEATURE_CARDS[2].image,
};

export default function Services() {
  const services = [...SERVICE_CARDS, APPOINTMENT_CARD];
  const [flippedServices, setFlippedServices] = useState({});

  const toggleService = (serviceName) => {
    setFlippedServices((current) => ({ ...current, [serviceName]: !current[serviceName] }));
  };

  return (
    <div className="min-h-screen bg-[#faf8f1] text-[#4e555a]">
      <Navbar />
      <main>
        <h1 className="mt-5 ml-8 text-xl font-bold uppercase tracking-[0.1em] font-mono text-[#b18a45]">Services we offer here!</h1>
        <section className="mx-auto max-w-7xl px-4 pb-9 pt-2 sm:px-6 md:pb-14 md:pt-4 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.name}
                role="button"
                tabIndex="0"
                aria-label={`${flippedServices[service.name] ? 'Show image for' : 'Show description for'} ${service.name}`}
                aria-pressed={Boolean(flippedServices[service.name])}
                onClick={() => toggleService(service.name)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleService(service.name);
                  }
                }}
                className="group cursor-pointer overflow-hidden rounded-xl border border-[#e5dccf] bg-[#fcfbf8] text-left shadow-[0_8px_22px_rgba(83,65,34,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(83,65,34,0.12)] focus:outline-none focus:ring-2 focus:ring-[#b18a45]/50"
              >
                <div className="group/flip relative block h-56 w-full overflow-hidden bg-[#efe4d1] text-left [perspective:1000px] sm:h-60"
                >
                  <span className={`relative block h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${flippedServices[service.name] ? '[transform:rotateY(180deg)]' : ''}`}>
                    <span className="absolute inset-0 block bg-[#fcfbf8] [backface-visibility:hidden]"><img src={service.image} alt={service.name} className="h-40 w-full object-cover transition duration-500 group-hover/flip:scale-105 sm:h-44" loading="lazy" /><span className="block px-5 pb-4 pt-3 font-display text-lg leading-tight text-[#273746]">{service.name}</span></span>
                    <span className="absolute inset-0 flex [transform:rotateY(180deg)] [backface-visibility:hidden] flex-col justify-center bg-[#f5ede0] px-5 text-left"><span className="font-display text-lg leading-tight text-[#273746]">{service.name}</span><span className="mt-3 text-xs leading-relaxed text-[#7a7d7f]">{service.description}</span></span>
                  </span>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8 flex justify-end">
            <Link to="/login" className="btn-gold inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm">
              Make Reservation <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
