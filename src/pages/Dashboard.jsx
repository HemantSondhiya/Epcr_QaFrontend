import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser, selectRole } from '../store/slices/authSlice';
import { fetchRecords, selectRecords, selectEpcrLoading } from '../store/slices/epcrSlice';
import { fetchQaReviews, fetchPendingReviews, selectReviews, selectPendingReviews } from '../store/slices/qaSlice';
import { fetchNotifications, selectUnreadCount } from '../store/slices/notificationSlice';
import { fetchWorkflows, selectWorkflows } from '../store/slices/workflowSlice';
import StatsCard from '../components/common/StatsCard';
import { FileText, CheckSquare, Bell, GitBranch, Users, Building2, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROLE_MENU } from '../constants/permissions';
import AnalyticsCharts from '../components/dashboard/AnalyticsCharts';

/* ─── Role-specific widget sets ─────────────────────────────────── */

const AdminDashboard = ({ records, reviews, pending, workflows, unread, loading }) => (
  <div className="space-y-8">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      <StatsCard icon={<FileText size={20}/>}   label="Total EPCR Records" value={records.length}      color="teal"   loading={loading} />
      <StatsCard icon={<CheckSquare size={20}/>} label="QA Reviews"         value={reviews.length}      color="sky"    loading={loading} />
      <StatsCard icon={<Clock size={20}/>}       label="Pending QA"         value={pending.length}      color="amber"  loading={loading} />
      <StatsCard icon={<Bell size={20}/>}        label="Unread Alerts"      value={unread}              color="rose"   loading={loading} />
      <StatsCard icon={<GitBranch size={20}/>}   label="Active Workflows"   value={workflows.filter(w=>w.active).length} color="purple" loading={loading} />
      <StatsCard icon={<AlertCircle size={20}/>} label="Rejected Records"   value={records.filter(r=>r.status==='REJECTED').length} color="rose" loading={loading} />
      <StatsCard icon={<TrendingUp size={20}/>}  label="Submitted Today"    value={records.filter(r=>r.status==='SUBMITTED').length} color="indigo" loading={loading} />
      <StatsCard icon={<CheckSquare size={20}/>} label="Approved"           value={records.filter(r=>r.status==='APPROVED').length} color="teal" loading={loading} />
    </div>
    <QuickLinks role="ADMIN" />
    <AnalyticsCharts />
    <RecentRecords records={records.slice(0,5)} loading={loading} />
  </div>
);

const ManagerDashboard = ({ reviews, pending, workflows, unread, loading }) => (
  <div className="space-y-8">
    {/* Row 1: QA Oversight */}
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">QA / Quality Oversight</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard icon={<Clock size={20}/>}       label="Pending Reviews"   value={pending.length}                                          color="amber"  loading={loading} />
        <StatsCard icon={<CheckSquare size={20}/>} label="Total QA Reviews"  value={reviews.length}                                          color="sky"    loading={loading} />
        <StatsCard icon={<CheckSquare size={20}/>} label="Completed"         value={reviews.filter(r=>r.status==='COMPLETED').length}         color="teal"   loading={loading} />
        <StatsCard icon={<AlertCircle size={20}/>} label="Needs Attention"   value={reviews.filter(r=>r.status==='PENDING').length}           color="rose"   loading={loading} />
      </div>
    </div>
    {/* Row 2: Ops & Org */}
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Operations & Organization</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard icon={<GitBranch size={20}/>}  label="Active Workflows"   value={workflows.filter(w=>w.active).length}                    color="purple" loading={loading} />
        <StatsCard icon={<GitBranch size={20}/>}  label="Total Workflows"    value={workflows.length}                                         color="indigo" loading={loading} />
        <StatsCard icon={<Bell size={20}/>}       label="Unread Notifications" value={unread}                                                color="rose"   loading={loading} />
        <StatsCard icon={<TrendingUp size={20}/>} label="Pass Rate"          value={reviews.length ? `${Math.round((reviews.filter(r=>r.passed).length/reviews.length)*100)}%` : '—'} color="teal" loading={loading} />
      </div>
    </div>
    <QuickLinks role="MANAGER" />
    <AnalyticsCharts />
    <PendingQueue pending={pending.slice(0,8)} loading={loading} />
  </div>
);

const ParamedicDashboard = ({ records, unread, loading, userId }) => {
  const myRecords = records.filter(r => r.paramedicsId === userId);
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard icon={<FileText size={20}/>} label="My Records"    value={myRecords.length}                                    color="teal"  loading={loading} />
        <StatsCard icon={<FileText size={20}/>} label="Drafts"        value={myRecords.filter(r=>r.status==='DRAFT').length}      color="slate" loading={loading} />
        <StatsCard icon={<TrendingUp size={20}/>} label="Submitted"   value={myRecords.filter(r=>r.status==='SUBMITTED').length}  color="sky"   loading={loading} />
        <StatsCard icon={<Bell size={20}/>}     label="Notifications" value={unread}                                               color="rose"  loading={loading} />
      </div>
      <QuickLinks role="PARAMEDIC" />
      <RecentRecords records={myRecords.slice(0,5)} loading={loading} title="My Recent Records" />
    </div>
  );
};

