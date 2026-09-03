import { useEffect, useState } from 'react';
import Navbar from '../navbar/Navbar';
import Sidebar from '../sidebar/Sidebar';
import Footer from '../footer/Footer';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('mobile-drawer-open', sidebarOpen);
    return () => document.body.classList.remove('mobile-drawer-open');
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col page-shell 2xl:h-screen 2xl:overflow-hidden">
      <Navbar dashboard isSidebarOpen={sidebarOpen} onSidebarToggle={() => setSidebarOpen((value) => !value)} />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/20 2xl:hidden"
        />
      )}
      <div className="relative flex flex-1 min-h-0 min-w-0 2xl:pl-64 2xl:overflow-hidden">
        <Sidebar isMobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-1 flex-col min-h-0 min-w-0">
          <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
