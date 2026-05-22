import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAllPatientHistory, selectHistorySummary } from '../../store/slices/patientHistorySlice';
import { 
  ArrowLeft, CheckCircle, Calendar, Sparkles, TrendingUp,
  Compass
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function OncologyOverviewPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const summary = useSelector(selectHistorySummary);

  const [tStage, setTStage] = useState('T2');
  const [nStage, setNStage] = useState('N1');
  const [mStage, setMStage] = useState('M0');

  useEffect(() => {
    if (patientId) {
      dispatch(fetchAllPatientHistory(patientId));
    }
  }, [patientId, dispatch]);

  // TNM Clinical Staging Logic
  const getClinicalStageAndSurvival = (t, n, m) => {
    if (m === 'M1') return { stage: 'Stage IV', survival: '22%', status: 'Critical - Systemic involvement', color: 'text-red-500 bg-red-50 border-red-200' };
    if (t === 'T4' || n === 'N3') return { stage: 'Stage III C', survival: '45%', status: 'Advanced - Regional extension', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    if (n === 'N2') return { stage: 'Stage III A', survival: '58%', status: 'Advanced - Regional nodes', color: 'text-amber-500 bg-amber-50 border-amber-200' };
    if (t === 'T3' || n === 'N1') return { stage: 'Stage II B', survival: '72%', status: 'Moderate - Local infiltration', color: 'text-indigo-500 bg-indigo-50 border-indigo-200' };
    if (t === 'T2') return { stage: 'Stage II A', survival: '84%', status: 'Early - Localized growth', color: 'text-indigo-400 bg-indigo-50 border-indigo-200' };
    return { stage: 'Stage I', survival: '95%', status: 'Localized - Excellent prognosis', color: 'text-emerald-500 bg-emerald-50 border-emerald-200' };
  };

  const stagingResult = getClinicalStageAndSurvival(tStage, nStage, mStage);

  // Tumor Biomarker Trend Data
  const biomarkerData = [
    { month: 'Jan', CEA: 2.1, PSA: 1.4 },
    { month: 'Feb', CEA: 3.4, PSA: 1.8 },
    { month: 'Mar', CEA: 4.8, PSA: 2.5 },
    { month: 'Apr', CEA: 3.2, PSA: 2.1 },
    { month: 'May', CEA: 1.9, PSA: 1.2 }
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-16 animate-fade-in font-sans">
      
      {/* Premium Violet Oncology Header */}
      <div className="bg-gradient-to-r from-violet-900 to-indigo-950 text-white py-8 px-8 rounded-b-[32px] shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.15),transparent_50%)]" />
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/epcr')} 
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/10"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <span className="bg-violet-500/20 text-violet-300 border border-violet-400/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Cancer Care & Oncology Station
              </span>
              <h1 className="text-2xl font-black tracking-tight mt-1">
                {summary?.patientName || summary?.name || 'Oncology Portal'}
              </h1>
              <p className="text-slate-300 text-xs mt-0.5">
                Care Group: Comprehensive Cancer Center • Patient ID: {patientId}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Interactive TNM Staging Tool */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-6">
              <Sparkles className="text-violet-600 animate-pulse" size={16} /> Interactive Tumor Staging Calculator (TNM)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 border-b border-slate-100 pb-8">
              
              {/* Tumor selector */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Primary Tumor (T)</span>
                <div className="flex flex-col gap-2">
                  {['T1', 'T2', 'T3', 'T4'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTStage(t)}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between ${tStage === t ? 'bg-violet-600 border-violet-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                      <span>{t}</span>
                      <span className="text-[10px] opacity-75 font-normal">
                        {t === 'T1' && 'Size < 2cm'}
                        {t === 'T2' && 'Size 2-5cm'}
                        {t === 'T3' && 'Size > 5cm'}
                        {t === 'T4' && 'Infiltration'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Node selector */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Regional Nodes (N)</span>
                <div className="flex flex-col gap-2">
                  {['N0', 'N1', 'N2', 'N3'].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNStage(n)}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between ${nStage === n ? 'bg-violet-600 border-violet-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                      <span>{n}</span>
                      <span className="text-[10px] opacity-75 font-normal">
                        {n === 'N0' && 'No nodes'}
                        {n === 'N1' && 'Ipsilateral'}
                        {n === 'N2' && 'Contralateral'}
                        {n === 'N3' && 'Distant nodes'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Metastasis selector */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Metastasis (M)</span>
                <div className="flex flex-col gap-2">
                  {['M0', 'M1'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMStage(m)}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between ${mStage === m ? 'bg-violet-600 border-violet-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                    >
                      <span>{m}</span>
                      <span className="text-[10px] opacity-75 font-normal">
                        {m === 'M0' && 'No spread'}
                        {m === 'M1' && 'Distant spread'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Calculated output */}
            <div className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${stagingResult.color}`}>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider block opacity-75">Calculated Clinical Stage</span>
                <span className="text-3xl font-black">{stagingResult.stage}</span>
                <p className="text-xs font-semibold mt-1">{stagingResult.status}</p>
              </div>

              <div className="bg-white/80 backdrop-blur-md px-5 py-3.5 rounded-xl border border-current/10 text-slate-800 text-center shrink-0">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">PROGNOSTIC SURVIVAL</span>
                <span className="text-2xl font-black text-violet-700 mt-1 block">{stagingResult.survival}</span>
              </div>
            </div>
          </div>

          {/* Biomarker trend plot */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
              <TrendingUp className="text-violet-600" size={18} /> Tumor Biomarker History Trends
            </h3>
            
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={biomarkerData}>
                  <defs>
                    <linearGradient id="colorCea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="CEA" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCea)" strokeWidth={3} name="CEA Level (ng/mL)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Side: Chemotherapy infusions calendar & planner */}
        <div className="space-y-8 lg:col-span-1">
          {/* Infusions Calendar */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Calendar className="text-violet-600" size={16} /> Regimen Administration Cycle
            </h3>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                <span className="bg-violet-100 text-violet-800 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  Cycle 2 / Day 8
                </span>
                <p className="text-sm font-bold text-slate-800 mt-2">Doxorubicin Infusion</p>
                <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                  <CheckCircle className="text-emerald-500" size={13} /> Completed • May 14, 2026
                </p>
              </div>

              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl relative">
                <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-violet-600 animate-ping" />
                <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  Cycle 2 / Day 15
                </span>
                <p className="text-sm font-bold text-slate-800 mt-2">Cyclophosphamide Infusion</p>
                <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                  <Calendar className="text-violet-500" size={13} /> Scheduled • May 21, 2026 (Today)
                </p>
              </div>
            </div>
          </div>

          {/* Cancer Registry Metadata */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Compass size={16} /> Registry Metadata
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="font-bold text-slate-500">Registry Reference</span>
                <span className="font-bold text-slate-800">#ONC-REG-1049</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="font-bold text-slate-500">Primary Oncologist</span>
                <span className="font-bold text-slate-800">Dr. Helen Vance</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500">Regimen Protocol</span>
                <span className="font-bold text-slate-800">AC Protocol (Adjuvant)</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
