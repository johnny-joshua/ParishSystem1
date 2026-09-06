import Navbar from '../components/navbar/Navbar';
import Footer from '../components/footer/Footer';

export default function PublicPageLayout({ eyebrow, title, intro, children }) {
	return (
		<div className="public-page min-h-screen bg-[#faf8f1] text-[#4e555a]">
			<Navbar />
			<main>
				<header className="public-page-header relative overflow-hidden border-b border-[#e9dfd0] px-4 py-12 sm:px-6 md:py-16 lg:px-8">
					<div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]">
						<div>
							<p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#b18a45]">{eyebrow}</p>
							<h1 className="font-display text-4xl leading-tight text-[#273746] sm:text-5xl">{title}</h1>
							<p className="mt-4 max-w-xl text-sm leading-relaxed text-[#6e7274] sm:text-base">{intro}</p>
						</div>
						<div className="relative hidden h-44 overflow-hidden rounded-[1.75rem] border-8 border-white shadow-[0_18px_40px_rgba(92,70,32,0.12)] sm:block">
							<img
								src="/parish.jpg"
								alt="Holy Family Parish church"
								className="h-full w-full object-cover"
							/>
							<div className="absolute inset-x-5 bottom-4 rounded-lg bg-white/90 px-3 py-2 text-center shadow-sm">
								<p className="font-display text-sm italic text-[#58616a]">Faith · Service · Community</p>
							</div>
						</div>
					</div>
				</header>
				{children}
			</main>
			<Footer />
		</div>
	);
}
