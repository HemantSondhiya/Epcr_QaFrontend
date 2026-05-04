import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { logoutUser, selectUser, selectRole } from '../../store/slices/authSlice';
import { fetchUnreadNotifications, selectUnreadCount } from '../../store/slices/notificationSlice';
import { ROLE_MENU } from '../../constants/permissions';
import { Bell, Search, LogOut, User, ChevronDown, Menu } from 'lucide-react';

const PAGE_TITLES = {
  '/dashboard':              'Dashboard',
  '/epcr':                   'EPCR Records',
  '/qa/forms':               'QA Forms',
  '/qa/reviews':             'QA Reviews',
  '/workflows':              'Workflows',
  '/workflows/deployments':  'Deployments',
  '/reports':                'Reports',
  '/feedback':               'Feedback Threads',
  '/notifications':          'Notifications',
  '/users':                  'Users',
  '/organizations':          'Organizations',
  '/audit-logs':             'Audit Logs',
  '/settings':               'System Settings',
};

const Header = ({ setIsMobileMenuOpen }) => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = useSelector(selectUser);
  const role      = useSelector(selectRole);
  const unread    = useSelector(selectUnreadCount);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Poll unread count every 60s — only for roles that have Notifications
  useEffect(() => {
    const canViewNotifs = ROLE_MENU[role]?.includes('Notifications');
    if (!canViewNotifs) return;
    dispatch(fetchUnreadNotifications());
    const iv = setInterval(() => dispatch(fetchUnreadNotifications()), 60000);
    return () => clearInterval(iv);
  }, [role, dispatch]);

  // Close profile on outside click
  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pageTitle = PAGE_TITLES[location.pathname] || 'MedEPCR';

  const handleLogout = () => { dispatch(logoutUser()); navigate('/login'); };

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 glass-panel border-b border-y-0 border-x-0 border-[var(--border-color)] sticky top-0 z-30 shrink-0">
      {/* Left: search / title / hamburger */}
      <div className="flex-1 max-w-xl flex items-center gap-3">
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50"
        >
          <Menu size={24} />
        </button>
        <div className="relative hidden sm:block w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder={`Search in ${pageTitle}...`}
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-full pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 transition-all placeholder-slate-500" />
        </div>
        <h2 className="sm:hidden text-base font-semibold text-white">{pageTitle}</h2>
      </div>

      {/* Right: bell + profile */}
      <div className="flex items-center gap-3 ml-4">
        {/* Notification Bell */}
        <button onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-full hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 transition-colors">
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 border-2 border-[var(--bg-main)] flex items-center justify-center text-[9px] font-bold text-white px-1">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        <div className="h-7 w-px bg-slate-700/50" />

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button onClick={() => setProfileOpen(p => !p)}
            className="flex items-center gap-2.5 group cursor-pointer">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium text-slate-200 group-hover:text-teal-400 transition-colors leading-tight">{user?.email}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{role}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500/20 to-sky-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <User size={16} />
            </div>
            <ChevronDown size={12} className="text-slate-500 hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-[var(--bg-main)] border border-slate-700/50 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-800">
                <p className="text-sm font-medium text-slate-200 truncate">{user?.email}</p>
                <p className="text-xs text-slate-500 mt-0.5">{role}</p>
              </div>
              <div className="p-2">
                <button onClick={() => { setProfileOpen(false); navigate('/notifications'); }}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">
                  <Bell size={15} /><span>Notifications</span>
                  {unread > 0 && <span className="ml-auto text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full">{unread}</span>}
                </button>
                <button onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                  <LogOut size={15} /><span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
