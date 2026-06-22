import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useNavigate } from 'react-router-dom';
import { logoutUser, selectRole, selectUser } from '../../store/slices/authSlice';
import { selectUnreadCount } from '../../store/slices/notificationSlice';
import { ROLE_MENU, ROUTE_MAP } from '../../constants/permissions';
import {
  LayoutDashboard, FileText, CheckSquare, ClipboardList, GitBranch, Rocket,
  Building2, Users, PieChart, Server, Settings, Bell, MessageSquare, LogOut,
  Shield, ShieldCheck, BookOpen, Zap, Handshake, EyeOff, UserSquare, Code2,
  Activity, HeartPulse, Sliders, AlertTriangle, LifeBuoy
} from 'lucide-react';

const MENU_ICONS = {
  Dashboard: LayoutDashboard,
  Organizations: Building2,
  Users: Users,
  Tickets: LifeBuoy,
  EPCR: FileText,
  'QA Forms': ClipboardList,
  'QA Reviews': CheckSquare,
  'QA Rules': Shield,
  'Rules Engine': Sliders,
  'Form Templates': Code2,
  Workflows: GitBranch,
  Deployments: Rocket,
  Reports: PieChart,
  Feedback: MessageSquare,
  Notifications: Bell,
  'Audit Logs': Server,
  'System Settings': Settings,
  'HIPAA Consent': ShieldCheck,
  'HIPAA Disclosure': BookOpen,
  'Patient Portal': UserSquare,
  'Patient History': HeartPulse,
  'Break-Glass': Zap,
  'Business Associates': Handshake,
  'De-Identification': EyeOff,
  'Critical Follow-Ups': AlertTriangle,
  'User Guide': BookOpen,
};

/* Group menu items by category */
const MENU_GROUPS = [
  { label: 'Overview', items: ['Dashboard', 'User Guide'] },
  { label: 'Records', items: ['EPCR', 'QA Forms', 'QA Reviews', 'QA Rules', 'Rules Engine', 'Form Templates'] },
  { label: 'Operations', items: ['Workflows', 'Deployments', 'Reports', 'Feedback', 'Notifications'] },
  { label: 'Admin', items: ['Organizations', 'Users', 'Tickets', 'Audit Logs', 'System Settings'] },
  { label: 'Compliance', items: ['HIPAA Consent', 'HIPAA Disclosure', 'Business Associates', 'De-Identification', 'Patient Portal', 'Patient History', 'Break-Glass', 'Critical Follow-Ups'] },
];

const Sidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const role = useSelector(selectRole);
  const user = useSelector(selectUser);
  const unread = useSelector(selectUnreadCount);
  const menuItems = ROLE_MENU[role] || [];

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside className={`fixed md:relative top-0 left-0 h-full w-48 flex flex-col shrink-0 z-50
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `} style={{ background: '#1A3C8F' }}>

        {/* Logo */}
        <div className="h-10 flex items-center px-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-red rounded-lg flex items-center justify-center shadow-sm">
              <Activity size={12} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-xs leading-none tracking-tight">INNOVIXA</p>
              <p className="text-white/40 font-semibold text-[8px] tracking-widest uppercase">Health Platform</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {MENU_GROUPS.map(group => {
            const visible = group.items.filter(i => menuItems.includes(i));
            if (!visible.length) return null;
            const displayLabel = group.label === 'Admin' && role !== 'ADMIN' ? 'Support' : group.label;
            return (
              <div key={group.label} className="mb-3">
                <p className="px-2 mb-1 text-[9px] font-bold uppercase tracking-widest text-white/25">
                  {displayLabel}
                </p>
                {visible.map(item => {
                  const Icon = MENU_ICONS[item] || FileText;
                  const path = ROUTE_MAP[item];
                  if (!path) return null;
                  return (
                    <NavLink key={item} to={path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-200 group ${isActive
                          ? 'bg-brand-red text-white shadow-[0_2px_8px_rgba(200,16,46,0.35)]'
                          : 'text-white/60 hover:text-white hover:bg-white/10'
                        }`
                      }>
                      <Icon size={12} className="shrink-0" />
                      <span className="flex-1 text-[11px] font-semibold">{item}</span>
                      {item === 'Notifications' && unread > 0 && (
                        <span className="bg-white text-brand-red text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                          {unread}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-2 border-t border-white/10 shrink-0" style={{ background: 'rgba(0,0,0,0.15)' }}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-6 h-6 bg-brand-red rounded-lg flex items-center justify-center text-white font-black text-[10px] shrink-0">
              {(user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-[11px] font-bold truncate leading-tight">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-white/40 text-[9px] font-semibold uppercase tracking-wider truncate">{role}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all text-[11px] font-semibold">
            <LogOut size={12} /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
