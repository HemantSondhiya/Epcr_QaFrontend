import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ToastContainer from '../common/ToastContainer';

const Layout = () => (
  <div className="flex h-screen overflow-hidden bg-[var(--bg-main)]">
    <Sidebar />
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-teal-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-sky-500/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      <Header />
      <main className="flex-1 overflow-y-auto p-6 scroll-smooth z-0">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>

    {/* Global toast portal */}
    <ToastContainer />
  </div>
);

export default Layout;
