import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  PieChart, BarChart2, TrendingUp, FileText, RefreshCw, Calendar, Activity, Layers
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart as RPieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts';
import {
  fetchAllReports, fetchCustomReport,
  selectReportStats, selectReportQaPerf, selectReportByStatus,
  selectCustomReport, selectReportLoading, selectCustomReportLoading
} from '../store/slices/reportSlice';

const CHART_COLORS = ['#1A3C8F', '#C8102E', '#059669', '#EA580C', '#7C3AED', '#0891B2', '#DB2777'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#DDE3F0] rounded-xl p-3 shadow-lg text-xs">
      <p className="font-bold text-[#4B5A7A] mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color || entry.fill }} />
          <span className="font-semibold text-[#0F1A3A]">{entry.name}: <span className="text-brand-blue">{entry.value}</span></span>
        </div>
      ))}
    </div>
  );
};

const Reports = () => {
  const dispatch = useDispatch();
  const stats         = useSelector(selectReportStats);
  const qaPerf        = useSelector(selectReportQaPerf);
  const byStatus      = useSelector(selectReportByStatus);
  const custom        = useSelector(selectCustomReport);
  const loading       = useSelector(selectReportLoading);
  const customLoading = useSelector(selectCustomReportLoading);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');

  useEffect(() => { dispatch(fetchAllReports()); }, []);

  const fetchCustom = (e) => {
    e.preventDefault();
    dispatch(fetchCustomReport({ startDate, endDate }));
  };

  const statusChartData = byStatus
    ? Object.entries(byStatus).map(([name, value]) => ({ name, value: Number(value) || 0 }))
    : [];

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="section-label mb-1">Analytics</p>
          <h1 className="text-2xl font-black text-[#0F1A3A] tracking-tight">Reports & <span className="text-brand-blue">Analytics</span></h1>
          <p className="text-sm text-[#8A97B0] mt-0.5">Operational metrics and clinical performance data</p>
        </div>
        <button onClick={() => dispatch(fetchAllReports())} disabled={loading}
          className="btn-ghost border border-[#DDE3F0] px-3 py-2.5 rounded-xl">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="card p-16 text-center">
          <RefreshCw size={32} className="text-[#DDE3F0] mx-auto mb-4 animate-spin" />
          <p className="text-sm text-[#A0AECB] font-medium">Loading analytics…</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          {stats && (
            <div className="space-y-3">
              <h2 className="text-xs font-black text-[#A0AECB] uppercase tracking-wider pl-1">Overview Statistics</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(stats).slice(0, 8).map(([key, val], i) => {
                  const icons = [FileText, Activity, TrendingUp, BarChart2];
                  const Icon = icons[i % 4];
                  return (
                    <div key={key} className="stat-card">
                      <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-brand-blue flex items-center justify-center mb-3">
                        <Icon size={18} />
                      </div>
                      <p className="text-2xl font-black text-brand-blue">
                        {typeof val === 'number' ? val.toLocaleString() : String(val)}
                      </p>
                      <p className="text-xs text-[#8A97B0] font-semibold uppercase tracking-wider mt-1 leading-tight">
                        {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Charts */}
          {statusChartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-brand-blue">
                    <PieChart size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#0F1A3A]">Records by Status</h3>
                    <p className="text-xs text-[#8A97B0]">Lifecycle distribution</p>
                  </div>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RPieChart>
                      <Pie data={statusChartData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={100} innerRadius={65} paddingAngle={6}
                        animationBegin={200} animationDuration={1200}>
                        {statusChartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="white" strokeWidth={3} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize:'11px', color:'#8A97B0', fontWeight:600, paddingTop:'1rem' }} />
                    </RPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-brand-blue">
                    <BarChart2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#0F1A3A]">Volume Analysis</h3>
                    <p className="text-xs text-[#8A97B0]">Records per classification</p>
                  </div>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusChartData} barSize={32} margin={{ bottom:16 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F4FC" />
                      <XAxis dataKey="name" tick={{ fill:'#8A97B0', fontSize:10, fontWeight:600 }} axisLine={false} tickLine={false} dy={8} />
                      <YAxis tick={{ fill:'#8A97B0', fontSize:10, fontWeight:600 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill:'#F8FAFF' }} content={<CustomTooltip />} />
                      <Bar dataKey="value" radius={[8,8,0,0]} animationBegin={400} animationDuration={1500}>
                        {statusChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* QA Performance */}
          {qaPerf && Object.keys(qaPerf).length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-brand-blue">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-[#0F1A3A]">QA Performance Metrics</h3>
                  <p className="text-xs text-[#8A97B0]">Clinical review and compliance indices</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(qaPerf).slice(0, 8).map(([key, val]) => (
                  <div key={key} className="p-4 bg-[#F8FAFF] rounded-xl border border-[#DDE3F0]">
                    <p className="text-2xl font-black text-brand-blue">
                      {typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(1)) : String(val)}
                    </p>
                    <p className="text-xs text-[#8A97B0] font-semibold uppercase tracking-wider mt-1 leading-tight">
                      {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Custom Date Report */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-brand-blue">
            <Calendar size={18} />
          </div>
          <div>
            <h3 className="font-bold text-[#0F1A3A]">Custom Date Range Report</h3>
            <p className="text-xs text-[#8A97B0]">Generate analytics for a specific time period</p>
          </div>
        </div>
        <form onSubmit={fetchCustom} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input py-2.5 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input py-2.5 text-sm" />
          </div>
          <button type="submit" disabled={customLoading} className="btn-primary justify-center py-2.5 text-sm">
            {customLoading ? <RefreshCw size={15} className="animate-spin" /> : <Layers size={15} />}
            {customLoading ? 'Generating…' : 'Generate Report'}
          </button>
        </form>

        {custom && (
          <div className="mt-6 space-y-4">
            {[
              { id:'statistics', label:'Statistics', data:custom.statistics, color:'brand-blue' },
              { id:'qaPerformance', label:'QA Performance', data:custom.qaPerformance, color:'brand-blue' },
              { id:'recordsByStatus', label:'Records by Status', data:custom.recordsByStatus, color:'brand-red' },
            ].map(section => section.data && Object.keys(section.data).length > 0 && (
              <div key={section.id}>
                <p className="text-xs font-black text-[#A0AECB] uppercase tracking-wider mb-3">{section.label}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(section.data).map(([key, val]) => (
                    <div key={key} className="p-3.5 bg-[#F8FAFF] rounded-xl border border-[#DDE3F0]">
                      <p className="text-xl font-black text-brand-blue">
                        {typeof val === 'number' ? (Number.isInteger(val) ? val.toLocaleString() : val.toFixed(1)) : String(val)}
                      </p>
                      <p className="text-xs text-[#8A97B0] font-semibold mt-1 leading-tight">
                        {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
