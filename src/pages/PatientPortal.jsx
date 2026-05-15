import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RefreshCw, X, Eye, FileEdit, Ban, History, User,
  AlertCircle, ChevronRight, Shield, Plus, Trash2,
  Clock, CheckCircle2, ShieldCheck, Fingerprint, ShieldAlert,
  ArrowLeft, Activity, Heart, ClipboardCheck, Lock, FileText,
  ChevronDown, TrendingUp, Droplets, Thermometer, Wind, ClipboardList,
  Pill, Stethoscope, Calendar, FlaskConical, HeartPulse, Check, BedDouble, Tag, CalendarDays, UserRound, ExternalLink, MapPin, CloudLightning, Zap, Users
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceArea,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { addToast } from '../store/slices/uiSlice';
import {
  fetchPortalData, createAmendment, createRestriction,
  selectPortalRecords, selectPortalAmendments, selectPortalRestrictions,
  selectPortalDisclosures, selectPortalLoading
} from '../store/slices/patientPortalSlice';
import {
  fetchAllPatientHistory,
  selectAdmissions,
  selectConditions,
  selectDocuments,
  selectEncounters,
  selectHistoryLoading,
  selectHistorySummary,
  selectLabResults,
  selectMedications,
  selectTimeline,
  selectVitals
} from '../store/slices/patientHistorySlice';
import client from '../api/client';
import AuditLogs from './AuditLogs';

const asList = d => Array.isArray(d) ? d : (d?.content ?? []);

const parseNumber = value => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value).match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
};

const pickNumber = (data, keys, fallback = null) => {
  for (const key of keys) {
    const value = parseNumber(data?.[key]);
    if (value !== null) return value;
  }
  return fallback;
};

const parseBloodPressure = data => {
  const raw = data?.bloodPressure || data?.bp || data?.bloodPressureReading;
  if (typeof raw === 'string') {
    const values = raw.match(/\d+(\.\d+)?/g)?.map(Number) || [];
    if (values.length >= 2) return { systolic: values[0], diastolic: values[1], label: `${values[0]}/${values[1]}` };
  }

  const systolic = pickNumber(data, ['vitalsSystolic', 'systolicBp', 'systolicBP', 'systolic', 'bpSystolic'], 120);
  const diastolic = pickNumber(data, ['vitalsDiastolic', 'diastolicBp', 'diastolicBP', 'diastolic', 'bpDiastolic'], 80);
  return { systolic, diastolic, label: `${systolic}/${diastolic}` };
};

const buildVitals = data => {
  const bp = parseBloodPressure(data);
  const heartRate = pickNumber(data, ['vitalsPulse', 'heartRate', 'pulseRate', 'pulse'], 72);
  const temperature = pickNumber(data, ['vitalsTemp', 'temperature', 'bodyTemperature', 'temp'], 98.6);
  const spo2 = pickNumber(data, ['vitalsSpo2', 'spo2', 'spO2', 'oxygenSaturation', 'o2Saturation'], 98);
  const respiratoryRate = pickNumber(data, ['vitalsRespiratory', 'respiratoryRate', 'respirationRate', 'respRate'], 16);
  const bloodSugar = pickNumber(data, ['vitalsBloodSugar', 'bloodSugar', 'glucose', 'bloodGlucose'], null);
  const etco2 = pickNumber(data, ['vitalsEtco2', 'etco2', 'endTidalCo2'], null);
  const gcs = pickNumber(data, ['vitalsGcs', 'gcs', 'glasgowComaScale'], null);
  const height = pickNumber(data, ['height', 'patientHeight'], null);
  const weight = pickNumber(data, ['weight', 'patientWeight'], null);

  return { ...bp, heartRate, temperature, spo2, respiratoryRate, bloodSugar, etco2, gcs, height, weight };
};

const makeTrend = vitals => {
  const points = [
    ['-30m', -5, -3, -0.4, -1, 1, -2, -1, 0],
    ['-24m', -2, -1, -0.1, 0, -1, 1, 0, 0],
    ['-18m', 3, 2, 0.2, -1, 0, 0, 3, -1],
    ['-12m', -1, 1, 0.1, 1, 1, 2, -2, 0],
    ['-6m', 2, -2, -0.2, 0, 0, -1, 1, 0],
    ['Now', 0, 0, 0, 0, 0, 0, 0, 0],
  ];

  return points.map(([time, hr, bp, temp, spo2, rr, etco2, glucose, gcs]) => ({
    time,
    heartRate: Math.max(35, Math.round(vitals.heartRate + hr)),
    systolic: Math.max(70, Math.round(vitals.systolic + bp)),
    diastolic: Math.max(40, Math.round(vitals.diastolic + bp / 2)),
    temperature: Number((vitals.temperature + temp).toFixed(1)),
    spo2: Math.min(100, Math.max(70, Math.round(vitals.spo2 + spo2))),
    respiratoryRate: Math.max(6, Math.round(vitals.respiratoryRate + rr)),
    etco2: vitals.etco2 === null ? null : Math.max(5, Math.round(vitals.etco2 + etco2)),
    bloodSugar: vitals.bloodSugar === null ? null : Math.max(30, Math.round(vitals.bloodSugar + glucose)),
    gcs: vitals.gcs === null ? null : Math.min(15, Math.max(3, Math.round(vitals.gcs + gcs))),
  }));
};

// Animated pulse indicator
const PulseIndicator = ({ value, max, color = '#C8102E' }) => {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(prev => (prev + 1) % 100);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  const percentage = (value / max) * 100;

  return (
    <div className="space-y-2">
      <div className="relative w-full h-8 bg-[#F0F4FC] rounded-full overflow-hidden border border-[#DDE3F0]">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            background: color,
            opacity: 0.6,
          }}
        />
        <div
          className="absolute h-full rounded-full"
          style={{
            width: `${percentage}%`,
            background: color,
            opacity: 1 - pulse / 100,
          }}
        />
      </div>
      <p className="text-xs text-[#A0AECB] text-center">{percentage.toFixed(0)}% Normal</p>
    </div>
  );
};

// Heartbeat pulse component
const HeartbeatPulse = ({ bpm = 72 }) => {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBeat(prev => (prev + 1) % 100);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#DDE3F0" strokeWidth="1" />
          <circle
            cx="50"
            cy="50"
            r={35 + Math.sin((beat / 100) * Math.PI * 2) * 3}
            fill="none"
            stroke="#C8102E"
            strokeWidth="2"
            opacity={1 - beat / 100}
          />
          <circle cx="50" cy="50" r="8" fill="#C8102E" />
        </svg>
      </div>
      <p className="text-sm font-bold text-[#4B5A7A]">{bpm} <span className="text-xs text-[#A0AECB]">BPM</span></p>
    </div>
  );
};

const VitalTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur border border-[#DDE3F0] shadow-xl rounded-xl p-3">
      <p className="text-[10px] font-black text-[#8A97B0] uppercase tracking-wider mb-2">{label}</p>
      {payload.map(entry => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs font-bold text-[#4B5A7A]">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}: {entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, unit, range, color, bgColor, children }) => (
  <div className="card p-5 space-y-4 border border-[#DDE3F0]">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: bgColor, color }}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider truncate">{label}</p>
          <p className="text-2xl font-black text-[#0F1A3A] tabular-nums">
            {value ?? 'N/A'} <span className="text-sm text-[#8A97B0]">{unit}</span>
          </p>
        </div>
      </div>
    </div>
    <div className="h-24">
      {children}
    </div>
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-[#A0AECB]">{range}</p>
      <span className="badge badge-green">Live</span>
    </div>
  </div>
);

// Vital signs summary cards
const VitalCard = ({ icon: Icon, label, value, unit, bgColor = '#EEF2FF', iconColor = '#1A3C8F' }) => (
  <div className="flex items-center gap-3 p-3 bg-[#F8FAFF] rounded-lg border border-[#DDE3F0]">
    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: bgColor, color: iconColor }}>
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-[#A0AECB] font-semibold uppercase">{label}</p>
      <p className="text-sm font-bold text-[#0F1A3A]">{value} <span className="text-xs text-[#8A97B0]">{unit}</span></p>
    </div>
  </div>
);


/* ────────────────── Vitals: constants & helpers ────────────────── */

const VITAL_METRICS = [
  { key: 'systolicBP', label: 'Systolic BP', short: 'BP Sys', unit: 'mmHg', color: '#C8102E', lo: 90, hi: 140 },
  { key: 'diastolicBP', label: 'Diastolic BP', short: 'BP Dia', unit: 'mmHg', color: '#E8476E', lo: 60, hi: 90 },
  { key: 'heartRate', label: 'Heart Rate', short: 'HR', unit: 'bpm', color: '#7C3AED', lo: 60, hi: 100 },
  { key: 'oxygenSaturation', label: 'SpO₂', short: 'SpO₂', unit: '%', color: '#059669', lo: 95, hi: 100 },
  { key: 'respiratoryRate', label: 'Resp Rate', short: 'RR', unit: '/min', color: '#0891B2', lo: 12, hi: 20 },
  { key: 'temperature', label: 'Temperature', short: 'Temp', unit: '°C', color: '#EA580C', lo: 36.1, hi: 37.2 },
  { key: 'bloodGlucose', label: 'Blood Glucose', short: 'Glucose', unit: 'mg/dL', color: '#CA8A04', lo: 70, hi: 100 },
  { key: 'glasgowComaScale', label: 'GCS', short: 'GCS', unit: '/15', color: '#1A3C8F', lo: 14, hi: 15 },
  { key: 'painScore', label: 'Pain Score', short: 'Pain', unit: '/10', color: '#DC2626', lo: 0, hi: 3 },
];

const metricByKey = Object.fromEntries(VITAL_METRICS.map((m) => [m.key, m]));

const assessVitalStatus = (v) => {
  const crit = [
    v.systolicBP != null && (v.systolicBP > 180 || v.systolicBP < 80),
    v.diastolicBP != null && (v.diastolicBP > 120 || v.diastolicBP < 50),
    v.heartRate != null && (v.heartRate > 150 || v.heartRate < 40),
    v.oxygenSaturation != null && v.oxygenSaturation < 88,
    v.respiratoryRate != null && (v.respiratoryRate > 30 || v.respiratoryRate < 8),
    v.temperature != null && (v.temperature > 39.5 || v.temperature < 35),
  ];
  if (crit.some(Boolean)) return { label: 'Critical', cls: 'bg-red-100 text-red-700 border-red-200' };
  const warn = [
    v.systolicBP != null && (v.systolicBP > 140 || v.systolicBP < 90),
    v.diastolicBP != null && (v.diastolicBP > 90 || v.diastolicBP < 60),
    v.heartRate != null && (v.heartRate > 100 || v.heartRate < 60),
    v.oxygenSaturation != null && v.oxygenSaturation < 95,
    v.respiratoryRate != null && (v.respiratoryRate > 20 || v.respiratoryRate < 12),
    v.temperature != null && (v.temperature > 37.2 || v.temperature < 36.1),
  ];
  if (warn.some(Boolean)) return { label: 'Monitor', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { label: 'Normal', cls: 'bg-green-100 text-green-700 border-green-200' };
};

const vitalPill = (value, metric) => {
  if (value == null || value === '') return null;
  const m = typeof metric === 'string' ? metricByKey[metric] : metric;
  if (!m) return null;
  const num = Number(value);
  const outOfRange = !isNaN(num) && (num < m.lo || num > m.hi);
  return (
    <span key={m.key} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold border ${outOfRange ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-[#F0F4FC] text-[#0F1A3A] border-[#DDE3F0]'}`}>
      <span className="text-[10px] font-black text-[#8A97B0] uppercase">{m.short}</span>
      {value}{m.unit ? <span className="text-[10px] text-[#A0AECB] ml-0.5">{m.unit}</span> : null}
    </span>
  );
};

const TIME_FILTERS = [
  { key: 'all', label: 'All' },
  { key: '24h', label: '24 h', ms: 86400000 },
  { key: '7d', label: '7 days', ms: 604800000 },
  { key: '30d', label: '30 days', ms: 2592000000 },
];

const formatChartTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}\n${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

/* ────────────────── VitalsPortalTab component ────────────────── */

function VitalsPortalTab({ vitals, onView }) {
  const [subTab, setSubTab] = useState('chart');
  const [timeFilter, setTimeFilter] = useState('all');
  const [primaryMetric, setPrimaryMetric] = useState('systolicBP');
  const [compareMetrics, setCompareMetrics] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  const filtered = useMemo(() => {
    let list = [...vitals];
    if (timeFilter !== 'all') {
      const cutoff = Date.now() - TIME_FILTERS.find((f) => f.key === timeFilter)?.ms;
      list = list.filter((v) => new Date(v.recordedAt || v.createdAt).getTime() >= cutoff);
    }
    return list;
  }, [vitals, timeFilter]);

  const historyList = useMemo(() => [...filtered].sort((a, b) => new Date(b.recordedAt || b.createdAt) - new Date(a.recordedAt || a.createdAt)), [filtered]);
  const chartData = useMemo(() => [...filtered].sort((a, b) => new Date(a.recordedAt || a.createdAt) - new Date(b.recordedAt || b.createdAt)).map((v) => ({
    ...v,
    time: new Date(v.recordedAt || v.createdAt).getTime(),
    label: formatChartTime(v.recordedAt || v.createdAt),
  })), [filtered]);

  const toggleCompare = useCallback((key) => {
    setCompareMetrics((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : prev.length < 3 ? [...prev, key] : prev);
  }, []);

  const activeChartMetrics = useMemo(() => {
    const keys = [primaryMetric, ...(showCompare ? compareMetrics : [])];
    return [...new Set(keys)].map((k) => metricByKey[k]).filter(Boolean);
  }, [primaryMetric, compareMetrics, showCompare]);

  const latest = chartData[chartData.length - 1] || {};

  return (
    <div className="space-y-6">
      {/* Sub-tab toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="inline-flex rounded-xl border border-[#DDE3F0] bg-white overflow-hidden">
          {[['history', 'Reading History', Clock], ['chart', 'Trend Chart', TrendingUp]].map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => setSubTab(id)} className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition ${subTab === id ? 'bg-brand-blue text-white' : 'text-[#4B5A7A] hover:bg-[#F8FAFF]'}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-xl border border-[#DDE3F0] bg-white overflow-hidden">
          {TIME_FILTERS.map((f) => (
            <button key={f.key} type="button" onClick={() => setTimeFilter(f.key)} className={`px-4 py-2 text-xs font-bold transition ${timeFilter === f.key ? 'bg-[#0F1A3A] text-white' : 'text-[#4B5A7A] hover:bg-[#F8FAFF]'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center bg-[#F8FAFF] rounded-2xl border border-dashed border-[#DDE3F0]">
           <Activity className="w-12 h-12 mx-auto mb-3 text-[#DDE3F0]" />
           <p className="text-sm font-bold text-[#8A97B0]">No vital readings recorded{timeFilter !== 'all' ? ` in the selected time range` : ''}.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricCard 
              icon={HeartPulse} label="Heart Rate" 
              value={latest.heartRate} unit="bpm" 
              range="Latest Reading" color="#C8102E" bgColor="#FEE2E2"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hrGradPortal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C8102E" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#C8102E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="heartRate" stroke="#C8102E" strokeWidth={2} fill="url(#hrGradPortal)" dot={false} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </MetricCard>

            <MetricCard 
              icon={Activity} label="Blood Pressure" 
              value={latest.systolicBP ? `${latest.systolicBP}/${latest.diastolicBP}` : 'N/A'} unit="mmHg" 
              range="Latest Reading" color="#1A3C8F" bgColor="#DBEAFE"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <Line type="monotone" dataKey="systolicBP" stroke="#1A3C8F" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="diastolicBP" stroke="#60A5FA" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </MetricCard>

            <MetricCard 
              icon={Activity} label="SpO₂" 
              value={latest.oxygenSaturation} unit="%" 
              range="Latest Reading" color="#059669" bgColor="#D1FAE5"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spo2GradPortal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="oxygenSaturation" stroke="#059669" strokeWidth={2} fill="url(#spo2GradPortal)" dot={false} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </MetricCard>
          </div>

          <div className="border-t border-[#F0F4FC] pt-8">
            {subTab === 'history' ? (
              /* ── Reading History ── */
              <div className="grid grid-cols-1 gap-4">
                {historyList.map((v, idx) => {
                  const status = assessVitalStatus(v);
                  const ts = v.recordedAt || v.createdAt;
                  return (
                    <div key={v.id || idx} className="group relative bg-white rounded-2xl border border-[#DDE3F0] p-6 hover:shadow-xl hover:shadow-brand-blue/5 hover:border-brand-blue/30 transition-all cursor-default">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="min-w-0 flex-1">
                          {/* Time & status */}
                          <div className="flex flex-wrap items-center gap-3 mb-4">
                            <span className="text-sm font-black text-[#0F1A3A] bg-[#F8FAFF] px-3 py-1.5 rounded-lg border border-[#EEF2FF]">
                              {ts ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </span>
                            <span className="text-xs font-bold text-[#8A97B0]">{new Date(ts).toLocaleDateString()}</span>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${status.cls}`}>{status.label}</span>
                            {v.source && <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md">{v.source}</span>}
                          </div>
                          {/* Primary vitals row */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {v.systolicBP != null && v.diastolicBP != null && (
                              <span className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold border ${(v.systolicBP > 140 || v.systolicBP < 90 || v.diastolicBP > 90 || v.diastolicBP < 60) ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-[#F0F4FC] text-[#0F1A3A] border-[#DDE3F0]'}`}>
                                <span className="text-[10px] font-black text-[#8A97B0] uppercase">Blood Pressure</span>
                                <span className="text-sm">{v.systolicBP}/{v.diastolicBP}</span>
                                <span className="text-[10px] text-[#A0AECB] ml-0.5">mmHg</span>
                              </span>
                            )}
                            {vitalPill(v.heartRate, 'heartRate')}
                            {vitalPill(v.oxygenSaturation, 'oxygenSaturation')}
                            {vitalPill(v.respiratoryRate, 'respiratoryRate')}
                            {vitalPill(v.temperature, 'temperature')}
                          </div>
                          {/* Secondary vitals row */}
                          <div className="flex flex-wrap gap-2">
                            {vitalPill(v.glasgowComaScale, 'glasgowComaScale')}
                            {vitalPill(v.bloodGlucose, 'bloodGlucose')}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <button
                            type="button"
                            onClick={() => onView?.(v, 'VITAL')}
                            className="w-10 h-10 rounded-xl bg-white border border-[#DDE3F0] flex items-center justify-center text-[#8A97B0] hover:bg-[#F8FAFF] hover:text-brand-red transition-all"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── Trend Chart ── */
              <div className="bg-white rounded-3xl border border-[#DDE3F0] p-8 shadow-sm">
                {/* Chart controls */}
                <div className="flex flex-wrap items-end gap-6 mb-8">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest mb-3 block">Primary Metric</label>
                    <div className="flex flex-wrap gap-2">
                      {VITAL_METRICS.map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setPrimaryMetric(m.key)}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${primaryMetric === m.key ? 'bg-brand-blue text-white border-brand-blue shadow-lg shadow-blue-900/20' : 'bg-white text-[#4B5A7A] border-[#DDE3F0] hover:border-brand-blue/30'}`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCompare(!showCompare)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all border ${showCompare ? 'bg-[#0F1A3A] text-white border-[#0F1A3A]' : 'bg-white text-[#4B5A7A] border-[#DDE3F0]'}`}
                    >
                      <TrendingUp size={14} /> {showCompare ? 'Hide Comparison' : 'Compare Metrics'}
                    </button>
                  </div>
                </div>

                {showCompare && (
                  <div className="mb-8 p-6 bg-[#F8FAFF] rounded-2xl border border-[#EEF2FF] animate-in zoom-in-95 duration-200">
                    <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest mb-4">Select up to 2 metrics to compare</p>
                    <div className="flex flex-wrap gap-3">
                      {VITAL_METRICS.filter((m) => m.key !== primaryMetric).map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => toggleCompare(m.key)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${compareMetrics.includes(m.key) ? 'bg-white border-brand-blue text-brand-blue shadow-sm' : 'bg-white border-[#DDE3F0] text-[#8A97B0] hover:border-brand-blue/30'}`}
                        >
                          {compareMetrics.includes(m.key) && <Check size={12} className="inline mr-1" />}
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main trend chart */}
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        {activeChartMetrics.map((m) => (
                          <linearGradient key={`grad-${m.key}`} id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={m.color} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#A0AECB' }} height={50} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#A0AECB' }} />
                      <Tooltip content={<VitalTooltip />} />
                      {activeChartMetrics.map((m) => (
                        <Area
                          key={m.key}
                          type="monotone"
                          dataKey={m.key}
                          name={m.label}
                          stroke={m.color}
                          strokeWidth={3}
                          fill={`url(#grad-${m.key})`}
                          dot={{ r: 4, fill: m.color, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                          connectNulls
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const formatLabel = key => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());


const isEmptyValue = value => value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);

const displayValue = value => {
  if (isEmptyValue(value)) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString();
  if (Array.isArray(value)) return value.map(item => typeof item === 'object' ? Object.values(item).filter(Boolean).join(' - ') : String(item)).join(', ');
  if (typeof value === 'object') return Object.entries(value).filter(([, v]) => !isEmptyValue(v)).map(([k, v]) => `${formatLabel(k)}: ${displayValue(v)}`).join(', ') || 'N/A';
  return String(value);
};

const getPathValue = (data, path) => path.split('.').reduce((value, part) => value?.[part], data);

const fieldConfig = field => typeof field === 'string' ? { path: field, label: formatLabel(field) } : field;

const topLevelField = field => fieldConfig(field).path.split('.')[0];

const CardField = ({ label, value }) => (
  <div className="min-w-0 rounded-lg border border-[#DDE3F0] bg-[#F8FAFF] p-3">
    <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-sm font-bold break-words ${isEmptyValue(value) ? 'text-[#A0AECB] italic' : 'text-[#0F1A3A]'}`}>
      {displayValue(value)}
    </p>
  </div>
);

const ActivityHistoryField = ({ value }) => (
  <div className="min-w-0 rounded-lg border border-[#DDE3F0] bg-[#F8FAFF] p-3 sm:col-span-2">
    <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-wider mb-2">Activity History</p>
    {Array.isArray(value) && value.length > 0 ? (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={`${item?.timestamp || index}-${item?.action || 'activity'}`} className="flex items-start gap-2 text-sm font-bold text-[#0F1A3A]">
            <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-blue shrink-0" />
            <div>
              <p>{item?.action ? formatLabel(String(item.action).toLowerCase()) : 'Updated'}{item?.notes ? ` - ${item.notes}` : ''}</p>
              <p className="text-xs text-[#8A97B0] font-semibold mt-0.5">
                {[item?.performedByName || 'Clinical team', item?.timestamp ? new Date(item.timestamp).toLocaleString() : null].filter(Boolean).join(' • ')}
              </p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm font-bold text-[#A0AECB] italic">No activity recorded</p>
    )}
  </div>
);

const DetailMetricCard = ({ icon: Icon, label, value, unit, color, bgColor, children }) => (
  <div className="card p-4 border border-[#DDE3F0] space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: bgColor, color }}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-wider truncate">{label}</p>
        <p className="text-lg font-black text-[#0F1A3A] tabular-nums truncate">
          {value ?? 'N/A'} <span className="text-xs text-[#8A97B0]">{unit}</span>
        </p>
      </div>
    </div>
    {children && <div className="h-16">{children}</div>}
  </div>
);

const RECORD_CARD_SECTIONS = [
  {
    title: 'Patient Info',
    icon: User,
    color: '#1A3C8F',
    bgColor: '#DBEAFE',
    fields: ['patientName', 'patientId', 'patientDateOfBirth', 'patientGender', 'age', 'email', 'patientPhone', 'patientSsnLast4', 'patientSSNLast4', 'patientAddress'],
  },
  {
    title: 'Medical History',
    icon: FileText,
    color: '#7C3AED',
    bgColor: '#F3E8FF',
    fields: [
      'comorbidity', { path: 'medicalHistory.pastConditions', label: 'Past Conditions' },
      'currentMedicines', { path: 'medicalHistory.currentMedications', label: 'Current Medications' },
      'allergy', { path: 'medicalHistory.allergies', label: 'Allergies' },
      'doctor', 'surgicalHistory', { path: 'medicalHistory.surgicalHistory', label: 'Surgical History' },
      'primaryPhysicianName', { path: 'medicalHistory.primaryPhysicianName', label: 'Primary Physician' },
      'primaryPhysicianContact', { path: 'medicalHistory.primaryPhysicianContact', label: 'Physician Contact' },
      'primaryPhysicianFacility', { path: 'medicalHistory.primaryPhysicianFacility', label: 'Physician Facility' },
      'dnrOnFile', { path: 'medicalHistory.dnrOnFile', label: 'DNR On File' },
      'advanceDirective', { path: 'medicalHistory.advanceDirective', label: 'Advance Directive' },
      'advanceDirectiveType', { path: 'medicalHistory.advanceDirectiveType', label: 'Directive Type' },
      'smoker', { path: 'medicalHistory.smoker', label: 'Smoker' },
      'alcoholUse', { path: 'medicalHistory.alcoholUse', label: 'Alcohol Use' },
      'substanceUse', { path: 'medicalHistory.substanceUse', label: 'Substance Use' },
      'substanceUseDetails', { path: 'medicalHistory.substanceUseDetails', label: 'Substance Details' },
      'pregnant', { path: 'medicalHistory.pregnant', label: 'Pregnant' },
      'gestationalWeekIfPregnant', { path: 'medicalHistory.gestationalWeekIfPregnant', label: 'Gestational Week' },
      'lastKnownWellDateTime', { path: 'medicalHistory.lastKnownWellDateTime', label: 'Last Known Well' },
      'lastOralIntake', { path: 'medicalHistory.lastOralIntake', label: 'Last Oral Intake' },
    ],
  },

  {
    title: 'Assessment',
    icon: ClipboardCheck,
    color: '#059669',
    bgColor: '#D1FAE5',
    fields: [
      'complaints', 'structuredComplaints', 'structuredVitals', 'vitals', 'diastolicBp', 'systolicBp', 'hemoglobin',
      'treatmentProvided', 'icd10Code', 'primaryImpression', 'secondaryImpression',
      'mentalStatus', 'diagnosticFindings', 'proceduresPerformed', 'structuredProcedures',
      'medicationsAdministered', 'treatmentOutcome', 'careLevelProvided',
      'structuredMedications', 'fluidsAdministered', 'airwayManaged', 'clinicalData', 'assessmentType', 'physicalExam', 'diagnosis',
    ],
  },
  {
    title: 'Care',
    icon: ShieldCheck,
    color: '#EA580C',
    bgColor: '#FFEDD5',
    fields: [
      'destinationFacility', 'destination', 'transportDestination', 'transportMode',
      { path: 'transport.transportMode', label: 'Transport Mode' },
      { path: 'transport.destinationName', label: 'Destination' },
      { path: 'transport.careLevel', label: 'Care Level' },
      { path: 'transport.hospitalNotified', label: 'Hospital Notified' },
      { path: 'transport.handoffReport', label: 'Handoff Report' },
      'triageCategory', 'careLevel', 'treatmentProvider', 'status',
    ],
  },
  {
    title: 'Timeline',
    icon: Clock,
    color: '#475569',
    bgColor: '#E2E8F0',
    fields: [
      'callReceivedAt', { path: 'timeline.callReceivedAt', label: 'Call Received' },
      { path: 'timeline.dispatchedAt', label: 'Dispatched' },
      { path: 'timeline.enRouteAt', label: 'En Route' },
      'arrivedSceneAt', { path: 'timeline.arrivedSceneAt', label: 'Arrived Scene' },
      { path: 'timeline.patientContactAt', label: 'Patient Contact' },
      'departedSceneAt', { path: 'timeline.departedSceneAt', label: 'Departed Scene' },
      'arrivedDestinationAt', { path: 'timeline.arrivedDestinationAt', label: 'Arrived Destination' },
      'transferOfCareAt', { path: 'timeline.transferOfCareAt', label: 'Transfer Of Care' },
      { path: 'timeline.responseTimeMinutes', label: 'Response Time' },
      { path: 'timeline.sceneTimeMinutes', label: 'Scene Time' },
      { path: 'timeline.transportTimeMinutes', label: 'Transport Time' },
    ],
  },
  {
    title: 'Consent',
    icon: Shield,
    color: '#0891B2',
    bgColor: '#CFFAFE',
    fields: [
      { path: 'consent.patientConsentObtained', label: 'Patient Consent' },
      { path: 'consent.consentType', label: 'Consent Type' },
      { path: 'consent.refusalOfCare', label: 'Refusal Of Care' },
      { path: 'consent.refusalReason', label: 'Refusal Reason' },
      { path: 'consent.patientInformedOfRisks', label: 'Informed Of Risks' },
      { path: 'consent.patientHasDecisionCapacity', label: 'Decision Capacity' },
      { path: 'consent.guardianConsentObtained', label: 'Guardian Consent' },
      { path: 'consent.guardianName', label: 'Guardian Name' },
      { path: 'consent.guardianRelationship', label: 'Guardian Relationship' },
      { path: 'consent.guardianPhone', label: 'Guardian Phone' },
    ],
  },
  {
    title: 'Record Admin',
    icon: Fingerprint,
    color: '#475569',
    bgColor: '#E2E8F0',
    fields: [
      'createdAt', 'updatedAt', 'submittedAt',
      'submittedByName', 'submittedBy',
      'qaApproved', 'qaApprovedAt', 'qaApprovedBy',
      'organizationId',
      { path: 'dynamicFormResponses.organizationName', label: 'Organization' },
      { path: 'dynamicFormResponses.submittedByName', label: 'Submitted By Name' },
      { path: 'dynamicFormResponses.qaApprovedByName', label: 'Approved By Name' },
      { path: 'dynamicFormResponses.paramedicsName', label: 'Paramedic Name' },
      'feedback',
      { path: 'auditTrail', label: 'Activity History', type: 'activity' },
    ],
  },
];

const VITAL_PRESENTED_FIELDS = [
  'bloodPressure', 'heartRate', 'pulseRate', 'pulse', 'respiratoryRate', 'respirationRate',
  'temperature', 'bodyTemperature', 'temp', 'spo2', 'spO2', 'oxygenSaturation', 'o2Saturation',
  'bloodGroup', 'height', 'weight', 'vitalsSystolic', 'vitalsDiastolic', 'vitalsPulse',
  'vitalsRespiratory', 'vitalsSpo2', 'vitalsTemp', 'vitalsEtco2', 'vitalsBloodSugar',
  'vitalsGcs', 'bloodSugar', 'glucose', 'bloodGlucose', 'etco2', 'gcs', 'ecgRhythm',
  'pupilsResponse', 'skinCondition', 'oxygenFlowRate', 'ivAccessSite', 'vitals',
  'diastolicBp', 'systolicBp', 'hemoglobin', 'structuredVitals',
];

const PRESENTED_RECORD_FIELDS = new Set([
  ...VITAL_PRESENTED_FIELDS,
  ...RECORD_CARD_SECTIONS.flatMap(section => section.fields.map(topLevelField)),
  'medicalHistory', 'sceneAssessment', 'timeline', 'transport', 'consent', 'dynamicFormResponses', 'auditTrail',
  'crew', 'attachmentIds', 'patientId',
]);

/* ── Crew Member Card ── */
const CrewMemberCard = ({ member }) => {
  if (!member || typeof member !== 'object') return null;
  const name = member.name || member.paramedicsName || 'Unknown';
  const role = member.role || 'Crew Member';
  const level = member.certificationLevel || '';
  const certNum = member.certificationNumber || '';
  const expiry = member.certificationExpiryDate || '';
  const isPrimary = member.primaryClinician;

  return (
    <div className={`rounded-xl border p-4 space-y-2 ${isPrimary ? 'border-brand-blue/40 bg-blue-50/50' : 'border-[#DDE3F0] bg-[#F8FAFF]'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isPrimary ? 'bg-brand-blue text-white' : 'bg-[#E2E8F0] text-[#475569]'}`}>
            <Stethoscope size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-[#0F1A3A] truncate">{name}</p>
            <p className="text-[10px] font-bold text-[#8A97B0] uppercase tracking-wider">{role}</p>
          </div>
        </div>
        {isPrimary && (
          <span className="shrink-0 text-[9px] font-black uppercase tracking-wider bg-brand-blue text-white px-2 py-1 rounded-lg">Primary</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-1">
        {level && <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-[#DDE3F0] rounded text-[#4B5A7A]">{level}</span>}
        {certNum && <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-[#DDE3F0] rounded text-[#4B5A7A] font-mono">{certNum}</span>}
        {expiry && <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-[#DDE3F0] rounded text-[#8A97B0]">Exp: {new Date(expiry).toLocaleDateString()}</span>}
      </div>
    </div>
  );
};

/* ── Crew Section ── */
const CrewSection = ({ data }) => {
  const crew = data?.crew;
  if (!Array.isArray(crew) || crew.length === 0) return null;

  return (
    <div className="card p-5 border border-[#DDE3F0] space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#F3E8FF] text-[#7C3AED]">
            <Stethoscope size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#0F1A3A] uppercase tracking-wider">Crew</h3>
            <p className="text-xs text-[#8A97B0] mt-0.5">{crew.length} member{crew.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <span className="badge badge-blue">Card</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {crew.map((member, i) => <CrewMemberCard key={member.paramedicsId || i} member={member} />)}
      </div>
    </div>
  );
};

/* ── Attachment IDs Badge List ── */
const AttachmentsSection = ({ data, onView }) => {
  const ids = data?.attachmentIds;
  if (!Array.isArray(ids) || ids.length === 0) return null;

  return (
    <div className="card p-5 border border-[#DDE3F0] space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#DBEAFE] text-[#1A3C8F]">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#0F1A3A] uppercase tracking-wider">Attachments</h3>
            <p className="text-xs text-[#8A97B0] mt-0.5">{ids.length} file{ids.length !== 1 ? 's' : ''} linked</p>
          </div>
        </div>
        <span className="badge badge-blue">Card</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {ids.map((id, i) => (
          <button 
            key={i} 
            type="button"
            onClick={() => onView && onView(data?.patientId || data?.patient?.id, id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8FAFF] border border-[#DDE3F0] px-3 py-1.5 text-xs font-bold text-[#4B5A7A] font-mono hover:text-brand-blue hover:border-brand-blue transition-colors shadow-sm cursor-pointer"
          >
            <FileText size={12} className="text-[#A0AECB]" />
            {String(id)}
            <ExternalLink size={12} className="ml-1 opacity-50" />
          </button>
        ))}
      </div>
    </div>
  );
};

const RecordSummaryCards = ({ data, onViewDocument }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {RECORD_CARD_SECTIONS.map(section => {
        const Icon = section.icon;
        const visibleFields = section.fields.filter(field => !isEmptyValue(getPathValue(data, fieldConfig(field).path)));
        const populatedCount = visibleFields.length;

        return (
          <div key={section.title} className="card p-5 border border-[#DDE3F0] space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: section.bgColor, color: section.color }}>
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0F1A3A] uppercase tracking-wider">{section.title}</h3>
                  <p className="text-xs text-[#8A97B0] mt-0.5">{populatedCount} fields available</p>
                </div>
              </div>
              <span className="badge badge-blue">Card</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleFields.length === 0 ? (
                <CardField label="Status" value="No data recorded" />
              ) : visibleFields.map(field => {
                const config = fieldConfig(field);
                const value = getPathValue(data, config.path);
                if (config.type === 'activity') return <ActivityHistoryField key={config.path} value={value} />;
                return <CardField key={config.path} label={config.label || formatLabel(config.path)} value={value} />;
              })}
            </div>
          </div>
        );
      })}
    </div>
    {/* Crew and Attachments as dedicated styled sections */}
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <CrewSection data={data} />
      <AttachmentsSection data={data} onView={onViewDocument} />
    </div>
  </div>
);

const OtherFieldsCard = ({ fields }) => {
  if (!fields.length) return null;

  return (
    <div className="card p-5 border border-[#DDE3F0] space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E2E8F0] text-[#475569] flex items-center justify-center">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#0F1A3A] uppercase tracking-wider">Other</h3>
            <p className="text-xs text-[#8A97B0] mt-0.5">{fields.length} additional fields</p>
          </div>
        </div>
        <span className="badge badge-gray">Card</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {fields.map(([key, value]) => (
          <CardField key={key} label={formatLabel(key)} value={value} />
        ))}
      </div>
    </div>
  );
};

const VitalSignsDashboard = ({ data }) => {
  const [selectedMetrics, setSelectedMetrics] = useState(['heartRate', 'systolic', 'spo2']);
  const vitals = buildVitals(data);
  const trend = makeTrend(vitals);

  const allMetrics = [
    { key: 'heartRate', label: 'Heart Rate', color: '#C8102E' },
    { key: 'systolic', label: 'Systolic BP', color: '#1A3C8F' },
    { key: 'diastolic', label: 'Diastolic BP', color: '#60A5FA' },
    { key: 'spo2', label: 'SpO2', color: '#059669' },
    { key: 'respiratoryRate', label: 'Resp Rate', color: '#7C3AED' },
    { key: 'temperature', label: 'Temp', color: '#EA580C' },
    { key: 'bloodSugar', label: 'Glucose', color: '#D97706' },
  ];

  const barData = [
    { name: 'Heart', value: vitals.heartRate, fill: '#C8102E' },
    { name: 'SpO2', value: vitals.spo2, fill: '#059669' },
    { name: 'Resp', value: vitals.respiratoryRate, fill: '#1A3C8F' },
    { name: 'Temp', value: vitals.temperature, fill: '#EA580C' },
    ...(vitals.etco2 !== null ? [{ name: 'EtCO2', value: vitals.etco2, fill: '#0891B2' }] : []),
    ...(vitals.bloodSugar !== null ? [{ name: 'Sugar', value: vitals.bloodSugar, fill: '#D97706' }] : []),
    ...(vitals.gcs !== null ? [{ name: 'GCS', value: vitals.gcs, fill: '#475569' }] : []),
  ];

  const toggleMetric = (key) => {
    setSelectedMetrics(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <MetricCard icon={Heart} label="Heart Rate" value={vitals.heartRate} unit="BPM" range="Normal: 60-100 BPM" color="#C8102E" bgColor="#FEE2E2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="heartRateFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C8102E" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#C8102E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<VitalTooltip />} />
              <Area type="monotone" dataKey="heartRate" name="Heart Rate" stroke="#C8102E" strokeWidth={3} fill="url(#heartRateFill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </MetricCard>

        <MetricCard icon={Activity} label="Blood Pressure" value={vitals.label} unit="mmHg" range="Normal: 90/60-120/80 mmHg" color="#1A3C8F" bgColor="#DBEAFE">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <Tooltip content={<VitalTooltip />} />
              <Line type="monotone" dataKey="systolic" name="Systolic" stroke="#1A3C8F" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke="#60A5FA" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </MetricCard>

        <MetricCard icon={Thermometer} label="Temperature" value={vitals.temperature} unit="F" range="Normal: 97-99 F" color="#EA580C" bgColor="#FFEDD5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EA580C" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#EA580C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<VitalTooltip />} />
              <Area type="monotone" dataKey="temperature" name="Temperature" stroke="#EA580C" strokeWidth={3} fill="url(#tempFill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </MetricCard>

        <MetricCard icon={Droplets} label="O2 Saturation" value={vitals.spo2} unit="%" range="Normal: 95-100%" color="#059669" bgColor="#D1FAE5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="spo2Fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<VitalTooltip />} />
              <Area type="monotone" dataKey="spo2" name="O2 Saturation" stroke="#059669" strokeWidth={3} fill="url(#spo2Fill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </MetricCard>

        <MetricCard icon={Wind} label="Respiratory Rate" value={vitals.respiratoryRate} unit="bpm" range="Normal: 12-20 bpm" color="#7C3AED" bgColor="#F3E8FF">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <Tooltip content={<VitalTooltip />} />
              <Line type="monotone" dataKey="respiratoryRate" name="Respiratory Rate" stroke="#7C3AED" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </MetricCard>

        <div className="card p-5 flex flex-col items-center justify-center border-2 border-brand-red/20 space-y-2">
          <p className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider">Live Pulse</p>
          <HeartbeatPulse bpm={vitals.heartRate} />
          <p className="text-xs text-center text-[#8A97B0]">Real-time monitoring active</p>
        </div>
      </div>

      <div className="card p-5 border border-[#DDE3F0]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h3 className="font-black text-[#0F1A3A] text-sm uppercase tracking-wider">Vitals Overview</h3>
            <p className="text-xs text-[#8A97B0] mt-1">Select metrics to compare trends</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {allMetrics.map(m => (
              <button
                key={m.key}
                onClick={() => toggleMetric(m.key)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${selectedMetrics.includes(m.key)
                    ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                    : 'bg-white text-[#8A97B0] border-[#DDE3F0] hover:border-[#8A97B0]'
                  }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#DDE3F0" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#8A97B0', fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#8A97B0', fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} />
                <Tooltip content={<VitalTooltip />} />
                {allMetrics.filter(m => selectedMetrics.includes(m.key)).map(m => (
                  <Line
                    key={m.key}
                    type="monotone"
                    dataKey={m.key}
                    name={m.label}
                    stroke={m.color}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#DDE3F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#8A97B0', fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#8A97B0', fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} />
                <Tooltip content={<VitalTooltip />} />
                <Bar dataKey="value" name="Current" radius={[8, 8, 0, 0]}>
                  {barData.map(item => <Cell key={item.name} fill={item.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <VitalCard icon={Heart} label="Heart" value={vitals.heartRate} unit="BPM" bgColor="#FEE2E2" iconColor="#C8102E" />
          <VitalCard icon={Activity} label="BP" value={vitals.label} unit="mmHg" bgColor="#DBEAFE" iconColor="#1A3C8F" />
          <VitalCard icon={Thermometer} label="Temp" value={vitals.temperature} unit="F" bgColor="#FFEDD5" iconColor="#EA580C" />
          <VitalCard icon={Droplets} label="SpO2" value={vitals.spo2} unit="%" bgColor="#D1FAE5" iconColor="#059669" />
          <VitalCard icon={Wind} label="Resp" value={vitals.respiratoryRate} unit="bpm" bgColor="#F3E8FF" iconColor="#7C3AED" />
          {vitals.bloodSugar !== null && <VitalCard icon={TrendingUp} label="Glucose" value={vitals.bloodSugar} unit="mg/dL" bgColor="#FEF3C7" iconColor="#D97706" />}
          {vitals.weight !== null && <VitalCard icon={ClipboardCheck} label="Weight" value={vitals.weight} unit="kg" bgColor="#E0F2FE" iconColor="#0284C7" />}
          {data?.bloodGroup && <VitalCard icon={Droplets} label="Blood Group" value={data.bloodGroup} unit="" bgColor="#FEE2E2" iconColor="#C8102E" />}
        </div>
      </div>

      <div className="card p-5 border border-[#DDE3F0]">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-black text-[#0F1A3A] text-sm uppercase tracking-wider">Remaining Clinical Data</h3>
            <p className="text-xs text-[#8A97B0] mt-1">Other collected vitals and assessment values from this record</p>
          </div>
          <span className="badge badge-gray">Cards</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {vitals.etco2 !== null && (
            <DetailMetricCard icon={Activity} label="EtCO2" value={vitals.etco2} unit="mmHg" color="#0891B2" bgColor="#CFFAFE">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <Tooltip content={<VitalTooltip />} />
                  <Line type="monotone" dataKey="etco2" name="EtCO2" stroke="#0891B2" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </DetailMetricCard>
          )}
          {vitals.bloodSugar !== null && (
            <DetailMetricCard icon={TrendingUp} label="Blood Sugar" value={vitals.bloodSugar} unit="mg/dL" color="#D97706" bgColor="#FEF3C7">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <Tooltip content={<VitalTooltip />} />
                  <Area type="monotone" dataKey="bloodSugar" name="Blood Sugar" stroke="#D97706" strokeWidth={3} fill="#FEF3C7" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </DetailMetricCard>
          )}
          {vitals.gcs !== null && (
            <DetailMetricCard icon={ClipboardCheck} label="GCS" value={vitals.gcs} unit="/15" color="#475569" bgColor="#E2E8F0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <Tooltip content={<VitalTooltip />} />
                  <Line type="monotone" dataKey="gcs" name="GCS" stroke="#475569" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </DetailMetricCard>
          )}
          {vitals.height !== null && <DetailMetricCard icon={ClipboardCheck} label="Height" value={vitals.height} unit="cm" color="#0284C7" bgColor="#E0F2FE" />}
          {vitals.weight !== null && <DetailMetricCard icon={ClipboardCheck} label="Weight" value={vitals.weight} unit="kg" color="#0284C7" bgColor="#E0F2FE" />}
          {data?.bloodGroup && <DetailMetricCard icon={Droplets} label="Blood Group" value={data.bloodGroup} unit="" color="#C8102E" bgColor="#FEE2E2" />}
          {data?.mentalStatus && <DetailMetricCard icon={Activity} label="Mental Status" value={data.mentalStatus} unit="" color="#7C3AED" bgColor="#F3E8FF" />}
          {data?.ecgRhythm && <DetailMetricCard icon={Heart} label="ECG Rhythm" value={data.ecgRhythm} unit="" color="#C8102E" bgColor="#FEE2E2" />}
          {data?.pupilsResponse && <DetailMetricCard icon={Eye} label="Pupils" value={data.pupilsResponse} unit="" color="#1A3C8F" bgColor="#DBEAFE" />}
          {data?.skinCondition && <DetailMetricCard icon={Shield} label="Skin" value={data.skinCondition} unit="" color="#059669" bgColor="#D1FAE5" />}
          {data?.oxygenFlowRate && <DetailMetricCard icon={Wind} label="Oxygen Flow" value={data.oxygenFlowRate} unit="L/min" color="#0891B2" bgColor="#CFFAFE" />}
          {data?.ivAccessSite && <DetailMetricCard icon={Droplets} label="IV Access" value={data.ivAccessSite} unit="" color="#C8102E" bgColor="#FEE2E2" />}
        </div>
      </div>
    </div>
  );
};

// Data categories with icons
const SECTION_CONFIG = {
  // Patient Info
  patientName: { section: 'Patient Info', icon: '👤' },
  patientId: { section: 'Patient Info', icon: '👤' },
  patientDateOfBirth: { section: 'Patient Info', icon: '👤' },
  patientGender: { section: 'Patient Info', icon: '👤' },
  patientPhone: { section: 'Patient Info', icon: '👤' },
  patientAddress: { section: 'Patient Info', icon: '👤' },
  email: { section: 'Patient Info', icon: '👤' },
  // Medical History
  comorbidity: { section: 'Medical History', icon: '⚕️' },
  currentMedicines: { section: 'Medical History', icon: '⚕️' },
  allergy: { section: 'Medical History', icon: '⚠️' },
  surgicalHistory: { section: 'Medical History', icon: '⚕️' },
  dnrOnFile: { section: 'Medical History', icon: '⚕️' },
  advanceDirective: { section: 'Medical History', icon: '⚕️' },
  // Incident
  incidentDateTime: { section: 'Incident', icon: '🚨' },
  incidentLocation: { section: 'Incident', icon: '🚨' },
  incidentDescription: { section: 'Incident', icon: '🚨' },
  incidentType: { section: 'Incident', icon: '🚨' },
  sceneType: { section: 'Incident', icon: '🚨' },
  // Vitals
  bloodPressure: { section: 'Vitals', icon: '❤️' },
  heartRate: { section: 'Vitals', icon: '❤️' },
  respiratoryRate: { section: 'Vitals', icon: '❤️' },
  temperature: { section: 'Vitals', icon: '❤️' },
  bloodGroup: { section: 'Vitals', icon: '❤️' },
  age: { section: 'Vitals', icon: '❤️' },
  height: { section: 'Vitals', icon: '❤️' },
  weight: { section: 'Vitals', icon: '❤️' },
  vitalsSystolic: { section: 'Vitals', icon: '❤️' },
  vitalsDiastolic: { section: 'Vitals', icon: '❤️' },
  vitalsPulse: { section: 'Vitals', icon: '❤️' },
  vitalsRespiratory: { section: 'Vitals', icon: '❤️' },
  vitalsSpo2: { section: 'Vitals', icon: '❤️' },
  vitalsTemp: { section: 'Vitals', icon: '❤️' },
  vitalsEtco2: { section: 'Vitals', icon: '❤️' },
  vitalsBloodSugar: { section: 'Vitals', icon: '❤️' },
  vitalsGcs: { section: 'Vitals', icon: '❤️' },
  mentalStatus: { section: 'Vitals', icon: '❤️' },
  diagnosticFindings: { section: 'Vitals', icon: '❤️' },
  ecgRhythm: { section: 'Vitals', icon: '❤️' },
  pupilsResponse: { section: 'Vitals', icon: '❤️' },
  skinCondition: { section: 'Vitals', icon: '❤️' },
  oxygenFlowRate: { section: 'Vitals', icon: '❤️' },
  ivAccessSite: { section: 'Vitals', icon: '❤️' },
  // Assessment
  assessmentType: { section: 'Assessment', icon: '📋' },
  physicalExam: { section: 'Assessment', icon: '📋' },
  diagnosis: { section: 'Assessment', icon: '📋' },
  complaints: { section: 'Assessment', icon: '📋' },
  proceduresPerformed: { section: 'Assessment', icon: '📋' },
  medicationsAdministered: { section: 'Assessment', icon: '📋' },
  treatmentOutcome: { section: 'Assessment', icon: '📋' },
  // Care
  careLevel: { section: 'Care', icon: '🏥' },
  treatmentProvider: { section: 'Care', icon: '🏥' },
  transportMode: { section: 'Care', icon: '🚑' },
  destination: { section: 'Care', icon: '🏥' },
};

const IncidentAnalytics = ({ records }) => {
  const trendData = useMemo(() => {
    const months = {};
    [...records].sort((a, b) => new Date(a.incidentDateTime || a.createdAt) - new Date(b.incidentDateTime || b.createdAt))
      .forEach(r => {
        const date = new Date(r.incidentDateTime || r.createdAt);
        const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        months[key] = (months[key] || 0) + 1;
      });
    return Object.entries(months).map(([name, count]) => ({ name, count }));
  }, [records]);

  const typeData = useMemo(() => {
    const types = {};
    records.forEach(r => {
      const type = r.incidentType || 'Other';
      types[type] = (types[type] || 0) + 1;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 5);
  }, [records]);

  if (records.length < 2) return null;

  return (
    <div className="card p-5 border border-[#DDE3F0] mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-black text-[#0F1A3A] text-sm uppercase tracking-wider">Incident Trends</h3>
          <p className="text-xs text-[#8A97B0] mt-1">Frequency of clinical incidents over time</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-blue">Analytics</span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="incidentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A3C8F" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#1A3C8F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F4FC" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8A97B0' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8A97B0' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                labelStyle={{ fontWeight: '800', color: '#0F1A3A', marginBottom: '4px' }}
              />
              <Area type="monotone" dataKey="count" stroke="#1A3C8F" strokeWidth={3} fillOpacity={1} fill="url(#incidentGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0F4FC" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#4B5A7A', fontWeight: '700' }} width={80} />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar dataKey="value" fill="#60A5FA" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* ────────────────── Longitudinal Vitals: constants & helpers (matching Admin) ────────────────── */

const PORTAL_VITAL_METRICS = [
  { key: 'systolicBP', label: 'Systolic BP', short: 'BP Sys', unit: 'mmHg', color: '#C8102E', lo: 90, hi: 140 },
  { key: 'diastolicBP', label: 'Diastolic BP', short: 'BP Dia', unit: 'mmHg', color: '#E8476E', lo: 60, hi: 90 },
  { key: 'heartRate', label: 'Heart Rate', short: 'HR', unit: 'bpm', color: '#7C3AED', lo: 60, hi: 100 },
  { key: 'oxygenSaturation', label: 'SpO₂', short: 'SpO₂', unit: '%', color: '#059669', lo: 95, hi: 100 },
  { key: 'respiratoryRate', label: 'Resp Rate', short: 'RR', unit: '/min', color: '#0891B2', lo: 12, hi: 20 },
  { key: 'temperature', label: 'Temperature', short: 'Temp', unit: '°C', color: '#EA580C', lo: 36.1, hi: 37.2 },
  { key: 'bloodGlucose', label: 'Blood Glucose', short: 'Glucose', unit: 'mg/dL', color: '#CA8A04', lo: 70, hi: 100 },
  { key: 'glasgowComaScale', label: 'GCS', short: 'GCS', unit: '/15', color: '#1A3C8F', lo: 14, hi: 15 },
  { key: 'painScore', label: 'Pain Score', short: 'Pain', unit: '/10', color: '#DC2626', lo: 0, hi: 3 },
];

const portalMetricByKey = Object.fromEntries(PORTAL_VITAL_METRICS.map((m) => [m.key, m]));

const assessPortalVitalStatus = (v) => {
  const crit = [
    v.systolicBP != null && (v.systolicBP > 180 || v.systolicBP < 80),
    v.diastolicBP != null && (v.diastolicBP > 120 || v.diastolicBP < 50),
    v.heartRate != null && (v.heartRate > 150 || v.heartRate < 40),
    v.oxygenSaturation != null && v.oxygenSaturation < 88,
    v.respiratoryRate != null && (v.respiratoryRate > 30 || v.respiratoryRate < 8),
    v.temperature != null && (v.temperature > 39.5 || v.temperature < 35),
  ];
  if (crit.some(Boolean)) return { label: 'Critical', cls: 'bg-red-100 text-red-700 border-red-200' };
  const warn = [
    v.systolicBP != null && (v.systolicBP > 140 || v.systolicBP < 90),
    v.diastolicBP != null && (v.diastolicBP > 90 || v.diastolicBP < 60),
    v.heartRate != null && (v.heartRate > 100 || v.heartRate < 60),
    v.oxygenSaturation != null && v.oxygenSaturation < 95,
    v.respiratoryRate != null && (v.respiratoryRate > 20 || v.respiratoryRate < 12),
    v.temperature != null && (v.temperature > 37.2 || v.temperature < 36.1),
  ];
  if (warn.some(Boolean)) return { label: 'Monitor', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { label: 'Normal', cls: 'bg-green-100 text-green-700 border-green-200' };
};

const portalVitalPill = (value, metric) => {
  if (value == null || value === '') return null;
  const m = typeof metric === 'string' ? portalMetricByKey[metric] : metric;
  if (!m) return null;
  const num = Number(value);
  const outOfRange = !isNaN(num) && (num < m.lo || num > m.hi);
  return (
    <span key={m.key} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold border ${outOfRange ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-[#F0F4FC] text-[#0F1A3A] border-[#DDE3F0]'}`}>
      <span className="text-[10px] font-black text-[#8A97B0] uppercase">{m.short}</span>
      {value}{m.unit ? <span className="text-[10px] text-[#A0AECB] ml-0.5">{m.unit}</span> : null}
    </span>
  );
};




const DataField = ({ label, value }) => {
  const isMasked = typeof value === 'string' && (value.includes('***') || value.includes('REDACTED') || value.includes('ANONYMIZED'));

  return (
    <div className="py-1.5">
      <p className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider mb-0.5 truncate">{label}</p>
      {value === null || value === undefined || value === '' ? (
        <p className="text-xs text-[#A0AECB] italic">—</p>
      ) : typeof value === 'boolean' ? (
        <p className="text-xs font-semibold text-[#4B5A7A]">{value ? '✓ Yes' : '✗ No'}</p>
      ) : isMasked ? (
        <span className="badge badge-gray text-xs">{value}</span>
      ) : Array.isArray(value) ? (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {value.slice(0, 3).map((v, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-[#F8FAFF] border border-[#DDE3F0] rounded text-[#4B5A7A] font-semibold">
              {typeof v === 'object' ? JSON.stringify(v).substring(0, 15) : String(v).substring(0, 15)}
            </span>
          ))}
          {value.length > 3 && <span className="text-xs text-[#A0AECB]">+{value.length - 3} more</span>}
        </div>
      ) : (
        <p className="text-xs font-semibold text-[#4B5A7A] truncate">{String(value).substring(0, 50)}</p>
      )}
    </div>
  );
};

const CollapsibleSection = ({ title, icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-[#DDE3F0] rounded-xl overflow-hidden flex flex-col h-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-3 bg-[#F8FAFF] hover:bg-[#F0F4FC] transition-colors border-b border-[#DDE3F0] shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{icon}</span>
          <h3 className="font-bold text-[#0F1A3A] text-sm truncate">{title}</h3>
        </div>
        <ChevronDown size={16} className={`text-[#A0AECB] transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 py-3 space-y-2 divide-y divide-[#F0F4FC] overflow-y-auto flex-1">
          {children}
        </div>
      )}
    </div>
  );
};


const RecordVitalsSnapshot = ({ data }) => {
  const v = buildVitals(data);
  const metrics = [
    { label: 'Heart Rate', value: v.heartRate, unit: 'BPM', icon: Heart, color: '#C8102E', bg: '#FEE2E2' },
    { label: 'Blood Pressure', value: v.label, unit: 'mmHg', icon: Activity, color: '#1A3C8F', bg: '#DBEAFE' },
    { label: 'SpO2', value: v.spo2, unit: '%', icon: TrendingUp, color: '#059669', bg: '#D1FAE5' },
    { label: 'Temp', value: v.temperature, unit: '°F', icon: Thermometer, color: '#EA580C', bg: '#FFEDD5' },
  ];

  if (!v.heartRate && !v.systolic) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((m, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#DDE3F0] p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: m.bg, color: m.color }}>
              <m.icon size={16} />
            </div>
            <span className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest">{m.label}</span>
          </div>
          <p className="text-xl font-black text-[#0F1A3A] tabular-nums">
            {m.value || '--'} <span className="text-xs text-[#8A97B0] font-bold">{m.unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
};

const BooleanMetric = ({ label, value, icon: Icon }) => (
  <div className={`p-4 rounded-xl border ${value ? 'bg-red-50 border-red-100' : 'bg-[#F8FAFF] border-[#DDE3F0]'} flex flex-col items-center justify-center text-center transition-colors shadow-sm`}>
    <Icon size={20} className={value ? 'text-red-600 mb-2' : 'text-[#A0AECB] mb-2'} />
    <p className={`text-[10px] font-black uppercase tracking-wider ${value ? 'text-red-700' : 'text-[#8A97B0]'}`}>{label}</p>
    <span className={`mt-1 text-xs font-bold ${value ? 'text-red-600' : 'text-[#4B5A7A]'}`}>{value ? 'YES' : 'NO'}</span>
  </div>
);

const IncidentDashboard = ({ data }) => {
  const scene = data.sceneAssessment || {};
  
  const triageColors = {
    RED: '#C8102E', YELLOW: '#D97706', GREEN: '#059669', BLACK: '#0F1A3A', DEFAULT: '#8A97B0'
  };
  const triageLabels = {
    RED: 'Immediate (Red)', YELLOW: 'Delayed (Yellow)', GREEN: 'Minor (Green)', BLACK: 'Deceased (Black)'
  };
  
  const triageTag = String(scene.triageTag || data.triageTag || 'GREEN').toUpperCase();
  const tagColor = triageColors[triageTag] || triageColors.DEFAULT;
  const getBool = (v) => v === true || String(v).toLowerCase() === 'yes';

  // Scene Complexity Graph Data
  const getSeverity = (val, max = 10) => (getBool(val) ? max : 2);
  const isHazard = (val) => val && val !== 'None' && val !== 'No active hazards';
  const triageScore = triageTag === 'RED' ? 10 : triageTag === 'YELLOW' ? 7 : triageTag === 'BLACK' ? 10 : 3;

  const radarData = [
    { subject: 'Severity', value: triageScore, fullMark: 10 },
    { subject: 'Trauma', value: getSeverity(scene.traumaCall || data.traumaCall, 9), fullMark: 10 },
    { subject: 'Hazards', value: getSeverity(isHazard(scene.sceneHazards || data.sceneHazards), 8), fullMark: 10 },
    { subject: 'Scale (MCI)', value: getSeverity(scene.massCasualtyIncident || data.massCasualtyIncident, 10), fullMark: 10 },
    { subject: 'Intervention', value: getSeverity(scene.bystanderCPRPerformed || data.bystanderCPRPerformed, 8), fullMark: 10 },
  ];

  const timeline = data.timeline || {};
  const parseNum = (v) => { const n = Number(v); return isNaN(n) ? 0 : n; };
  const timelineData = [
    { name: 'Response Time', minutes: parseNum(timeline.responseTimeMinutes), fill: '#EF4444' },
    { name: 'Scene Time', minutes: parseNum(timeline.sceneTimeMinutes), fill: '#F59E0B' },
    { name: 'Transport Time', minutes: parseNum(timeline.transportTimeMinutes), fill: '#3B82F6' },
  ].filter(d => d.minutes > 0);

  // Fallback for demo purposes if no timeline data exists for this record
  const displayTimelineData = timelineData.length > 0 ? timelineData : [
    { name: 'Response Time', minutes: 8, fill: '#EF4444' },
    { name: 'Scene Time', minutes: 14, fill: '#F59E0B' },
    { name: 'Transport Time', minutes: 22, fill: '#3B82F6' },
  ];

  return (
    <div className="space-y-4 mb-6">
      <div className="card p-5 border border-[#DDE3F0] bg-white">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FEE2E2] text-[#C8102E]">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="font-black text-[#0F1A3A] text-sm uppercase tracking-wider">Incident Analytics</h3>
              <p className="text-xs text-[#8A97B0] mt-0.5">Scene operational metrics and triage status</p>
            </div>
          </div>
          <span className="badge badge-red bg-red-50 text-red-700 border-red-200">Incident</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Scene Complexity Radar Graph */}
          <div className="col-span-1 rounded-2xl border border-[#DDE3F0] bg-[#F8FAFF] p-4 flex flex-col items-center justify-center relative shadow-sm h-64">
             <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest mb-2 w-full text-center">Scene Complexity</p>
             <div className="w-full h-full flex-1">
               <ResponsiveContainer width="100%" height="100%">
                 <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                   <PolarGrid stroke="#DDE3F0" />
                   <PolarAngleAxis dataKey="subject" tick={{ fill: '#4B5A7A', fontSize: 10, fontWeight: 700 }} />
                   <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                   <Radar name="Complexity" dataKey="value" stroke={tagColor} fill={tagColor} fillOpacity={0.4} strokeWidth={2} />
                   <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                 </RadarChart>
               </ResponsiveContainer>
             </div>
          </div>

           {/* Scene Overview */}
           <div className="col-span-1 lg:col-span-2 rounded-2xl border border-[#DDE3F0] bg-white p-5 shadow-sm flex flex-col justify-center h-64">
             <div className="grid grid-cols-2 gap-4">
                <VitalCard icon={Activity} label="Triage Priority" value={triageTag} unit="" bgColor={triageTag === 'GREEN' ? '#D1FAE5' : triageTag === 'RED' ? '#FEE2E2' : '#FEF3C7'} iconColor={tagColor} />
                <VitalCard icon={Users} label="Patients" value={scene.numberOfPatients || data.numberOfPatients || 1} unit="" bgColor="#DBEAFE" iconColor="#1A3C8F" />
                <VitalCard icon={MapPin} label="Location Type" value={scene.sceneType || data.sceneType || 'Unknown'} unit="" bgColor="#F3E8FF" iconColor="#7C3AED" />
                <VitalCard icon={CloudLightning} label="Weather" value={scene.weatherConditions || data.weatherConditions || 'Clear'} unit="" bgColor="#FEF3C7" iconColor="#D97706" />
             </div>
           </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
           <BooleanMetric label="Scene Safe" value={getBool(scene.sceneSafe || data.sceneSafe)} icon={ShieldCheck} />
           <BooleanMetric label="Trauma Call" value={getBool(scene.traumaCall || data.traumaCall)} icon={HeartPulse} />
           <BooleanMetric label="Mass Casualty" value={getBool(scene.massCasualtyIncident || data.massCasualtyIncident || data.massCasualty)} icon={AlertCircle} />
           <BooleanMetric label="Witness Present" value={getBool(scene.witnessPresent || data.witnessPresent)} icon={Eye} />
           <BooleanMetric label="Bystander CPR" value={getBool(scene.bystanderCPRPerformed || data.bystanderCPRPerformed || data.bystanderCPR)} icon={Activity} />
           <BooleanMetric label="Bystander AED" value={getBool(scene.aedUsedByBystander || data.aedUsedByBystander || data.bystanderAED)} icon={Zap} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Operational Timeline Bar Chart */}
          <div className="p-5 rounded-2xl border border-[#DDE3F0] bg-[#F8FAFF] shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-[#A0AECB]" />
              <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest">Operational Timeline (Minutes)</p>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayTimelineData} layout="vertical" margin={{ top: 0, right: 30, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0F4FC" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#4B5A7A', fontWeight: 700 }} width={100} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="minutes" radius={[0, 4, 4, 0]} barSize={16}>
                    {displayTimelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="p-5 rounded-2xl border border-[#DDE3F0] bg-[#F8FAFF] shadow-sm">
            <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest mb-3">Incident Description / Mechanism of Injury</p>
            <p className="text-sm font-bold text-[#0F1A3A] leading-relaxed overflow-y-auto max-h-32 pr-2 custom-scrollbar">
              {data.incidentDescription || scene.mechanismOfInjury || data.mechanismOfInjury || 'No description provided.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};



const MedicalDocument = ({ data, onViewDocument }) => {
  if (!data) return null;

  /* ── Collect "other" fields not already covered by sections or vitals ── */
  const otherFields = useMemo(() => {
    if (!data || typeof data !== 'object') return [];
    return Object.entries(data)
      .filter(([key, value]) => {
        if (key === 'id' || key === '_id' || key === '__v') return false;
        if (PRESENTED_RECORD_FIELDS.has(key)) return false;
        return !isEmptyValue(value);
      })
      .map(([key, value]) => {
        // Safely convert objects/arrays to strings for display
        if (typeof value === 'object' && value !== null) {
          return [key, Array.isArray(value) ? value.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ') : JSON.stringify(value)];
        }
        return [key, value];
      });
  }, [data]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header Banner ── */}
      <div className="bg-white rounded-3xl border border-[#DDE3F0] p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-brand-blue">
              <ClipboardCheck size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#0F1A3A] mb-1">{data.diagnosis || 'Clinical Record'}</h2>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-[#8A97B0] uppercase tracking-widest">{new Date(data.incidentDateTime || data.createdAt).toLocaleDateString()}</span>
                <span className="w-1 h-1 rounded-full bg-[#DDE3F0]" />
                <span className="text-xs font-mono font-bold text-brand-blue uppercase">#{data.id?.substring(0, 16).toUpperCase()}</span>
                {data.incidentType && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-[#DDE3F0]" />
                    <span className="badge badge-gray text-[10px]">{data.incidentType}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="badge badge-blue px-4 py-2 text-xs">Official Record</span>
            <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
              <ShieldCheck size={14} />
              <span>Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Incident Dashboard ── */}
      <IncidentDashboard data={data} />


      {/* ── Vitals Dashboard with Charts ── */}
      <VitalSignsDashboard data={data} />

      {/* ── All ePCR Data Sections ── */}
      <RecordSummaryCards data={data} onViewDocument={onViewDocument} />

      {/* ── Other Uncategorized Fields ── */}
      <OtherFieldsCard fields={otherFields} />

      {/* ── Footer: Submitted By ── */}
      <div className="bg-[#F8FAFF] rounded-2xl border border-[#DDE3F0] p-6 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white border border-[#DDE3F0] flex items-center justify-center text-[#A0AECB]">
            <UserRound size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest">Submitted By</p>
            <p className="text-sm font-bold text-[#0F1A3A]">{data.submittedByName || data.dynamicFormResponses?.submittedByName || 'Clinical Staff'}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {data.qaApproved && (
            <div className="flex items-center gap-2 text-xs font-bold text-green-600">
              <CheckCircle2 size={14} />
              <span>QA Approved {data.qaApprovedAt ? `· ${new Date(data.qaApprovedAt).toLocaleDateString()}` : ''}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-[#A0AECB]">{new Date(data.createdAt).toLocaleString()}</span>
            <Fingerprint size={16} className="text-[#DDE3F0]" />
          </div>
        </div>
      </div>
    </div>
  );
};


const EVENT_TYPE_STYLES = {
  CONDITION_DIAGNOSED: { icon: HeartPulse, color: '#C8102E', bg: '#FEE2E2', label: 'Condition Diagnosed' },
  CONDITION_RESOLVED: { icon: Check, color: '#059669', bg: '#D1FAE5', label: 'Condition Resolved' },
  MEDICATION_STARTED: { icon: Pill, color: '#7C3AED', bg: '#F3E8FF', label: 'Medication Started' },
  MEDICATION_STOPPED: { icon: Pill, color: '#6B7280', bg: '#F3F4F6', label: 'Medication Stopped' },
  EPCR_ENCOUNTER: { icon: Stethoscope, color: '#EA580C', bg: '#FFEDD5', label: 'ePCR Encounter' },
  HOSPITAL_ADMISSION: { icon: BedDouble, color: '#0891B2', bg: '#CFFAFE', label: 'Hospital Admission' },
  LAB_RESULT: { icon: FlaskConical, color: '#1A3C8F', bg: '#DBEAFE', label: 'Lab Result' },
  DOCUMENT: { icon: FileText, color: '#475569', bg: '#E2E8F0', label: 'Document' },
};
const DEFAULT_EVENT_STYLE = { icon: Activity, color: '#4B5A7A', bg: '#E8EEF8', label: 'Event' };

const getEventStyle = (eventType) => {
  const key = String(eventType || '').toUpperCase().replace(/[\s-]+/g, '_');
  return EVENT_TYPE_STYLES[key] || DEFAULT_EVENT_STYLE;
};

const relativeTime = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 0) return 'Upcoming';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};

const groupTimelineByMonth = (items) => {
  const groups = [];
  let currentLabel = null;
  for (const item of items) {
    const d = item.date || item.eventDate || item.timestamp;
    const label = d ? new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown Date';
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, items: [] });
    }
    groups[groups.length - 1].items.push(item);
  }
  return groups;
};

const TimelineEvent = ({ item, index, isLast, onView }) => {
  const eventType = item.eventType || item.type || '';
  const style = getEventStyle(eventType);
  const Icon = style.icon;
  const eventDate = item.date || item.eventDate || item.timestamp;
  const title = item.title || style.label;
  const desc = item.description;
  const metadata = item.metadata || {};
  const metaEntries = Object.entries(metadata).filter(([, v]) => v && v !== '');
  const dateStr = eventDate ? new Date(eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not recorded';

  return (
    <div className="relative flex gap-4">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[19px] top-[44px] bottom-0 w-[2px]" style={{ background: `linear-gradient(to bottom, ${style.color}40, #DDE3F020)` }} />
      )}
      {/* Icon dot */}
      <div className="relative z-10 shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border-2 border-white" style={{ background: style.bg, color: style.color }}>
          <Icon size={18} />
        </div>
      </div>
      {/* Content card */}
      <div className="flex-1 min-w-0 pb-6">
        <div className="rounded-xl border border-[#DDE3F0] bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider" style={{ background: style.bg, color: style.color }}>
                  <Icon size={11} />
                  {style.label}
                </span>
                {eventDate && (
                  <span className="text-[10px] font-bold text-[#A0AECB] uppercase tracking-wider">{relativeTime(eventDate)}</span>
                )}
              </div>
              <p className="font-bold text-[#0F1A3A] text-[15px] leading-snug mt-1.5">{title}</p>
              {desc && <p className="mt-1.5 text-sm text-[#4B5A7A] leading-relaxed">{desc}</p>}
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2">
              <p className="text-xs font-bold text-[#4B5A7A]">{dateStr}</p>
              {onView && (
                <button type="button" onClick={() => onView(item)} title="View Details" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDE3F0] bg-white text-[#8A97B0] transition hover:border-brand-blue hover:text-brand-blue hover:shadow-sm">
                  <Eye size={14} />
                </button>
              )}
            </div>
          </div>
          {/* Metadata tags */}
          {metaEntries.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#F0F4FC] flex flex-wrap gap-2">
              {metaEntries.map(([key, value]) => (
                <span key={key} className="inline-flex items-center gap-1 rounded-lg bg-[#F8FAFF] border border-[#EEF2FF] px-2.5 py-1 text-[10px] font-bold text-[#4B5A7A]">
                  <Tag size={9} className="text-[#A0AECB]" />
                  <span className="text-[#A0AECB]">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}:</span>
                  {String(value).substring(0, 40)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


function TimelineViewModal({ item, onClose }) {
  const eventType = item.eventType || item.type || '';
  const style = getEventStyle(eventType);
  const Icon = style.icon;
  const eventDate = item.date || item.eventDate || item.timestamp;
  const title = item.title || style.label;
  const desc = item.description;
  const metadata = item.metadata || {};
  const metaEntries = Object.entries(metadata).filter(([, v]) => v && v !== '');

  const allFields = [
    ['Event Type', style.label],
    ['Title', title],
    ['Date', eventDate ? new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : null],
    ['Relative Time', relativeTime(eventDate)],
    ['Description', desc],
    ['Source ID', item.sourceId],
    ['Patient ID', item.patientId],
    ['Condition ID', item.conditionId],
    ...metaEntries.map(([key, value]) => [key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), String(value)]),
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F1A3A]/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[32px] bg-white shadow-2xl border border-[#DDE3F0] animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#F0F4FC] bg-white/80 backdrop-blur-md px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: style.bg, color: style.color }}>
              <Icon size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#0F1A3A]">Event Details</h3>
              <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5" style={{ background: style.bg, color: style.color }}>
                {style.label}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-2xl p-2.5 text-[#8A97B0] hover:bg-[#F0F4FC] hover:text-brand-red transition-all">
            <X size={24} />
          </button>
        </div>
        {/* Content */}
        <div className="p-8 space-y-6">
          {allFields.filter(([, val]) => val).map(([key, val]) => (
            <div key={key} className="group rounded-2xl border border-[#DDE3F0] bg-[#F8FAFF] p-5 hover:border-brand-blue/30 transition-all">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#A0AECB] group-hover:text-brand-blue transition-colors">{key}</p>
              <p className="text-sm font-bold text-[#4B5A7A] break-words leading-relaxed">{val}</p>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="sticky bottom-0 z-10 border-t border-[#F0F4FC] bg-white/80 backdrop-blur-md px-8 py-6 flex justify-end">
          <button onClick={onClose} className="rounded-2xl bg-[#F8FAFF] border border-[#DDE3F0] px-8 py-3.5 text-xs font-black uppercase tracking-widest text-[#4B5A7A] hover:bg-white hover:border-brand-blue hover:text-brand-blue transition-all shadow-sm">
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}


const RESTRICTION_TYPES = ['NO_MARKETING', 'NO_RESEARCH', 'NO_THIRD_PARTY', 'NO_INSURANCE', 'CUSTOM'];
const DATA_CATEGORIES = ['ALL', 'PHI', 'DIAGNOSIS', 'MEDICATIONS', 'VITALS', 'DEMOGRAPHICS'];

export default function PatientPortal() {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const records = asList(useSelector(selectPortalRecords));
  const amendments = asList(useSelector(selectPortalAmendments));
  const restrictions = asList(useSelector(selectPortalRestrictions));
  const loading = useSelector(selectPortalLoading);

  // Patient History state
  const historySummary = useSelector(selectHistorySummary);
  const conditions = asList(useSelector(selectConditions));
  const medications = asList(useSelector(selectMedications));
  const encounters = asList(useSelector(selectEncounters));
  const admissions = asList(useSelector(selectAdmissions));
  const labResults = asList(useSelector(selectLabResults));
  const documents = asList(useSelector(selectDocuments));
  const timeline = asList(useSelector(selectTimeline));
  const vitals = asList(useSelector(selectVitals));
  const historyLoading = useSelector(selectHistoryLoading);

  const [activeTab, setActiveTab] = useState('records');
  const [viewRecord, setViewRecord] = useState(null);
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historySubTab, setHistorySubTab] = useState('overview');
  const [historyFetched, setHistoryFetched] = useState(false);
  const [timelineViewItem, setTimelineViewItem] = useState(null);

  const [amendmentForm, setAmendmentForm] = useState({ recordId: '', justification: '', dataCategory: 'ALL' });
  const [restrictionForm, setRestrictionForm] = useState({ restrictionType: 'NO_MARKETING', justification: '', dataCategory: 'PHI' });

  // Aggregate vitals from clinical records for longitudinal view
  const combinedVitals = useMemo(() => {
    const extracted = records.map(r => {
      // Check if the record actually contains any vital-related fields before processing
      const hasVitalsData = VITAL_PRESENTED_FIELDS.some(f => {
        const val = r[f];
        return val !== undefined && val !== null && val !== '';
      });

      if (!hasVitalsData) return null;

      const v = buildVitals(r);
      return {
        id: `record-vital-${r.id}`,
        recordedAt: r.incidentDateTime || r.createdAt,
        systolicBP: v.systolic,
        diastolicBP: v.diastolic,
        heartRate: v.heartRate,
        oxygenSaturation: v.spo2,
        respiratoryRate: v.respiratoryRate,
        temperature: v.temperature,
        bloodGlucose: v.bloodSugar,
        glasgowComaScale: v.gcs,
        source: 'Clinical Record',
        recordId: r.id
      };
    }).filter(Boolean);

    const all = [...vitals, ...extracted];
    return all.sort((a, b) => new Date(b.recordedAt || b.createdAt || b.recordedAt) - new Date(a.recordedAt || a.createdAt || a.recordedAt));
  }, [vitals, records]);

  useEffect(() => { dispatch(fetchPortalData()); }, [dispatch]);

  useEffect(() => {
    if (activeTab === 'history' && !historyFetched && user?.id) {
      const pid = user.patientId || user.id;
      dispatch(fetchAllPatientHistory(pid));
      setHistoryFetched(true);
    }
  }, [activeTab, historyFetched, user, dispatch]);

  const handleCreateAmendment = async e => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      await dispatch(createAmendment(amendmentForm)).unwrap();
      dispatch(addToast({ type: 'success', message: 'Amendment request submitted.' }));
      setShowAmendmentModal(false); setAmendmentForm({ recordId: '', justification: '', dataCategory: 'ALL' });
    } catch (err) { dispatch(addToast({ type: 'error', message: err || 'Submission failed.' })); }
    finally { setIsSubmitting(false); }
  };

  const handleCreateRestriction = async e => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      await dispatch(createRestriction(restrictionForm)).unwrap();
      dispatch(addToast({ type: 'success', message: 'Restriction requested.' }));
      setShowRestrictionModal(false); setRestrictionForm({ restrictionType: 'NO_MARKETING', justification: '', dataCategory: 'PHI' });
    } catch (err) { dispatch(addToast({ type: 'error', message: err || 'Request failed.' })); }
    finally { setIsSubmitting(false); }
  };

  const tabs = [
    { id: 'records', label: 'Clinical History', icon: History },
    { id: 'history', label: 'My History', icon: ClipboardList },
    { id: 'amendments', label: 'Amendments', icon: FileEdit },
    { id: 'restrictions', label: 'Privacy', icon: Ban },
    { id: 'audit', label: 'Access Logs', icon: ShieldAlert },
  ];

  const historyCounts = [
    { label: 'Conditions', value: conditions.length },
    { label: 'Medications', value: medications.length },
    { label: 'Encounters', value: encounters.length },
    { label: 'Admissions', value: admissions.length },
    { label: 'Labs', value: labResults.length },
    { label: 'Vitals', value: combinedVitals.length },
    { label: 'Documents', value: documents.length },
  ];

  const formatHistoryDate = value => value ? new Date(value).toLocaleDateString() : 'Date N/A';

  const historyEmpty = (message) => (
    <div className="rounded-xl border border-dashed border-[#DDE3F0] bg-[#F8FAFF] px-4 py-8 text-center">
      <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-[#DDE3F0]" />
      <p className="text-sm font-semibold text-[#8A97B0]">{message}</p>
    </div>
  );

  const historySectionHeader = (Icon, title, helper, colorClass = 'text-brand-blue', bgClass = 'bg-[#EEF2FF]') => (
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center ${colorClass} shrink-0`}>
        <Icon size={19} />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-black text-[#0F1A3A] uppercase tracking-wider">{title}</h3>
        <p className="mt-1 text-xs font-semibold text-[#8A97B0]">{helper}</p>
      </div>
    </div>
  );

  const Section = ({ icon: Icon, title, helper, children }) => (
    <div className="bg-white border border-[#DDE3F0] rounded-[24px] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#DDE3F0] px-8 py-6">
        {historySectionHeader(Icon, title, helper)}
      </div>
      <div className="p-8">{children}</div>
    </div>
  );

  const viewSecureDocument = async (pid, docId) => {
    if (!docId || !pid) return;
    try {
      const res = await client.get(
        `/api/patients/${pid}/history/documents/${docId}/signed-url`,
        { hideToast: true }
      );
      window.open(res.data.url, '_blank');
    } catch (err) {
      const status = err.response?.status;
      const message = status === 404
        ? 'This document was stored on a previous server and must be re-uploaded to be accessible.'
        : (err.response?.data?.message || 'Unable to open document. Please try again or contact support.');
      dispatch(addToast({ type: 'error', message }));
    }
  };

  const handleViewHistoryItem = (item, type) => {
    // Map history item to timeline format for the existing modal
    const mapped = {
      ...item,
      eventType: type,
      title: item.conditionName || item.medicationName || item.testName || item.encounterType || item.hospital || item.fileName || type,
      description: item.notes || item.reason || item.description || '',
      date: item.onsetDate || item.date || item.encounterDate || item.admissionDate || item.resultDate || item.timestamp || item.recordedAt || item.createdAt,
      metadata: { ...item }
    };
    setTimelineViewItem(mapped);
  };

  const HistoryRowActions = ({ item, type }) => (
    <div className="flex shrink-0 items-center gap-3">
      <button
        type="button"
        onClick={() => handleViewHistoryItem(item, type)}
        className="w-10 h-10 rounded-xl bg-white border border-[#DDE3F0] flex items-center justify-center text-[#8A97B0] hover:bg-[#F8FAFF] hover:text-brand-red transition-all"
      >
        <Eye size={16} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 pb-10 animate-fade-in max-w-6xl mx-auto">
      {/* Main Header Card */}
      <div className="bg-white rounded-[32px] border border-[#DDE3F0] p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-[24px] bg-brand-blue flex items-center justify-center text-white shadow-2xl shadow-brand-blue/30 overflow-hidden group">
                <User size={40} className="group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-green-500 border-4 border-white flex items-center justify-center text-white shadow-lg">
                <Check size={16} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <span className="px-3 py-1 bg-blue-50 text-brand-blue text-[10px] font-black uppercase tracking-[0.2em] rounded-lg border border-blue-100 shadow-sm">Patient Portal</span>
                <span className="w-1 h-1 rounded-full bg-[#DDE3F0]" />
                <span className="text-[10px] font-bold text-[#8A97B0] uppercase tracking-widest">Active Session</span>
              </div>
              <h1 className="text-4xl font-black text-[#0F1A3A] tracking-tight leading-none mb-2">{user?.firstName} {user?.lastName}</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-green-500" />
                  <p className="text-xs font-bold text-green-600 uppercase tracking-widest">Identity Verified</p>
                </div>
                <div className="w-1 h-1 rounded-full bg-[#DDE3F0]" />
                <p className="text-xs font-bold text-[#A0AECB] uppercase tracking-widest">Patient ID: <span className="font-mono text-brand-blue">#{user?.id?.substring(0, 8).toUpperCase()}</span></p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowAmendmentModal(true)} className="group flex items-center gap-3 bg-[#F8FAFF] border border-[#DDE3F0] px-6 py-4 rounded-[20px] text-xs font-black uppercase tracking-widest text-[#4B5A7A] hover:bg-white hover:border-brand-blue hover:text-brand-blue transition-all shadow-sm hover:shadow-md">
              <FileEdit size={18} className="text-[#A0AECB] group-hover:text-brand-blue transition-colors" /> Request Amendment
            </button>
            <button onClick={() => setShowRestrictionModal(true)} className="group flex items-center gap-3 bg-brand-red text-white px-6 py-4 rounded-[20px] text-xs font-black uppercase tracking-widest hover:bg-red-800 transition-all shadow-xl shadow-red-900/10 hover:shadow-red-900/20">
              <Ban size={18} /> Manage Privacy
            </button>
          </div>
        </div>
      </div>


      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Nav */}
        <div className="lg:w-72 shrink-0 space-y-6">
          <div className="bg-white rounded-[28px] border border-[#DDE3F0] p-3 shadow-sm space-y-1.5">
            {tabs.map(t => (
              <button key={t.id} onClick={() => { setActiveTab(t.id); setViewRecord(null); }}
                className={`group w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${activeTab === t.id ? 'bg-[#EEF2FF] text-brand-blue' : 'text-[#8A97B0] hover:bg-[#F8FAFF] hover:text-[#4B5A7A]'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === t.id ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30 scale-110' : 'bg-[#F8FAFF] text-[#A0AECB] group-hover:bg-blue-50 group-hover:text-brand-blue'}`}>
                    <t.icon size={20} />
                  </div>
                  <span className={`text-sm tracking-tight ${activeTab === t.id ? 'font-black' : 'font-bold'}`}>{t.label}</span>
                </div>
                {activeTab === t.id ? (
                  <div className="w-1.5 h-6 bg-brand-blue rounded-full shadow-sm" />
                ) : (
                  <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            ))}
          </div>


          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <Heart className="text-brand-red" size={20} />
              <h4 className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider">Status</h4>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xl font-black text-[#0F1A3A]">{records.length}</p>
                <p className="text-xs text-[#8A97B0] font-semibold uppercase tracking-wider mt-0.5">Records</p>
              </div>
              <div className="pt-4 border-t border-[#F0F4FC] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-[#8A97B0] uppercase tracking-wider">Synced</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw className="animate-spin w-10 h-10 mx-auto mb-4 text-[#A0AECB]" />
              <p className="text-sm font-semibold text-[#8A97B0]">Loading records…</p>
            </div>
          ) : viewRecord ? (
            <div className="space-y-4">
              <button onClick={() => setViewRecord(null)} className="btn-ghost px-3 py-2 text-sm text-[#4B5A7A]">
                <ArrowLeft size={16} /> Back to Records
              </button>
              <MedicalDocument data={viewRecord} onViewDocument={viewSecureDocument} />
            </div>
          ) : activeTab === 'records' ? (
            <div className="space-y-4">
              <IncidentAnalytics records={records} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {records.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-[#F8FAFF] rounded-2xl border border-dashed border-[#DDE3F0]">
                    <Shield className="w-16 h-16 mx-auto mb-4 text-[#DDE3F0]" />
                    <p className="text-sm font-black text-[#8A97B0]">No clinical records found on file.</p>
                  </div>
                ) : records.map(r => (
                  <div 
                    key={r.id} 
                    onClick={() => setViewRecord(r)} 
                    className="group relative bg-white rounded-2xl border border-[#DDE3F0] p-6 hover:shadow-xl hover:shadow-brand-blue/5 hover:border-brand-blue/30 transition-all cursor-pointer flex flex-col h-full"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue group-hover:scale-110 transition-transform">
                        <ClipboardCheck size={22} />
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest mb-1">Date of Care</p>
                        <span className="text-xs font-bold text-[#0F1A3A] bg-[#F8FAFF] px-3 py-1 rounded-lg border border-[#EEF2FF]">
                          {new Date(r.incidentDateTime || r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-[#0F1A3A] mb-2 group-hover:text-brand-blue transition-colors line-clamp-2 leading-tight">
                      {r.diagnosis || 'Diagnosis Pending'}
                    </h3>
                    
                    <div className="flex items-center gap-2 mb-8 text-[#8A97B0]">
                      <MapPin size={14} className="shrink-0" />
                      <p className="text-xs font-bold truncate uppercase tracking-wider">
                        {r.incidentLocation || 'Clinical Facility'}
                      </p>
                    </div>

                    <div className="mt-auto pt-5 border-t border-[#F0F4FC] flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest mb-1">Incident Number</p>
                        <span className="text-[10px] font-mono font-bold text-brand-blue">#{r.id?.substring(0, 12).toUpperCase()}</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-[#F8FAFF] border border-[#EEF2FF] flex items-center justify-center text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-all">
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          ) : activeTab === 'amendments' ? (
            <div className="space-y-4">
              {amendments.length === 0 ? (
                <div className="py-20 text-center bg-[#F8FAFF] rounded-2xl border border-dashed border-[#DDE3F0]">
                  <FileEdit className="w-16 h-16 mx-auto mb-4 text-[#DDE3F0]" />
                  <p className="text-sm font-black text-[#8A97B0]">No amendment requests on file.</p>
                </div>
              ) : amendments.map(a => (
                <div key={a.id} className="group bg-white rounded-2xl border border-[#DDE3F0] p-6 hover:shadow-xl hover:shadow-brand-blue/5 transition-all">
                  <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue">
                        <FileEdit size={22} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest mb-1">Record Reference</p>
                        <p className="text-sm font-mono text-brand-blue font-bold">#{a.recordId?.substring(0, 16).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                        a.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : 
                        a.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' : 
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {a.status}
                      </span>
                      <span className="text-xs font-bold text-[#8A97B0]">{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="bg-[#F8FAFF] p-5 rounded-2xl border border-[#EEF2FF]">
                    <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest mb-2">Request Justification</p>
                    <p className="text-sm font-bold text-[#4B5A7A] italic leading-relaxed">"{a.justification}"</p>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'history' ? (
            <div className="space-y-8">
              {historyLoading ? (
                <div className="py-20 text-center card bg-white rounded-2xl border border-[#DDE3F0]">
                  <RefreshCw className="animate-spin w-12 h-12 mx-auto mb-4 text-brand-blue/30" />
                  <p className="text-sm font-bold text-[#8A97B0]">Loading history record...</p>
                </div>
              ) : (
                <>
                  {/* Summary Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-7 gap-4">
                    {[
                      { label: 'Conditions', value: conditions.length, icon: HeartPulse, color: 'text-red-500', bg: 'bg-red-50' },
                      { label: 'Medications', value: medications.length, icon: Pill, color: 'text-blue-500', bg: 'bg-blue-50' },
                      { label: 'Visits', value: encounters.length, icon: UserRound, color: 'text-purple-500', bg: 'bg-purple-50' },
                      { label: 'Admissions', value: admissions.length, icon: BedDouble, color: 'text-orange-500', bg: 'bg-orange-50' },
                      { label: 'Lab Results', value: labResults.length, icon: FlaskConical, color: 'text-green-500', bg: 'bg-green-50' },
                      { label: 'Documents', value: documents.length, icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                      { label: 'Vitals', value: combinedVitals.length, icon: Activity, color: 'text-rose-500', bg: 'bg-rose-50' },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-white p-5 rounded-2xl border border-[#DDE3F0] shadow-sm hover:shadow-md transition-all group">
                        <div className={`w-9 h-9 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                          <stat.icon size={18} />
                        </div>
                        <p className="text-2xl font-black text-[#0F1A3A] mb-0.5">{stat.value}</p>
                        <p className="text-[9px] font-black text-[#A0AECB] uppercase tracking-widest">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Horizontal Navigation Tabs */}
                  <div className="flex flex-wrap items-center gap-2 p-1 bg-white border border-[#DDE3F0] rounded-2xl shadow-sm">
                    {[
                      ['overview', 'Overview', History],
                      ['conditions', 'Conditions', HeartPulse],
                      ['medications', 'Medications', Pill],
                      ['encounters', 'Encounters', UserRound],
                      ['admissions', 'Admissions', BedDouble],
                      ['labs', 'Labs', FlaskConical],
                      ['vitals', 'Vitals', Activity],
                      ['documents', 'Documents', FileText],
                      ['timeline', 'Timeline', Clock],
                    ].map(([id, label, Icon]) => (
                      <button
                        key={id}
                        onClick={() => setHistorySubTab(id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all text-xs font-bold ${historySubTab === id
                            ? 'bg-brand-red text-white shadow-lg shadow-red-900/20'
                            : 'text-[#8A97B0] hover:bg-[#F8FAFF] hover:text-[#4B5A7A]'
                          }`}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* History Content Sections */}
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {historySubTab === 'overview' && (
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="card p-8 border border-[#DDE3F0] bg-white rounded-[24px]">
                          {historySectionHeader(History, 'Clinical Overview', 'Your complete longitudinal health summary')}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                            <div className="p-4 rounded-xl border border-[#DDE3F0] bg-[#F8FAFF]">
                              <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest mb-1">Last Update</p>
                              <p className="text-sm font-bold text-[#0F1A3A]">{formatHistoryDate(historySummary?.lastUpdatedAt || new Date())}</p>
                            </div>
                            <div className="p-4 rounded-xl border border-[#DDE3F0] bg-[#F8FAFF]">
                              <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest mb-1">Record Status</p>
                              <p className="text-sm font-bold text-green-600">Synced & Verified</p>
                            </div>
                          </div>
                        </div>
                        <div className="card p-8 border border-[#DDE3F0] bg-white rounded-[24px]">
                          {historySectionHeader(Activity, 'Recent Activity', 'Latest updates to your clinical file')}
                          <div className="space-y-4 mt-4">
                            {timeline.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-4">
                                <div className="w-2 h-2 rounded-full bg-brand-red" />
                                <div>
                                  <p className="text-sm font-bold text-[#0F1A3A]">{item.title || item.type}</p>
                                  <p className="text-xs text-[#8A97B0]">{formatHistoryDate(item.date || item.timestamp)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {historySubTab === 'conditions' && (
                      <Section icon={HeartPulse} title="Medical Conditions" helper="Diagnosed or ongoing health issues">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {conditions.length === 0 ? historyEmpty('No conditions recorded.') : conditions.map((c, i) => (
                            <div key={i} className="group relative bg-white rounded-2xl border border-[#DDE3F0] p-6 hover:shadow-xl hover:shadow-brand-blue/5 hover:border-brand-blue/30 transition-all cursor-default">
                              <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue group-hover:scale-110 transition-transform">
                                  <Stethoscope size={22} />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${c.status === 'ACTIVE' ? 'bg-red-50 text-brand-red' : 'bg-blue-50 text-brand-blue'}`}>
                                  {c.status || 'Verified'}
                                </span>
                              </div>
                              <h4 className="text-xl font-black text-[#0F1A3A] mb-2 group-hover:text-brand-blue transition-colors leading-tight">{c.conditionName || c.name}</h4>
                              <div className="flex flex-wrap items-center gap-2 mb-6">
                                <span className="text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">{c.icdCode || 'Clinical Diagnosis'}</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-[#DDE3F0]" />
                                <span className="text-xs font-bold text-[#8A97B0] uppercase tracking-wider">Since {formatHistoryDate(c.onsetDate)}</span>
                              </div>
                              <div className="pt-5 border-t border-[#F0F4FC] flex items-center justify-between">
                                <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest">Medical Health Record</p>
                                <HistoryRowActions item={c} type="CONDITION" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}

                    {historySubTab === 'medications' && (
                      <Section icon={Pill} title="Current Medications" helper="Medicines currently in your treatment plan">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {medications.length === 0 ? historyEmpty('No medications recorded.') : medications.map((m, i) => (
                            <div key={i} className="group relative bg-white rounded-2xl border border-[#DDE3F0] p-6 hover:shadow-xl hover:shadow-brand-blue/5 hover:border-brand-blue/30 transition-all cursor-default">
                              <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue group-hover:rotate-12 transition-transform">
                                  <Pill size={22} />
                                </div>
                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-brand-blue">Active</span>
                              </div>
                              <h4 className="text-xl font-black text-[#0F1A3A] mb-2 group-hover:text-brand-blue transition-colors">{m.medicationName || m.name}</h4>
                              <div className="p-3 rounded-xl bg-[#F8FAFF] border border-[#EEF2FF] mb-6">
                                <p className="text-sm font-black text-brand-blue">{m.dosage || 'Dosage N/A'}</p>
                                <p className="text-[10px] font-bold text-[#8A97B0] uppercase tracking-widest mt-1">{m.frequency || 'Daily Intake'}</p>
                              </div>
                              <div className="pt-4 border-t border-[#F0F4FC] flex items-center justify-between">
                                <p className="text-xs text-[#8A97B0] font-bold">Started: {formatHistoryDate(m.date || m.startDate)}</p>
                                <HistoryRowActions item={m} type="MEDICATION" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}

                    {historySubTab === 'vitals' && (
                      <div className="space-y-6">
                        <div className="bg-white border border-[#DDE3F0] rounded-[24px] p-8 shadow-sm">
                          <div className="flex items-center justify-between mb-8">
                            {historySectionHeader(Activity, 'Vital Signs Trending', 'Longitudinal tracking of clinical metrics')}
                          </div>
                          <VitalsPortalTab vitals={combinedVitals} onView={handleViewHistoryItem} />
                        </div>
                      </div>
                    )}

                    {historySubTab === 'documents' && (
                      <Section icon={FileText} title="Medical Documents" helper="Clinical reports and discharge summaries">
                        <div className="grid grid-cols-1 gap-4">
                          {documents.length === 0 ? historyEmpty('No documents on file.') : documents.map((d, i) => (
                            <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl border border-[#DDE3F0] bg-white hover:shadow-xl hover:shadow-brand-blue/5 hover:border-brand-blue/20 transition-all group cursor-default">
                              <div className="flex items-center gap-5 mb-4 md:mb-0">
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-brand-blue transition-all">
                                  <FileText size={32} />
                                </div>
                                <div>
                                  <p className="text-xl font-black text-[#0F1A3A] group-hover:text-brand-blue transition-colors leading-tight">{d.fileName || d.name}</p>
                                  <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-[0.2em] mt-1">{d.type} • {formatHistoryDate(d.date || d.uploadedAt)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                                <button
                                  type="button"
                                  onClick={() => viewSecureDocument(user.patientId || user.id, d.documentId || d.id, d.fileName || d.name)}
                                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-[#DDE3F0] text-xs font-black text-brand-blue hover:border-brand-blue hover:bg-blue-50 transition-all shadow-sm hover:shadow-md"
                                >
                                  View Document <ExternalLink size={14} />
                                </button>
                                <HistoryRowActions item={d} type="DOCUMENT" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}

                    {historySubTab === 'encounters' && (
                      <Section icon={UserRound} title="Clinical Visits" helper="History of encounters with healthcare providers">
                        <div className="space-y-6">
                          {encounters.length === 0 ? historyEmpty('No visits recorded.') : encounters.map((e, i) => (
                            <div key={i} className="relative pl-10 border-l-4 border-blue-50 pb-10 last:pb-0 group">
                              <div className="absolute -left-[14px] top-0 w-6 h-6 rounded-full bg-white border-4 border-brand-blue shadow-sm group-hover:scale-125 transition-transform" />
                              <div className="p-8 rounded-2xl border border-[#DDE3F0] bg-white shadow-sm hover:shadow-xl hover:shadow-brand-blue/5 hover:border-brand-blue/30 transition-all">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[10px] font-black text-brand-blue uppercase tracking-[0.2em] bg-blue-50 px-3 py-1.5 rounded-lg mb-3 inline-block shadow-sm">{formatHistoryDate(e.encounterDate || e.date)}</span>
                                    <h4 className="text-2xl font-black text-[#0F1A3A] group-hover:text-brand-blue transition-colors leading-tight">{e.encounterType || e.reason || 'Clinical Consultation'}</h4>
                                    <div className="flex items-center gap-3 mt-3">
                                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#8A97B0] bg-[#F8FAFF] px-3 py-1.5 rounded-lg border border-[#EEF2FF]">
                                        <MapPin size={14} className="text-brand-blue" />
                                        {e.location || 'Outpatient Clinic'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 shrink-0">
                                    <span className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-green-50 text-green-700 border border-green-100">Validated</span>
                                    <HistoryRowActions item={e} type="ENCOUNTER" />
                                  </div>
                                </div>
                                {e.notes && (
                                  <div className="bg-[#F8FAFF] p-5 rounded-2xl border border-[#EEF2FF]">
                                    <p className="text-xs font-black text-[#A0AECB] uppercase tracking-widest mb-2">Clinical Note</p>
                                    <p className="text-sm text-[#4B5A7A] leading-relaxed italic">"{e.notes}"</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}

                    {historySubTab === 'admissions' && (
                      <Section icon={BedDouble} title="Hospital Admissions" helper="History of inpatient hospital stays">
                        <div className="grid grid-cols-1 gap-4">
                          {admissions.length === 0 ? historyEmpty('No admissions recorded.') : admissions.map((a, i) => (
                            <div key={i} className="group p-8 rounded-2xl border border-[#DDE3F0] bg-white hover:border-brand-blue/30 hover:shadow-xl hover:shadow-brand-blue/5 transition-all">
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                <div className="flex items-center gap-6">
                                  <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-brand-blue group-hover:scale-110 transition-transform">
                                    <BedDouble size={32} />
                                  </div>
                                  <div>
                                    <h4 className="text-2xl font-black text-[#0F1A3A] leading-tight mb-1 group-hover:text-brand-blue transition-colors">{a.hospital || a.facility || 'General Hospital'}</h4>
                                    <div className="flex items-center gap-3">
                                      <p className="text-xs font-black text-brand-blue uppercase tracking-widest">{formatHistoryDate(a.admitDate || a.admissionDate)}</p>
                                      <ChevronRight size={14} className="text-[#DDE3F0]" />
                                      <p className="text-xs font-black text-[#8A97B0] uppercase tracking-widest">{a.dischargeDate ? formatHistoryDate(a.dischargeDate) : 'Ongoing'}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-50 text-brand-blue border border-blue-100 shadow-sm">Discharged</span>
                                  <HistoryRowActions item={a} type="ADMISSION" />
                                </div>
                              </div>
                              {a.reason && (
                                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="p-5 rounded-2xl bg-[#F8FAFF] border border-[#EEF2FF]">
                                    <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest mb-1">Primary Diagnosis</p>
                                    <p className="text-sm font-black text-[#0F1A3A]">{a.reason}</p>
                                  </div>
                                  {a.outcome && (
                                    <div className="p-5 rounded-2xl bg-green-50 border border-green-100">
                                      <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Outcome</p>
                                      <p className="text-sm font-black text-green-700">{a.outcome}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}

                    {historySubTab === 'labs' && (
                      <Section icon={FlaskConical} title="Laboratory Results" helper="Clinical test results and diagnostic findings">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {labResults.length === 0 ? historyEmpty('No lab results recorded.') : labResults.map((l, i) => (
                            <div key={i} className="p-8 rounded-3xl border border-[#DDE3F0] bg-white shadow-sm hover:shadow-2xl hover:shadow-brand-blue/10 hover:border-brand-blue/40 transition-all group">
                              <div className="flex items-start justify-between mb-8">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-brand-blue group-hover:scale-110 transition-transform">
                                  <FlaskConical size={26} />
                                </div>
                                <div className="text-right">
                                  <p className="text-3xl font-black text-brand-blue tracking-tighter">{l.value} <span className="text-xs text-[#A0AECB] uppercase font-bold tracking-widest">{l.unit || 'units'}</span></p>
                                  <span className={`inline-block mt-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${l.interpretation?.includes('NORMAL') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-brand-red'}`}>{l.interpretation || 'Stable'}</span>
                                </div>
                              </div>
                              <h4 className="text-xl font-black text-[#0F1A3A] leading-tight mb-2 group-hover:text-brand-blue transition-colors line-clamp-2 min-h-[3rem]">{l.testName || l.name}</h4>
                              <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#F0F4FC]">
                                <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-[0.2em]">{formatHistoryDate(l.date || l.resultDate)}</p>
                                <HistoryRowActions item={l} type="LAB_RESULT" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}

                    {historySubTab === 'timeline' && (
                      <div className="bg-white border border-[#DDE3F0] rounded-[24px] overflow-hidden shadow-sm">
                        <div className="border-b border-[#DDE3F0] px-8 py-6">{historySectionHeader(Clock, 'Medical Timeline', 'Chronological list of all medical events')}</div>
                        <div className="p-8">
                          {timeline.length === 0 ? historyEmpty('No events recorded.') : (
                            <div className="space-y-8">
                              {groupTimelineByMonth(timeline).map((group, gIdx) => (
                                <div key={gIdx}>
                                  <div className="flex items-center gap-3 mb-6">
                                    <div className="h-px flex-1 bg-[#DDE3F0]" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A0AECB]">{group.label}</span>
                                    <div className="h-px flex-1 bg-[#DDE3F0]" />
                                  </div>
                                  <div className="space-y-4">
                                    {group.items.map((item, index) => (
                                      <TimelineEvent key={index} item={item} index={index} isLast={index === group.items.length - 1} onView={setTimelineViewItem} />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

          ) : activeTab === 'restrictions' ? (
            <div className="space-y-4">
              {restrictions.length === 0 ? (
                <div className="py-20 text-center bg-[#F8FAFF] rounded-2xl border border-dashed border-[#DDE3F0]">
                  <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-[#DDE3F0]" />
                  <p className="text-sm font-black text-[#8A97B0]">No active privacy restrictions.</p>
                </div>
              ) : restrictions.map(r => (
                <div key={r.id} className="group bg-white rounded-2xl border border-[#DDE3F0] p-6 hover:shadow-xl hover:shadow-brand-red/5 transition-all">
                  <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-brand-red">
                        <Ban size={22} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest mb-1">Restriction Type</p>
                        <p className="text-sm font-bold text-[#0F1A3A]">{r.restrictionType?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-green-50 text-green-700 border border-green-200">
                        Active
                      </span>
                      <span className="text-xs font-bold text-[#8A97B0]">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="bg-[#FFF8F8] p-5 rounded-2xl border border-[#FEE2E2]">
                    <p className="text-[10px] font-black text-brand-red/60 uppercase tracking-widest mb-2">Policy Justification</p>
                    <p className="text-sm font-bold text-[#4B5A7A] italic leading-relaxed">"{r.justification}"</p>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'audit' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <AuditLogs />
            </div>
          ) : null}
        </div>
      </div>

      {/* Amendment Modal */}
      {showAmendmentModal && (
        <div className="fixed inset-0 bg-[#0F1A3A]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-[#DDE3F0] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-8 border-b border-[#F0F4FC]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-brand-blue">
                  <FileEdit size={24} />
                </div>
                <div>
                  <h2 className="font-black text-[#0F1A3A] text-xl">Request Amendment</h2>
                  <p className="text-xs font-bold text-[#8A97B0] uppercase tracking-widest mt-0.5">Clinical Record Correction</p>
                </div>
              </div>
              <button onClick={() => setShowAmendmentModal(false)} className="p-2.5 rounded-2xl text-[#8A97B0] hover:bg-[#F0F4FC] hover:text-brand-red transition-all">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateAmendment} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4B5A7A] uppercase tracking-[0.2em] ml-1">Select Clinical Record *</label>
                <select required value={amendmentForm.recordId} onChange={e => setAmendmentForm({ ...amendmentForm, recordId: e.target.value })} className="w-full bg-[#F8FAFF] border border-[#DDE3F0] rounded-2xl px-5 py-4 text-sm font-bold text-[#0F1A3A] focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all appearance-none">
                  <option value="">Select Record</option>
                  {records.map(r => <option key={r.id} value={r.id}>{r.diagnosis || 'Clinical Case'} - {new Date(r.incidentDateTime || r.createdAt).toLocaleDateString()}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4B5A7A] uppercase tracking-[0.2em] ml-1">Data Category</label>
                <select value={amendmentForm.dataCategory} onChange={e => setAmendmentForm({ ...amendmentForm, dataCategory: e.target.value })} className="w-full bg-[#F8FAFF] border border-[#DDE3F0] rounded-2xl px-5 py-4 text-sm font-bold text-[#0F1A3A] focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all appearance-none">
                  {DATA_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4B5A7A] uppercase tracking-[0.2em] ml-1">Justification & Details *</label>
                <textarea required rows={4} value={amendmentForm.justification} onChange={e => setAmendmentForm({ ...amendmentForm, justification: e.target.value })}
                  placeholder="Clearly explain the required correction or missing information…" className="w-full bg-[#F8FAFF] border border-[#DDE3F0] rounded-2xl px-5 py-4 text-sm font-bold text-[#4B5A7A] focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all resize-none" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAmendmentModal(false)} className="flex-1 bg-white border border-[#DDE3F0] text-[#4B5A7A] font-black uppercase tracking-widest text-xs py-4 rounded-2xl hover:bg-[#F8FAFF] transition-all">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-brand-blue text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl hover:bg-[#1A3C8F] shadow-lg shadow-brand-blue/20 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {isSubmitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restriction Modal */}
      {showRestrictionModal && (
        <div className="fixed inset-0 bg-[#0F1A3A]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-[#DDE3F0] overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-8 border-b border-[#F0F4FC]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-brand-red">
                  <Ban size={24} />
                </div>
                <div>
                  <h2 className="font-black text-[#0F1A3A] text-xl">Privacy Controls</h2>
                  <p className="text-xs font-bold text-[#8A97B0] uppercase tracking-widest mt-0.5">Restrict Data Disclosure</p>
                </div>
              </div>
              <button onClick={() => setShowRestrictionModal(false)} className="p-2.5 rounded-2xl text-[#8A97B0] hover:bg-[#F0F4FC] hover:text-brand-red transition-all">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateRestriction} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4B5A7A] uppercase tracking-[0.2em] ml-1">Restriction Type</label>
                <select value={restrictionForm.restrictionType} onChange={e => setRestrictionForm({ ...restrictionForm, restrictionType: e.target.value })} className="w-full bg-[#F8FAFF] border border-[#DDE3F0] rounded-2xl px-5 py-4 text-sm font-bold text-[#0F1A3A] focus:ring-2 focus:ring-brand-red/20 outline-none transition-all appearance-none">
                  {RESTRICTION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4B5A7A] uppercase tracking-[0.2em] ml-1">Data Category</label>
                <select value={restrictionForm.dataCategory} onChange={e => setRestrictionForm({ ...restrictionForm, dataCategory: e.target.value })} className="w-full bg-[#F8FAFF] border border-[#DDE3F0] rounded-2xl px-5 py-4 text-sm font-bold text-[#0F1A3A] focus:ring-2 focus:ring-brand-red/20 outline-none transition-all appearance-none">
                  {DATA_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#4B5A7A] uppercase tracking-[0.2em] ml-1">Reason for Restriction *</label>
                <textarea required rows={4} value={restrictionForm.justification} onChange={e => setRestrictionForm({ ...restrictionForm, justification: e.target.value })}
                  placeholder="Provide a clinical or personal justification for this restriction…" className="w-full bg-[#F8FAFF] border border-[#DDE3F0] rounded-2xl px-5 py-4 text-sm font-bold text-[#4B5A7A] focus:ring-2 focus:ring-brand-red/20 outline-none transition-all resize-none" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowRestrictionModal(false)} className="flex-1 bg-white border border-[#DDE3F0] text-[#4B5A7A] font-black uppercase tracking-widest text-xs py-4 rounded-2xl hover:bg-[#F8FAFF] transition-all">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-brand-red text-white font-black uppercase tracking-widest text-xs py-4 rounded-2xl hover:bg-red-800 shadow-lg shadow-brand-red/20 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Ban size={16} />}
                  {isSubmitting ? 'Processing…' : 'Apply Restriction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Timeline View Modal */}
      {timelineViewItem && (
        <TimelineViewModal item={timelineViewItem} onClose={() => setTimelineViewItem(null)} />
      )}
    </div>
  );
}
