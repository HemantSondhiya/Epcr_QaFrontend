import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { selectUser, selectRole } from '../../store/slices/authSlice';
import { selectUnreadCount, selectUnreadItems, fetchUnreadNotifications, markNotificationRead, markAllRead } from '../../store/slices/notificationSlice';
import { ROLE_MENU } from '../../constants/permissions';
import { Bell, Search, Menu, ChevronRight, CheckCircle, AlertTriangle, XCircle, Info, Clock, Check, CheckCheck } from 'lucide-react';

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

const TYPE_CONFIG = {
  INFO:    { icon: Info,          color: 'text-sky-600',    bg: 'bg-sky-50' },
  WARNING: { icon: AlertTriangle, color: 'text-amber-600',  bg: 'bg-amber-50' },
  SUCCESS: { icon: CheckCircle,   color: 'text-emerald-600',bg: 'bg-emerald-50' },
  ERROR:   { icon: XCircle,       color: 'text-brand-red',  bg: 'bg-red-50' },
};
const getConfig = (type) => TYPE_CONFIG[type?.toUpperCase()] || TYPE_CONFIG.INFO;

const Header = ({ setIsMobileMenuOpen }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const dispatch  = useDispatch();
  const user      = useSelector(selectUser);
  const role      = useSelector(selectRole);
  const unread    = useSelector(selectUnreadCount);
  const unreadItems = useSelector(selectUnreadItems) || [];

  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread notifications on mount if user has permission
  useEffect(() => {
    if (user && role && ROLE_MENU[role]?.includes('Notifications')) {
      dispatch(fetchUnreadNotifications());
    }
  }, [dispatch, user, role]);

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
        <div className="relative" ref={notifRef}>
          <button onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2.5 rounded-xl transition-all ${showNotifications ? 'bg-brand-blue text-white' : 'text-[#4B5A7A] hover:text-brand-blue hover:bg-[#F0F4FC]'}`}>
            <Bell size={19} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-brand-red text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Popover */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-[0_8px_40px_rgba(26,60,143,0.12)] border border-[#DDE3F0] overflow-hidden z-50 animate-fade-in origin-top-right">
              <div className="flex items-center justify-between p-4 border-b border-[#F0F4FC] bg-[#F8FAFF]">
                <h3 className="font-bold text-[#0F1A3A] text-sm">Notifications</h3>
                {unread > 0 && (
                  <button onClick={() => dispatch(markAllRead())} className="text-[11px] font-semibold text-brand-blue hover:text-brand-blue/80 flex items-center gap-1">
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {unreadItems?.length === 0 ? (
                  <div className="p-8 text-center text-[#A0AECB]">
                    <Bell size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#F0F4FC]">
                    {unreadItems.slice(0, 5).map((notif) => {
                      const cfg = getConfig(notif.type);
                      const Icon = cfg.icon;
                      return (
                        <div key={notif.id} className="p-4 hover:bg-[#F8FAFF] transition-colors flex gap-3 group relative">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.color}`}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0 pr-6">
                            <p className="text-sm font-semibold text-[#0F1A3A] truncate">{notif.title || 'Alert'}</p>
                            <p className="text-xs text-[#8A97B0] line-clamp-2 mt-0.5">{notif.message}</p>
                            <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-[#A0AECB]">
                              <Clock size={10} />
                              {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </div>
                          </div>
                          <button onClick={() => dispatch(markNotificationRead(notif.id))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#A0AECB] hover:text-brand-blue hover:bg-[#EEF2FF] opacity-0 group-hover:opacity-100 transition-all"
                            title="Mark as read">
                            <Check size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-[#F0F4FC] text-center bg-[#F8FAFF]">
                <button onClick={() => { setShowNotifications(false); navigate('/notifications'); }} className="text-xs font-bold text-brand-blue hover:text-brand-blue/80 w-full">
                  View all alerts
                </button>
              </div>
            </div>
          )}
        </div>

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
