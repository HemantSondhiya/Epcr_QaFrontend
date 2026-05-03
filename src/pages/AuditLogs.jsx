import { useState, useEffect } from 'react';
import { Server, Search, RefreshCw, FileText } from 'lucide-react';
import client from '../api/client';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const displayUser = (log) => {
    const userId = log.userId || log.actorId || log.performedBy || log.createdBy;
    const user = userId ? usersById[userId] : null;
    if (user) return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || userId;
    return log.username || log.userName || log.user || userId || '—';
  };

  const fetchUsers = async () => {
    try {
      const res = await client.get('/api/users', { hideToast: true });
      const list = Array.isArray(res.data) ? res.data : (res.data?.content || []);
      const map = {};
      list.forEach(user => {
        if (user.id) map[user.id] = user;
        if (user.userId) map[user.userId] = user;
      });
      setUsersById(map);
    } catch {
      setUsersById({});
    }
  };
  
  const fetchLogs = async (pageNum = 0, isAppend = false) => {
    if (!isAppend) setLoading(true);
    setError('');
    try {
      const size = 20;
      const res = await client.get(`/api/audit/logs?page=${pageNum}&size=${size}`);
      
      const data = res.data;
      const isPaginated = data && data.content !== undefined;
      const newLogs = isPaginated ? data.content : (Array.isArray(data) ? data : []);
      
      setLogs(prev => isAppend ? [...prev, ...newLogs] : newLogs);
      setHasMore(isPaginated ? !data.last : false);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
      setError('Failed to load audit logs. Endpoint may not be ready yet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLogs(0, false);
  }, []);

  // Get unique action types for filter dropdown
  const actionTypes = [...new Set((Array.isArray(logs) ? logs : []).map(l => l.action).filter(Boolean))];

  // Filter logs by search term and action type
  const filteredLogs = (Array.isArray(logs) ? logs : []).filter(log => {
    const matchSearch = !searchTerm || 
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      displayUser(log).toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchAction = filterAction === 'ALL' || log.action === filterAction;
    return matchSearch && matchAction;
  });

  const getActionColor = (action) => {
    const colors = {
      LOGIN: 'text-sky-400',
      LOGOUT: 'text-slate-400',
      CREATE: 'text-teal-400',
      UPDATE: 'text-amber-400',
      DELETE: 'text-rose-400',
    };
    return colors[action] || 'text-slate-300';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Audit Logs</h1>
          <p className="text-slate-400 text-sm mt-1">Global security and activity monitoring.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchLogs(0, false)} className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg transition-colors border border-slate-700/50">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors border border-slate-700">
            <FileText size={18} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search logs by action, user, or entity..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none appearance-none"
            >
              <option value="ALL">All Actions</option>
              {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {error && <div className="p-4 m-4 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg">{error}</div>}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-[var(--border-color)]">
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Target</th>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">IP Address / Details</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-teal-500" />
                    Loading logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 && !error ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                    {logs.length === 0 ? 'No audit logs recorded yet.' : 'No logs match your search.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {log.timestamp || log.time ? new Date(log.timestamp || log.time).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Server size={14} className="text-slate-500" />
                        <span className={`text-sm font-medium ${getActionColor(log.action)}`}>{log.action}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.entityType ? (
                        <div>
                          <span className="text-slate-300 font-medium">{log.entityType}</span>
                          {log.entityId && <span className="text-slate-500 ml-2 text-xs">#{log.entityId.substring(0, 8)}</span>}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {displayUser(log)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                      {log.ipAddress || log.details || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${log.status === 'SUCCESS' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : log.status === 'FAILURE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>
                        {log.status || 'INFO'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-[var(--border-color)] flex justify-between items-center text-sm text-slate-400">
          <span>Showing {filteredLogs.length} of {(Array.isArray(logs) ? logs : []).length} logs</span>
          {hasMore && (
            <button 
              onClick={() => fetchLogs(page + 1, true)}
              disabled={loading}
              className="px-4 py-1.5 text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-lg hover:bg-teal-500/20 transition-colors disabled:opacity-50"
            >
              Load More
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
