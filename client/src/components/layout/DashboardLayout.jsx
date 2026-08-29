import Navbar from '../navbar/Navbar';
import Sidebar from '../sidebar/Sidebar';
import Footer from '../footer/Footer';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col page-shell lg:h-screen lg:overflow-hidden">
      <Navbar />
      <div className="flex flex-1 min-h-0 lg:overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col min-h-0 min-w-0 lg:ml-64">
          <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
