import { useState, useEffect } from 'react';
import { PieChart, BarChart2, TrendingUp, FileText, RefreshCw, Calendar, Download, X, Activity } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart as RPieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import client from '../api/client';

const COLORS = ['#2dd4bf', '#38bdf8', '#a78bfa', '#fb923c', '#f472b6', '#34d399', '#f87171'];

const StatCard = ({ icon, label, value, sub, color = 'teal' }) => {
  const colors = { teal:'text-teal-400 bg-teal-500/10 border-teal-500/20', sky:'text-sky-400 bg-sky-500/10 border-sky-500/20', purple:'text-purple-400 bg-purple-500/10 border-purple-500/20', amber:'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  return (
    <div className="glass-card rounded-2xl p-5 hover-glow transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colors[color]}`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-white">{value ?? '—'}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
};

const Reports = () => {
  const [stats, setStats]         = useState(null);
  const [qaPerf, setQaPerf]       = useState(null);
  const [byStatus, setByStatus]   = useState(null);
  const [custom, setCustom]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [customLoading, setCustomLoading] = useState(false);
  const [error, setError]         = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');

  const fetchAll = async () => {
    setLoading(true); setError('');
    try {
      const [sRes, qRes, bRes] = await Promise.allSettled([
        client.get('/api/reports/statistics'),
        client.get('/api/reports/qa-performance'),
        client.get('/api/reports/records-by-status'),
      ]);
      if (sRes.status === 'fulfilled') setStats(sRes.value.data);
      if (qRes.status === 'fulfilled') setQaPerf(qRes.value.data);
      if (bRes.status === 'fulfilled') setByStatus(bRes.value.data);
    } catch { setError('Failed to load some report data.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchCustom = async (e) => {
    e.preventDefault(); setCustomLoading(true); setError('');
    try {
      const params = {};
      if (startDate) params.startDate = new Date(startDate).toISOString();
      if (endDate) params.endDate = new Date(endDate).toISOString();
      const res = await client.get('/api/reports/custom', { params });
      setCustom(res.data);
    } catch { setError('Failed to generate custom report.'); }
    finally { setCustomLoading(false); }
  };

  // Transform byStatus map to chart data
  const statusChartData = byStatus
    ? Object.entries(byStatus).map(([name, value]) => ({ name, value: Number(value) || 0 }))
    : [];

  // Transform stats to stat cards
  const statValue = (key) => stats?.[key] ?? stats?.[key.toLowerCase()] ?? '—';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reports & Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">System-wide performance insights from backend analytics.</p>
        </div>
        <button onClick={fetchAll} disabled={loading}
          className="flex items-center gap-2 p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50 transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 text-rose-400 text-sm border border-rose-500/20 rounded-lg flex justify-between">
          <span>{error}</span><button onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}

      {loading ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <RefreshCw className="animate-spin w-8 h-8 mx-auto mb-3 text-teal-500" />
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* Stat Cards from /api/reports/statistics */}
          {stats && (
            <div>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">System Statistics</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {Object.entries(stats).slice(0, 8).map(([key, val], i) => (
                  <StatCard
                    key={key}
                    icon={[<FileText size={20}/>, <Activity size={20}/>, <TrendingUp size={20}/>, <BarChart2 size={20}/>][i % 4]}
                    label={key.replace(/([A-Z])/g, ' $1').replace(/_/g,' ').trim()}
                    value={typeof val === 'number' ? val.toLocaleString() : String(val)}
                    color={['teal','sky','purple','amber'][i % 4]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Records by Status Chart */}
          {statusChartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white mb-1">Records by Status</h2>
                <p className="text-xs text-slate-500 mb-6">Distribution of EPCR records across all statuses</p>
                <ResponsiveContainer width="100%" height={240}>
                  <RPieChart>
                    <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} paddingAngle={3}>
                      {statusChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background:'#0f172a', border:'1px solid #1e293b', borderRadius:'8px', color:'#e2e8f0' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize:'11px', color:'#94a3b8' }} />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white mb-1">Status Breakdown</h2>
                <p className="text-xs text-slate-500 mb-6">Record count per status</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={statusChartData} barSize={28}>
                    <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background:'#0f172a', border:'1px solid #1e293b', borderRadius:'8px', color:'#e2e8f0' }} />
                    <Bar dataKey="value" fill="#2dd4bf" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* QA Performance */}
          {qaPerf && Object.keys(qaPerf).length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-white mb-1">QA Performance</h2>
              <p className="text-xs text-slate-500 mb-6">Quality assurance review metrics</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {Object.entries(qaPerf).slice(0,8).map(([key, val], i) => (
                  <div key={key} className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                    <p className="text-2xl font-bold text-white">{typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(1)) : String(val)}</p>
                    <p className="text-xs text-slate-400 mt-1">{key.replace(/([A-Z])/g,' $1').replace(/_/g,' ').trim()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Custom Date-Range Report */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Calendar size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Custom Date-Range Report</h2>
            <p className="text-xs text-slate-500">Query records within a specific time window</p>
          </div>
        </div>
        <form onSubmit={fetchCustom} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 outline-none" />
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-slate-300">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 outline-none" />
          </div>
          <button type="submit" disabled={customLoading}
            className="px-6 py-2.5 bg-purple-500 hover:bg-purple-400 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0">
            {customLoading ? <RefreshCw className="animate-spin" size={16} /> : <BarChart2 size={16} />}
            {customLoading ? 'Generating...' : 'Generate Report'}
          </button>
        </form>

        {custom && (
          <div className="mt-6 space-y-6">
            {/* Statistics */}
            {custom.statistics && Object.keys(custom.statistics).length > 0 && (
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                <p className="text-sm font-semibold text-white mb-3">General Statistics</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(custom.statistics).map(([key, val]) => (
                    <div key={key} className="p-3 bg-slate-800/50 rounded-lg">
                      <p className="text-lg font-bold text-teal-400">{typeof val === 'number' ? val.toLocaleString() : String(val)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{key.replace(/([A-Z])/g,' $1').replace(/_/g,' ').trim()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* QA Performance */}
            {custom.qaPerformance && Object.keys(custom.qaPerformance).length > 0 && (
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                <p className="text-sm font-semibold text-white mb-3">QA Performance</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(custom.qaPerformance).map(([key, val]) => (
                    <div key={key} className="p-3 bg-slate-800/50 rounded-lg">
                      <p className="text-lg font-bold text-sky-400">
                        {typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(1)) : String(val)}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{key.replace(/([A-Z])/g,' $1').replace(/_/g,' ').trim()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Records By Status */}
            {custom.recordsByStatus && Object.keys(custom.recordsByStatus).length > 0 && (
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                <p className="text-sm font-semibold text-white mb-3">Records By Status</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(custom.recordsByStatus).map(([key, val]) => (
                    <div key={key} className="p-3 bg-slate-800/50 rounded-lg">
                      <p className="text-lg font-bold text-purple-400">{typeof val === 'number' ? val.toLocaleString() : String(val)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{key.replace(/([A-Z])/g,' $1').replace(/_/g,' ').trim()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback if flat map (legacy support) */}
            {(!custom.statistics && !custom.qaPerformance && !custom.recordsByStatus) && (
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                <p className="text-sm font-semibold text-white mb-3">Custom Report Results</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(custom).map(([key, val]) => (
                    <div key={key} className="p-3 bg-slate-800/50 rounded-lg">
                      <p className="text-lg font-bold text-teal-400">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{key}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