const PhysicianDashboard = ({ records, reviews, unread, loading }) => (
  <div className="space-y-8">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      <StatsCard icon={<FileText size={20}/>}    label="EPCR Records"  value={records.length}  color="teal"   loading={loading} />
      <StatsCard icon={<CheckSquare size={20}/>} label="QA Reviews"    value={reviews.length}  color="sky"    loading={loading} />
      <StatsCard icon={<CheckSquare size={20}/>} label="Approved"      value={reviews.filter(r=>r.status==='COMPLETED').length} color="teal" loading={loading} />
      <StatsCard icon={<Bell size={20}/>}        label="Notifications" value={unread}          color="rose"   loading={loading} />
    </div>
    <QuickLinks role="PHYSICIAN" />
  </div>
);

const QaReviewerDashboard = ({ reviews, pending, unread, loading }) => (
  <div className="space-y-8">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      <StatsCard icon={<Clock size={20}/>}       label="Pending Reviews" value={pending.length} color="amber" loading={loading} />
      <StatsCard icon={<CheckSquare size={20}/>} label="Total Reviews"   value={reviews.length} color="teal"  loading={loading} />
      <StatsCard icon={<CheckSquare size={20}/>} label="Completed"       value={reviews.filter(r=>r.status==='COMPLETED').length} color="sky" loading={loading} />
      <StatsCard icon={<Bell size={20}/>}        label="Notifications"   value={unread}         color="rose"  loading={loading} />
    </div>
    <QuickLinks role="QA_REVIEWER" />
    <PendingQueue pending={pending.slice(0,5)} loading={loading} />
  </div>
);

const ViewerDashboard = ({ unread, loading }) => (
  <div className="space-y-8">
    <div className="grid grid-cols-2 gap-5 max-w-sm">
      <StatsCard icon={<Bell size={20}/>} label="Notifications" value={unread} color="rose" loading={loading} />
    </div>
    <QuickLinks role="VIEWER" />
  </div>
);

/* ─── Shared sub-components ─────────────────────────────────────── */

