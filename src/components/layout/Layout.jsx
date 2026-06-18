import { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ToastContainer from '../common/ToastContainer';
import VoiceCommandButton from '../common/VoiceCommandButton';
import { RefreshCw } from 'lucide-react';

const PageLoader = () => (
  <div className="min-h-[400px] w-full flex flex-col items-center justify-center gap-3 text-[#A0AECB]">
    <RefreshCw className="animate-spin text-brand-blue w-6 h-6" />
    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Loading view...</span>
  </div>
);

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F4FC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header setIsMobileMenuOpen={setIsMobileMenuOpen} />

        <main className="flex-1 overflow-y-auto">
          <div className="w-full h-full">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      <VoiceCommandButton />
      <ToastContainer />
    </div>
  );
};

export default Layout;
