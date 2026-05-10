import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { selectUser, selectRole } from '../../store/slices/authSlice';
import { selectUnreadCount } from '../../store/slices/notificationSlice';
import { Bell, Search, Menu, ChevronRight } from 'lucide-react';

const BREADCRUMBS = {
  '/dashboard':          ['Dashboard'],
  '/epcr':               ['Records', 'EPCR Registry'],
  '/epcr/new':           ['Records', 'EPCR Registry', 'New Record'],
  '/qa/forms':           ['QA', 'Forms'],
  '/qa/reviews':         ['QA', 'Reviews'],
  '/qa/rules':           ['QA', 'Rules'],
  '/form-templates':     ['Configuration', 'Form Templates'],
  '/workflows':          ['Operations', 'Workflows'],
  '/deployments':        ['Operations', 'Deployments'],
  '/organizations':      ['Admin', 'Organizations'],
  '/users':              ['Admin', 'Users'],
  '/reports':            ['Analytics', 'Reports'],
  '/feedback':           ['Communications', 'Feedback'],
  '/notifications':      ['Alerts', 'Notifications'],
  '/audit-logs':         ['Admin', 'Audit Logs'],
  '/settings':           ['Admin', 'Settings'],
  '/hipaa/consent':      ['Compliance', 'HIPAA Consent'],
  '/hipaa/disclosure':   ['Compliance', 'HIPAA Disclosure'],
  '/hipaa/baa':          ['Compliance', 'Business Associates'],
  '/hipaa/deid':         ['Compliance', 'De-Identification'],
  '/patient-portal':     ['Patient', 'Portal'],
  '/break-glass':        ['Security', 'Break-Glass'],
};

const Header = ({ setIsMobileMenuOpen }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useSelector(selectUser);
  const role      = useSelector(selectRole);
  const unread    = useSelector(selectUnreadCount);

  const crumbs = BREADCRUMBS[location.pathname] || ['Platform'];
  const pageTitle = crumbs[crumbs.length - 1];

  return (
    <header className="h-16 bg-white border-b border-[#DDE3F0] flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden p-2 rounded-lg text-brand-blue hover:bg-[#F0F4FC] transition-colors">
          <Menu size={20} />
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={14} className="text-[#C8D5F0]" />}
              <span className={`text-sm font-semibold ${
                i === crumbs.length - 1 ? 'text-brand-blue' : 'text-[#A0AECB]'
              }`}>{c}</span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden lg:flex items-center gap-2.5 bg-[#F8FAFF] border border-[#DDE3F0] rounded-xl px-3.5 py-2 hover:border-brand-blue transition-colors">
          <Search size={15} className="text-[#A0AECB]" />
          <input type="text" placeholder="Search…"
            className="bg-transparent text-sm font-medium text-[#0F1A3A] placeholder-[#A0AECB] focus:outline-none w-40" />
        </div>

        {/* Notifications bell */}
        <button onClick={() => navigate('/notifications')}
          className="relative p-2.5 rounded-xl text-[#4B5A7A] hover:text-brand-blue hover:bg-[#F0F4FC] transition-all">
          <Bell size={19} />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-brand-red text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-3 pl-3 border-l border-[#DDE3F0]">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold text-[#0F1A3A] leading-none">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email?.split('@')[0]}
            </p>
            <p className="text-[11px] text-[#A0AECB] font-semibold mt-0.5">{role}</p>
          </div>
          <div className="w-9 h-9 bg-brand-blue rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm">
            {(user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
