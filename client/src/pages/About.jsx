import { Link } from 'react-router-dom';
import Footer from '../components/footer/Footer';
import Navbar from '../components/navbar/Navbar';
import { PARISH_LOCATION } from '../utils/constants';

const schedule = [['Monday', '6:00 AM'], ['Tuesday', 'Closed'], ['Wednesday', '6:00 AM'], ['Thursday', '6:00 AM'], ['Friday', '6:00 AM'], ['Saturday', '6:00 AM'], ['Sunday', '6:00 AM / 8:00 AM']];
const infoCards = [
  ['Parish History', 'Learn about our journey and heritage.', '⌂'],
  ['Location', 'Find us in Putiao, Pilar, Sorsogon.', '⌖'],
  ['Our Leadership', 'Meet our parish priest and pastoral leaders.', '✦'],
];

export default function About() {
  return (
    <div className="min-h-screen bg-[#faf8f1] text-[#4e555a]">
      <Navbar />
      <main>
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
          <div className="mt-5 flex justify-center">
            <article className="min-h-[170px] w-full max-w-2xl rounded-xl border border-[#e6ddcf] bg-white p-5 text-center shadow-sm sm:p-6">
              <h2 className="mt-1 font-display text-xl text-[#273746]">ABOUT US</h2>
              <p className="mt-3 text-[10px] font-semibold uppercase leading-6 tracking-[0.16em] text-[#6e7274]">Holy Family Parish is a Catholic community dedicated to serving God and His people through faith, worship, service, and unity. We strive to create a welcoming spiritual home where individuals and families can grow closer to God.</p>
            </article>
          </div>
          <div className="mt-5 grid items-stretch gap-4 sm:grid-cols-2">
            <article className="min-h-[190px] rounded-xl border border-[#e6ddcf] bg-white p-5 text-center shadow-sm sm:p-6">
              <h2 className="mt-1 font-display text-xl text-[#273746]">MISSION</h2>
              <p className="mt-3 text-[10px] font-semibold uppercase leading-6 tracking-[0.16em] text-[#6e7274]">Our mission is to spread the Gospel of Jesus Christ, strengthen the faith of our community, and serve others with compassion, love, and dedication.</p>
            </article>
            <article className="min-h-[190px] rounded-xl border border-[#e6ddcf] bg-white p-5 text-center shadow-sm sm:p-6">
              <h2 className="mt-1 font-display text-xl text-[#273746]">VISION</h2>
              <p className="mt-3 text-[10px] font-semibold uppercase leading-6 tracking-[0.16em] text-[#6e7274]">We envision a united Catholic community where every person grows in faith, actively participates in parish life, and serves others with love and compassion.</p>
            </article>
          </div>
          <div className="mt-8 rounded-xl border border-[#e6ddcf] bg-white p-5 shadow-sm sm:p-7"><p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b18a45]">Weekly liturgy</p><h2 className="mt-1 font-display text-2xl text-[#273746]">Parish Mass Schedule</h2><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">{schedule.map(([day, time]) => <div key={day} className={`rounded-lg border p-3 ${day === 'Sunday' ? 'border-[#b18a45] bg-[#d7b57a] text-[#273746]' : time === 'Closed' ? 'border-gray-200 bg-gray-100 text-gray-400' : 'border-[#e6ddcf] bg-[#faf8f1] text-[#273746]'}`}><p className="text-[9px] font-bold uppercase tracking-wider">{day}</p><p className="mt-2 text-xs font-bold">{time}</p></div>)}</div></div>

          <div className="mt-5 grid items-stretch gap-4 sm:grid-cols-2"><article className="min-h-[150px] rounded-xl border border-[#e6ddcf] bg-white p-5 shadow-sm sm:p-7"><p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b18a45]">Parish location</p><h2 className="mt-1 font-display text-xl text-[#273746]">{PARISH_LOCATION.name}</h2><p className="mt-2 text-xs text-[#6e7274]">{PARISH_LOCATION.address}</p><a href="https://www.google.com/maps?q=Holy%20Family%20Parish%20Putiao%20Pilar%20Sorsogon" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-xs font-semibold text-[#a6813f]">Open in Google Maps →</a></article><article className="min-h-[150px] rounded-xl border border-[#e6ddcf] bg-white p-5 shadow-sm sm:p-7"><p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#b18a45]">Office hours</p><p className="mt-2 text-xs leading-relaxed text-[#6e7274]">Wednesday – Monday<br />8:00 AM – 5:00 PM<br /><span className="text-[#9a9c9d]">Closed Tuesdays</span></p></article></div>
        <div className="mt-4 grid items-stretch gap-3 sm:grid-cols-3">
          {infoCards.map(([title, detail, icon]) => <article key={title} className="flex min-h-[150px] h-full flex-col rounded-xl border border-[#e6ddcf] bg-white px-4 py-4 shadow-sm"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d7b57a] text-xs text-[#b18a45]">{icon}</span><h2 className="mt-3 font-display text-base text-[#273746]">{title}</h2><p className="mt-1 text-[11px] leading-relaxed text-[#7a7d7f]">{detail}</p></article>)}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
