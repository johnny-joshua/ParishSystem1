import { Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';

export default function MakeRequest() {
  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 overflow-hidden rounded-[28px] border border-[#e8dfd0] bg-[#0f2337] px-5 py-5 shadow-[0_26px_60px_rgba(15,31,45,0.18)] sm:px-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#d7b57a]">Parish services</p>
          <h1 className="mt-2 text-3xl font-display text-white">Make a Request</h1>
          <p className="mt-2 text-sm text-slate-300">Choose the service you want to request from the parish.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            to="/reservations?new=1"
            className="group rounded-[26px] border border-[#e8dfd0] bg-white p-6 shadow-[0_16px_30px_rgba(15,31,45,0.04)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_40px_rgba(15,31,45,0.08)]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f8f0df] text-2xl">📋</div>
            <h2 className="mt-5 text-2xl font-display text-[#0f2337]">Reservation</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Request a parish service such as marriage, baptism, or other special reservation requests.
            </p>
            <div className="mt-5 inline-flex items-center rounded-xl bg-[#0f2337] px-4 py-2.5 text-sm font-semibold text-white transition group-hover:bg-[#18324c]">
              New Reservation
            </div>
          </Link>

          <Link
            to="/appointments?new=1"
            className="group rounded-[26px] border border-[#e8dfd0] bg-white p-6 shadow-[0_16px_30px_rgba(15,31,45,0.04)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_40px_rgba(15,31,45,0.08)]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f8f0df] text-2xl">📅</div>
            <h2 className="mt-5 text-2xl font-display text-[#0f2337]">Appointment</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Schedule a meeting or appointment with the parish office for your concerns and requests.
            </p>
            <div className="mt-5 inline-flex items-center rounded-xl bg-[#0f2337] px-4 py-2.5 text-sm font-semibold text-white transition group-hover:bg-[#18324c]">
              New Appointment
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
