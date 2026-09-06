import { Link } from 'react-router-dom';
import Footer from '../components/footer/Footer';
import Navbar from '../components/navbar/Navbar';
import { PARISH_LOCATION } from '../utils/constants';

const MAPS_URL = 'https://www.google.com/maps?q=Holy%20Family%20Parish%20Putiao%20Pilar%20Sorsogon';

export default function Contact() {
  return (
    <div className="min-h-screen bg-[#faf8f1] text-[#4e555a]">
      <Navbar />
      <main>

        <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 md:py-10 lg:px-8">
          <div className="grid items-stretch gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <article className="flex min-h-[390px] flex-col justify-center rounded-xl border border-[#e6ddcf] bg-white px-5 py-4 shadow-sm sm:px-6">
                <div className="divide-y divide-[#eee5d6]"><div className="flex gap-3 pb-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d7b57a] text-xs text-[#b18a45]">@</span><div><h2 className="font-display text-base text-[#273746]">Parish Contact</h2><p className="mt-1 text-[11px] leading-relaxed text-[#6e7274]"><a href="https://www.facebook.com/holyfamilyparishputiao" target="_blank" rel="noopener noreferrer" className="hover:text-[#a6813f]">FB Pages: Holy Family Parish</a><br /><span>Email: holyfamilyparish26@gmail.com</span><br /><a href="tel:09673941188" className="hover:text-[#a6813f]">Contact No. : 09673941188</a></p></div></div><div className="flex gap-3 py-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d7b57a] text-xs text-[#b18a45]">⌖</span>
                <div><h2 className="font-display text-base text-[#273746]">Parish Office</h2><p className="mt-1 text-[11px] leading-relaxed text-[#6e7274]">{PARISH_LOCATION.name}<br />{PARISH_LOCATION.address}</p><a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex text-[10px] font-semibold text-[#a6813f]">Get directions →</a></div></div>
                <div className="flex gap-3 py-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d7b57a] text-xs text-[#b18a45]">◷</span>
                <div><h2 className="font-display text-base text-[#273746]">Office Hours</h2><p className="mt-1 text-[11px] leading-relaxed text-[#6e7274]">Wednesday – Monday<br />8:00 AM – 5:00 PM<br /><span className="text-[#9a9c9d]">Closed on Tuesdays</span></p></div></div>
                <div className="flex gap-3 pt-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d7b57a] text-xs text-[#b18a45]">▣</span><div><h2 className="font-display text-base text-[#273746]">Online Services</h2><p className="mt-1 text-[11px] leading-relaxed text-[#6e7274]">Baptism, wedding, funeral, and Mass reservations.</p><Link to="/login" className="mt-1 inline-flex text-[10px] font-semibold text-[#a6813f]">Book or manage online →</Link></div></div></div></article>
            <div className="flex min-h-[390px] flex-col overflow-hidden rounded-xl border border-[#e6ddcf] bg-white shadow-sm"><div className="min-h-56 flex-1 bg-[#e9dfcd] sm:min-h-64"><iframe title="Holy Family Parish Location Map" src={`${MAPS_URL}&output=embed`} className="h-full min-h-56 w-full border-0 grayscale-[10%] sm:min-h-64" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div><div className="flex items-center gap-4 border-t border-[#eee5d6] bg-[#fcfbf8] px-5 py-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#b18a45] text-lg text-white">⌖</span><div className="min-w-0 flex-1"><h2 className="font-display text-base text-[#273746]">We are here to help you.</h2><p className="text-[11px] text-[#7a7d7f]">Feel free to reach out!</p></div><Link to="/register" className="btn-gold shrink-0 px-4 py-2 text-[10px]">Send a Message <span aria-hidden>→</span></Link></div></div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