const STATUS_STYLE = {
  DRAFT:       'bg-slate-500/10 text-slate-400 border-slate-500/20',
  IN_PROGRESS: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  COMPLETED:   'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  SUBMITTED:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  APPROVED:    'bg-teal-500/10 text-teal-400 border-teal-500/20',
  REJECTED:    'bg-rose-500/10 text-rose-400 border-rose-500/20',
  ARCHIVED:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const Badge = ({ status }) => (
  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${STATUS_STYLE[status] || STATUS_STYLE.DRAFT}`}>
    {(status || 'DRAFT').replace(/_/g,' ')}
  </span>
);

const RecentRecords = ({ records, loading, title = 'Recent EPCR Records' }) => (
  <div className="glass-card rounded-2xl overflow-hidden">
    <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <Link to="/epcr" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">View all →</Link>
    </div>
    <div className="divide-y divide-[var(--border-color)]">
      {loading ? [...Array(3)].map((_,i) => (
        <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
          <div className="h-3 bg-slate-800 rounded w-32"/><div className="h-3 bg-slate-800 rounded w-20 ml-auto"/>
        </div>
      )) : records.length === 0 ? (
        <p className="text-slate-500 text-sm px-5 py-8 text-center">No records yet.</p>
      ) : records.map(r => (
        <div key={r.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
          <div>
            <p className="text-sm font-medium text-slate-200">{r.patientName || 'Unknown Patient'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{r.incidentLocation || r.incidentType || '—'}</p>
          </div>
          <Badge status={r.status} />
        </div>
      ))}
    </div>
  </div>
);

const PendingQueue = ({ pending, loading }) => (
  <div className="glass-card rounded-2xl overflow-hidden">
    <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
      <h2 className="text-sm font-semibold text-white">Pending QA Queue</h2>
      <Link to="/qa/reviews" className="text-xs text-teal-400 hover:text-teal-300">View all →</Link>
    </div>
    <div className="divide-y divide-[var(--border-color)]">
      {loading ? [...Array(3)].map((_,i)=>(<div key={i} className="px-5 py-4 animate-pulse"><div className="h-3 bg-slate-800 rounded w-40"/></div>))
      : pending.length === 0 ? <p className="text-slate-500 text-sm px-5 py-8 text-center">No pending reviews.</p>
      : pending.map(r => (
        <div key={r.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
          <div>
            <p className="text-sm font-medium text-slate-200">Review {r.id?.substring(0,12)}...</p>
            <p className="text-xs text-slate-500 mt-0.5">Record: {(r.recordId||r.patientCareRecordId||'—')?.substring(0,16)}...</p>
          </div>
          <Badge status={r.status || 'PENDING'} />
        </div>
      ))}
    </div>
  </div>
);

const QUICK_LINK_ROUTES = {
  Dashboard:      { path:'/dashboard',         label:'Dashboard',     icon:FileText },
  Organizations:  { path:'/organizations',     label:'Organizations', icon:Building2 },
  Users:          { path:'/users',             label:'Users',         icon:Users },
  EPCR:           { path:'/epcr',              label:'EPCR',          icon:FileText },
  'QA Forms':     { path:'/qa/forms',          label:'QA Forms',      icon:CheckSquare },
  'QA Reviews':   { path:'/qa/reviews',        label:'QA Reviews',    icon:CheckSquare },
  Workflows:      { path:'/workflows',         label:'Workflows',     icon:GitBranch },
  Deployments:    { path:'/workflows/deployments', label:'Deployments', icon:GitBranch },
  Reports:        { path:'/reports',           label:'Reports',       icon:TrendingUp },
  Feedback:       { path:'/feedback',          label:'Feedback',      icon:Bell },
  Notifications:  { path:'/notifications',     label:'Notifications', icon:Bell },
};

const QuickLinks = ({ role }) => {
  const items = (ROLE_MENU[role] || []).filter(m => m !== 'Dashboard').slice(0,6);
  return (
    <div className="glass-card rounded-2xl p-5">
      <h2 className="text-sm font-semibold text-white mb-4">Quick Access</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map(m => {
          const cfg = QUICK_LINK_ROUTES[m]; if (!cfg) return null;
          const Icon = cfg.icon;
          return (
            <Link key={m} to={cfg.path}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-teal-500/30 hover:bg-teal-500/5 transition-all text-center group">
              <Icon size={20} className="text-slate-400 group-hover:text-teal-400 transition-colors" />
              <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors leading-tight">{m}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Main Dashboard ─────────────────────────────────────────────── */
const ROLE_GREETINGS = {
  ADMIN:       'System Overview',
  MANAGER:     'Quality & Operations Overview',
  PARAMEDIC:   'Your Activity',
  PHYSICIAN:   'Clinical Overview',
  QA_REVIEWER: 'QA Dashboard',
  VIEWER:      'Overview',
};

const Dashboard = () => {
  const dispatch  = useDispatch();
  const user      = useSelector(selectUser);
  const role      = useSelector(selectRole);
  const records   = useSelector(selectRecords);
  const reviews   = useSelector(selectReviews);
  const pending   = useSelector(selectPendingReviews);
  const workflows = useSelector(selectWorkflows);
  const unread    = useSelector(selectUnreadCount);
  const loading   = useSelector(selectEpcrLoading);

  useEffect(() => {
    // EPCR — only roles with backend EPCR access
    if (ROLE_MENU[role]?.includes('EPCR')) {
      dispatch(fetchRecords());
    }
    // QA — MANAGER, PHYSICIAN, QA_REVIEWER, ADMIN all have access
    if (ROLE_MENU[role]?.includes('QA Reviews')) {
      dispatch(fetchQaReviews());
      dispatch(fetchPendingReviews());
    }
    // Notifications — all roles except those explicitly blocked
    if (ROLE_MENU[role]?.includes('Notifications')) {
      dispatch(fetchNotifications(user?.userId || user?.id));
    }
    // Workflows — ADMIN and MANAGER have access
    if (role === 'ADMIN' || role === 'MANAGER') {
      dispatch(fetchWorkflows(user?.organizationId));
    }
  }, [dispatch, role, user]);

  const props = { records, reviews, pending, workflows, unread, loading, userId: user?.userId || user?.id };
  const subtitle = ROLE_GREETINGS[role] || 'Overview';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Welcome back, <span className="text-teal-400">{user?.email?.split('@')[0] || 'User'}</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">{subtitle} — {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}</p>
      </div>

      {/* Role-specific dashboard */}
      {role === 'ADMIN'       && <AdminDashboard      {...props} />}
      {role === 'MANAGER'     && <ManagerDashboard    {...props} />}
      {role === 'PARAMEDIC'   && <ParamedicDashboard  {...props} />}
      {role === 'PHYSICIAN'   && <PhysicianDashboard  {...props} />}
      {role === 'QA_REVIEWER' && <QaReviewerDashboard {...props} />}
      {role === 'VIEWER'      && <ViewerDashboard     {...props} />}
    </div>
  );
};

export default Dashboard;
