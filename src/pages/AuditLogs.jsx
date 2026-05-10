import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Server, Search, RefreshCw, FileText, Globe, User,
  Activity, Shield, ShieldCheck, Clock, Database, Lock, AlertCircle, LayoutGrid
} from 'lucide-react';
import { fetchUsers, selectUsers } from '../store/slices/userSlice';
import {
  fetchAuditLogs, selectAuditLogs, selectAuditLoading,
  selectAuditHasMore, selectAuditPage, selectAuditError
} from '../store/slices/auditSlice';

const ACTION_BADGE = {
  LOGIN:       'badge badge-blue',
  LOGOUT:      'badge badge-gray',
  CREATE:      'badge badge-green',
  UPDATE:      'badge badge-blue',
  DELETE:      'badge badge-red',
  DEIDENTIFY:  'badge badge-gray',
  BREAK_GLASS: 'badge badge-red',
};

const getActionBadge = (action) => {
  if (!action) return ACTION_BADGE.LOGOUT;
  const u = action.toUpperCase();
  if (u.includes('LOGIN'))  return ACTION_BADGE.LOGIN;
  if (u.includes('CREATE')) return ACTION_BADGE.CREATE;
  if (u.includes('UPDATE')) return ACTION_BADGE.UPDATE;
  if (u.includes('DELETE')) return ACTION_BADGE.DELETE;
  if (u.includes('BREAK'))  return ACTION_BADGE.BREAK_GLASS;
  if (u.includes('DEIDENTIFY') || u.includes('ANONYMIZE')) return ACTION_BADGE.DEIDENTIFY;
  return ACTION_BADGE.LOGOUT;
};

const AuditLogs = () => {
  const dispatch = useDispatch();
  const logs    = useSelector(selectAuditLogs);
  const loading = useSelector(selectAuditLoading);
  const hasMore = useSelector(selectAuditHasMore);
  const page    = useSelector(selectAuditPage);
  const allUsers = useSelector(selectUsers);

  const [searchTerm, setSearchTerm]     = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const usersById = {};
  allUsers.forEach(u => { if (u.id) usersById[u.id] = u; if (u.userId) usersById[u.userId] = u; });

  const displayUser = (log) => {
    const uid = log.userId || log.actorId || log.performedBy || log.createdBy;
    const u = uid ? usersById[uid] : null;
    if (u) return `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || uid;
    return log.username || log.userName || log.user || uid || '—';
  };

  const fetchLogs = (pageNum = 0, isAppend = false) =>
    dispatch(fetchAuditLogs({ page: pageNum, size: 20, isAppend }));

  useEffect(() => { dispatch(fetchUsers()); fetchLogs(0, false); }, [dispatch]);

  const actionTypes = [...new Set((Array.isArray(logs) ? logs : []).map(l => l.action).filter(Boolean))];

  const filteredLogs = (Array.isArray(logs) ? logs : []).filter(log => {
    const matchSearch = !searchTerm ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      displayUser(log).toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchAction = filterAction === 'ALL' || log.action === filterAction;
    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="section-label mb-1">Administration</p>
          <h1 className="text-2xl font-black text-[#0F1A3A] tracking-tight">Audit <span className="text-brand-blue">Logs</span></h1>
          <p className="text-sm text-[#8A97B0] mt-0.5">Immutable activity and security event registry</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => fetchLogs(0, false)} disabled={loading}
            className="btn-ghost border border-[#DDE3F0] px-3 py-2.5 rounded-xl">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="btn-primary text-sm px-4 py-2.5">
            <FileText size={16} /> Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: logs?.length || 0, icon: Activity, blue: true },
          { label: 'Create Actions', value: (Array.isArray(logs) ? logs : []).filter(l => l.action?.includes('CREATE')).length, icon: FileText, blue: true },
          { label: 'Delete Actions', value: (Array.isArray(logs) ? logs : []).filter(l => l.action?.includes('DELETE')).length, icon: AlertCircle, blue: false },
          { label: 'Storage', value: 'AES-256', icon: Database, blue: true },
        ].map(({ label, value, icon: Icon, blue }) => (
          <div key={label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${blue ? 'bg-[#EEF2FF] text-brand-blue' : 'bg-red-50 text-brand-red'}`}>
              <Icon size={18} />
            </div>
            <p className={`text-3xl font-black ${blue ? 'text-brand-blue' : 'text-brand-red'}`}>{value}</p>
            <p className="text-xs text-[#8A97B0] font-semibold uppercase tracking-wider mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="card overflow-hidden">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 p-5 border-b border-[#F0F4FC]">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0AECB]" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search logs…" className="input pl-10 py-2.5 text-sm" />
          </div>
          <div className="relative">
            <LayoutGrid size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0AECB]" />
            <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
              className="input pl-10 py-2.5 text-sm pr-4 min-w-[160px]">
              <option value="ALL">All Actions</option>
              {actionTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <span className="text-xs text-[#A0AECB] font-semibold sm:ml-auto">{filteredLogs.length} events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>User</th>
                <th>IP Address</th>
                <th>Entity</th>
              </tr>
            </thead>
            <tbody>
              {loading && !filteredLogs.length ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan="5" className="py-3 px-5">
                    <div className="h-10 bg-[#F0F4FC] rounded-xl animate-pulse" />
                  </td></tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan="5" className="py-16 text-center">
                  <ShieldCheck size={36} className="text-[#DDE3F0] mx-auto mb-3" />
                  <p className="text-sm text-[#A0AECB] font-medium">No events found</p>
                </td></tr>
              ) : filteredLogs.map(log => (
                <tr key={log.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-[#EEF2FF] rounded-lg flex items-center justify-center text-brand-blue shrink-0">
                        <Clock size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0F1A3A]">
                          {new Date(log.timestamp || log.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-[#A0AECB]">
                          {new Date(log.timestamp || log.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={getActionBadge(log.action)}>
                      {log.action?.replace(/_/g,' ') || '—'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-[#F0F4FC] rounded-lg flex items-center justify-center text-[#8A97B0]">
                        <User size={13} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0F1A3A]">{displayUser(log)}</p>
                        <p className="text-xs text-[#A0AECB]">UID: {(log.userId || '—')?.substring?.(0,8)}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-sm font-mono text-[#4B5A7A]">
                      <Globe size={13} className="text-[#A0AECB]" /> {log.ipAddress || '—'}
                    </div>
                  </td>
                  <td>
                    <p className="text-sm font-semibold text-[#0F1A3A]">{log.entityType || 'System'}</p>
                    <p className="text-xs text-[#A0AECB] truncate max-w-[200px]">{log.details || '—'}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <div className="p-5 border-t border-[#F0F4FC] text-center">
            <button onClick={() => fetchLogs(page + 1, true)}
              className="btn-outline text-sm px-6 py-2.5">
              {loading ? <RefreshCw size={15} className="animate-spin" /> : null}
              Load More
            </button>
          </div>
        )}
      </div>

      {/* Security notice */}
      <div className="flex items-center gap-4 p-5 bg-[#EEF2FF] rounded-2xl border border-[#C8D5F0]">
        <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center shrink-0">
          <Lock size={18} className="text-white" />
        </div>
        <p className="text-sm text-brand-blue font-medium">
          This registry is immutable and encrypted with AES-256-GCM. All access events are permanently recorded.
        </p>
      </div>
    </div>
  );
};

export default AuditLogs;
