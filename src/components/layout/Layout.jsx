import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ToastContainer from '../common/ToastContainer';

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F4FC]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header setIsMobileMenuOpen={setIsMobileMenuOpen} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};

export default Layout;
