import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout, selectRole, selectUser } from '../../store/slices/authSlice';
import { selectUnreadCount } from '../../store/slices/notificationSlice';
import { ROLE_MENU, ROUTE_MAP } from '../../constants/permissions';
import {
  LayoutDashboard, FileText, CheckSquare, ClipboardList, GitBranch, Rocket,
  Building2, Users, PieChart, Server, Settings, Bell, MessageSquare, LogOut,
} from 'lucide-react';

const MENU_ICONS = {
  Dashboard:      LayoutDashboard,
  Organizations:  Building2,
  Users:          Users,
  EPCR:           FileText,
  'QA Forms':     ClipboardList,
  'QA Reviews':   CheckSquare,
  Workflows:      GitBranch,
  Deployments:    Rocket,
  Reports:        PieChart,
  Feedback:       MessageSquare,
  Notifications:  Bell,
  'Audit Logs':   Server,
  'System Settings': Settings,
};

const Sidebar = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const role      = useSelector(selectRole);
  const user      = useSelector(selectUser);
  const unread    = useSelector(selectUnreadCount);

  const menuItems = ROLE_MENU[role] || [];

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <aside className="w-64 h-screen flex flex-col glass-panel border-r border-y-0 border-l-0 border-[var(--border-color)] shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-[var(--border-color)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Med<span className="text-teal-400">EPCR</span></span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {menuItems.map(item => {
          const Icon  = MENU_ICONS[item] || FileText;
          const path  = ROUTE_MAP[item];
          if (!path) return null;
          return (
            <NavLink key={item} to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative ${
                  isActive
                    ? 'bg-teal-500/10 text-teal-400 font-medium border border-teal-500/20 shadow-[inset_0_0_12px_rgba(45,212,191,0.05)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }>
              <Icon size={18} className="shrink-0" />
              <span className="flex-1 text-sm">{item}</span>
              {item === 'Notifications' && unread > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white min-w-[18px] text-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 p-3 border-t border-[var(--border-color)] space-y-2">
        <div className="px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800">
          <p className="text-xs font-medium text-slate-200 truncate">{user?.email}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">{role}</p>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-sm">
          <LogOut size={18} /><span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
