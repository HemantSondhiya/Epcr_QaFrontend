import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import client from '../../api/client';
import { Clock } from 'lucide-react';

const AnalyticsCharts = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/api/reports/dashboard-metrics')
      .then(res => {
        setMetrics(res.data);
      })
      .catch(err => console.error("Failed to load metrics", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-6 rounded-2xl flex items-center justify-center min-h-[300px] mt-6">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-400 text-sm">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  // Format data assuming backend returns objects/maps, e.g., { "Jan": 85, "Feb": 90 }
  const formatMonthData = (data) => {
    if (Array.isArray(data)) return data;
    if (typeof data === 'object' && data !== null) {
      return Object.entries(data).map(([key, val]) => ({ month: key, passRate: val }));
    }
    return [];
  };

  const formatLocationData = (data) => {
    if (Array.isArray(data)) return data;
    if (typeof data === 'object' && data !== null) {
      return Object.entries(data).map(([key, val]) => ({ location: key, count: val }));
    }
    return [];
  };

  const monthData = formatMonthData(metrics.monthWiseQaPassRate || []);
  const locationData = formatLocationData(metrics.topIncidentLocations || []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <div className="glass-card p-6 rounded-2xl">
        <h3 className="text-sm font-semibold text-white mb-4">6-Month QA Pass Rate</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(tick) => `${tick}%`} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#2dd4bf' }}
              />
              <Line type="monotone" dataKey="passRate" name="Pass Rate" stroke="#2dd4bf" strokeWidth={3} dot={{ r: 4, fill: '#2dd4bf', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-6 rounded-2xl">
        <h3 className="text-sm font-semibold text-white mb-4">Top Incident Locations</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={locationData} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis dataKey="location" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={100} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                cursor={{ fill: 'rgba(51, 65, 85, 0.4)' }}
              />
              <Bar dataKey="count" name="Incidents" fill="#38bdf8" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {metrics.averageReviewTimeHours != null && (
        <div className="glass-card p-6 rounded-2xl lg:col-span-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Average QA Review Turnaround</h3>
            <p className="text-xs text-slate-400 mt-1">From submission to completion</p>
          </div>
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-5 py-3 rounded-xl">
            <Clock className="text-amber-400" size={24} />
            <span className="text-2xl font-bold text-amber-400">{metrics.averageReviewTimeHours.toFixed(1)} <span className="text-sm font-normal">hrs</span></span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsCharts;
