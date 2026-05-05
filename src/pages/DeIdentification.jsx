import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RefreshCw, EyeOff, Shield, FileSearch, CheckCircle, AlertCircle } from 'lucide-react';
import client from '../api/client';
import { addToast } from '../store/slices/uiSlice';
import { fetchRecords, selectRecords } from '../store/slices/epcrSlice';
import {
  fetchDeIdRecord,
  maskRecord,
  anonymizeRecord,
  clearResults,
  selectDeIdResult,
  selectMaskResult,
  selectAnonResult,
  selectDeIdLoading,
  selectDeIdError
} from '../store/slices/deIdSlice';

const MASKING_STRATEGIES = [
  { value: 'FULL_HIPAA_18', label: 'Full HIPAA 18 (Remove all 18 identifiers)' },
  { value: 'PARTIAL_MASKING', label: 'Partial Masking (Redact specific fields)' },
  { value: 'PSEUDO_ANONYMIZATION', label: 'Pseudo-Anonymization (Replace with tokens)' },
];
const ANON_METHODS = [
  { value: 'GENERALIZATION', label: 'Generalization (broaden specific values)' },
  { value: 'SUPPRESSION', label: 'Suppression (remove sensitive records)' },
  { value: 'DATA_SWAPPING', label: 'Data Swapping (permute values across records)' },
  { value: 'K_ANONYMITY', label: 'k-Anonymity (ensure indistinguishability)' },
];
const inputCls = 'w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none';

const MedicalDocument = ({ data, isNested = false, rootData = null }) => {
  if (!data || typeof data !== 'object') return null;
  const currentRoot = rootData || data;

  const entries = Object.entries(data).filter(([k]) => {
    if (isNested && (k === 'paramedicsName' || k === 'organizationName' || k === 'submittedByName')) return false;
    return true;
  });

  const formatValue = (k, v) => {
    if (v === null || v === undefined || v === '') return <span className="text-slate-400 italic">N/A</span>;
    if (typeof v === 'boolean') return <span className="font-bold text-slate-900">{v ? 'Yes' : 'No'}</span>;
    if (typeof v === 'string') {
      const isMasked = v.includes('***') || v.includes('REDACTED') || v.includes('ANONYMIZED');
      if (isMasked) return <span className="bg-slate-900 text-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest rounded-sm">{v}</span>;
      
      const dr = currentRoot?.dynamicFormResponses;
      if (dr) {
        if (k === 'paramedicsId' && dr.paramedicsName) return <span><span className="font-bold text-slate-900">{dr.paramedicsName}</span> <span className="text-slate-500 text-[10px] font-mono tracking-widest uppercase block mt-0.5">ID: {v}</span></span>;
        if (k === 'organizationId' && dr.organizationName) return <span><span className="font-bold text-slate-900">{dr.organizationName}</span> <span className="text-slate-500 text-[10px] font-mono tracking-widest uppercase block mt-0.5">ID: {v}</span></span>;
        if (k === 'submittedBy' && dr.submittedByName) return <span><span className="font-bold text-slate-900">{dr.submittedByName}</span> <span className="text-slate-500 text-[10px] font-mono tracking-widest uppercase block mt-0.5">ID: {v}</span></span>;
      }
      return <span className="text-slate-800 font-medium">{v}</span>;
    }
    if (Array.isArray(v)) return <ul className="list-disc pl-5 space-y-1 mt-1">{v.map((item, i) => <li key={i} className="text-slate-800 font-medium text-sm">{typeof item === 'object' ? 'Nested Data' : String(item)}</li>)}</ul>;
    if (typeof v === 'object') return <div className="mt-1"><MedicalDocument data={v} isNested={true} rootData={currentRoot} /></div>;
    return <span className="text-slate-800 font-medium">{String(v)}</span>;
  };

  if (isNested) {
    return (
      <div className="grid grid-cols-1 gap-3 mt-2 pl-4 border-l-2 border-slate-300">
        {entries.map(([k, v]) => {
          const titleKey = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return (
            <div key={k} className="flex flex-col sm:flex-row sm:gap-2 border-b border-slate-200 pb-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 w-32 shrink-0 pt-0.5">{titleKey}:</span>
              <div className="text-sm">{formatValue(k, v)}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // Root level "PDF" layout
  return (
    <div className="bg-white text-slate-900 p-6 md:p-10 mx-auto max-w-5xl shadow-md border border-slate-300 rounded font-sans">
      {/* PDF Header */}
      <div className="border-b-4 border-slate-900 pb-4 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-wider text-slate-900 font-serif">Patient Care Report</h2>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Official Protected Record</p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Ref</p>
          <p className="text-sm font-mono font-bold text-slate-700">{data.id || data.recordId || 'N/A'}</p>
        </div>
      </div>

      {/* Two Column PDF Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        {entries.map(([k, v]) => {
          if (k === 'id' || k === 'recordId') return null; // skipped

          const titleKey = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

          return (
            <div key={k} className={`border-b border-slate-300 pb-2 ${typeof v === 'object' && !Array.isArray(v) ? 'col-span-1 md:col-span-2' : ''}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{titleKey}</p>
              <div className="text-sm">{formatValue(k, v)}</div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-4 border-t-2 border-slate-300 text-center flex flex-col items-center justify-center gap-2">
        <Shield size={24} className="text-slate-300" />
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">End of Report • HealthCare Platform</p>
      </div>
    </div>
  );
};

const ResultBlock = ({ title, data, color }) => (
  <div className="bg-slate-900/80 rounded-xl overflow-hidden border border-slate-700/50 shadow-2xl mt-6">
    <div className={`px-5 py-3 border-b border-slate-700/50 flex items-center justify-between ${color || 'bg-slate-900'}`}>
      <div className="flex items-center gap-2">
        <CheckCircle size={16} className="text-teal-400" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">Formal PDF View</span>
      </div>
    </div>
    <div className="p-4 md:p-8 bg-slate-950/50 max-h-[70vh] overflow-y-auto">
      <MedicalDocument data={data} />
    </div>
  </div>
);

export default function DeIdentification() {
  const dispatch = useDispatch();
  
  const records    = useSelector(selectRecords);
  const deidResult = useSelector(selectDeIdResult);
  const maskResult = useSelector(selectMaskResult);
  const anonResult = useSelector(selectAnonResult);
  const loading    = useSelector(selectDeIdLoading);
  const error      = useSelector(selectDeIdError);

  const [recordId, setRecordId]         = useState('');
  const [maskStrategy, setMaskStrategy] = useState('FULL_HIPAA_18');
  const [anonMethod, setAnonMethod]     = useState('GENERALIZATION');

  // Fetch real records on load
  useEffect(() => {
    dispatch(fetchRecords());
    return () => { dispatch(clearResults()); };
  }, [dispatch]);

  const handleDeId = () => {
    if (!recordId.trim()) { dispatch(addToast({ type: 'error', message: 'Enter a Record ID first.' })); return; }
    dispatch(fetchDeIdRecord(recordId.trim()));
  };

  const handleMask = () => {
    if (!recordId.trim()) { dispatch(addToast({ type: 'error', message: 'Enter a Record ID first.' })); return; }
    dispatch(maskRecord({ recordId: recordId.trim(), maskingStrategy: maskStrategy }));
  };

  const handleAnon = () => {
    if (!recordId.trim()) { dispatch(addToast({ type: 'error', message: 'Enter a Record ID first.' })); return; }
    dispatch(anonymizeRecord({ recordId: recordId.trim(), anonymizationMethod: anonMethod }));
  };

  const hasResults = deidResult || maskResult || anonResult;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><EyeOff className="text-indigo-400" size={24} />De-identification & Data Masking</h1>
        <p className="text-slate-400 text-sm mt-1">Apply HIPAA-compliant de-identification, masking, and anonymization to patient records.</p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <FileSearch className="text-indigo-400" size={20} />, title: 'De-identify', desc: 'Remove all 18 HIPAA identifiers from a record without modifying source data.', color: 'border-indigo-500/20' },
          { icon: <EyeOff className="text-violet-400" size={20} />, title: 'Mask', desc: 'Redact or pseudonymize specific PHI fields using configurable masking strategies.', color: 'border-violet-500/20' },
          { icon: <Shield className="text-sky-400" size={20} />, title: 'Anonymize', desc: 'Apply statistical anonymization techniques (k-anonymity, generalization) for research use.', color: 'border-sky-500/20' },
        ].map(c => (
          <div key={c.title} className={`glass-card rounded-xl p-5 border ${c.color}`}>
            <div className="flex items-center gap-2 mb-2">{c.icon}<h3 className="text-sm font-semibold text-white">{c.title}</h3></div>
            <p className="text-xs text-slate-400 leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Record ID Input (shared) */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">Record Configuration</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Select Patient Record *</label>
            <select value={recordId} onChange={e => setRecordId(e.target.value)} className={inputCls + ' appearance-none cursor-pointer'}>
              <option value="">-- Choose a Record --</option>
              {records.map(r => (
                <option key={r.id} value={r.id}>
                  {r.patientName || 'Unknown'} (ID: {r.id.split('-')[0]})
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-sm">
            <AlertCircle size={16} />{error}
          </div>
        )}
      </div>

      {/* Three operation panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* De-identify */}
        <div className="glass-card rounded-2xl p-6 space-y-4 border border-indigo-500/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10"><FileSearch className="text-indigo-400" size={18} /></div>
            <h3 className="text-sm font-semibold text-white">De-identify Record</h3>
          </div>
          <p className="text-xs text-slate-400">Retrieve a de-identified version of the record with all PHI stripped.</p>
          <button onClick={handleDeId} disabled={loading.deid || !recordId.trim()}
            className="w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {loading.deid ? <RefreshCw className="animate-spin" size={16} /> : <FileSearch size={16} />}
            {loading.deid ? 'Processing...' : 'Get De-identified'}
          </button>
        </div>

        {/* Mask */}
        <div className="glass-card rounded-2xl p-6 space-y-4 border border-violet-500/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-violet-500/10"><EyeOff className="text-violet-400" size={18} /></div>
            <h3 className="text-sm font-semibold text-white">Mask Record Data</h3>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Masking Strategy</label>
            <select value={maskStrategy} onChange={e => setMaskStrategy(e.target.value)} className={inputCls + ' appearance-none'}>
              {MASKING_STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <button onClick={handleMask} disabled={loading.mask || !recordId.trim()}
            className="w-full py-2.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {loading.mask ? <RefreshCw className="animate-spin" size={16} /> : <EyeOff size={16} />}
            {loading.mask ? 'Masking...' : 'Apply Masking'}
          </button>
        </div>

        {/* Anonymize */}
        <div className="glass-card rounded-2xl p-6 space-y-4 border border-sky-500/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/10"><Shield className="text-sky-400" size={18} /></div>
            <h3 className="text-sm font-semibold text-white">Anonymize Record</h3>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Anonymization Method</label>
            <select value={anonMethod} onChange={e => setAnonMethod(e.target.value)} className={inputCls + ' appearance-none'}>
              {ANON_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <button onClick={handleAnon} disabled={loading.anonymize || !recordId.trim()}
            className="w-full py-2.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {loading.anonymize ? <RefreshCw className="animate-spin" size={16} /> : <Shield size={16} />}
            {loading.anonymize ? 'Anonymizing...' : 'Anonymize'}
          </button>
        </div>
      </div>

      {/* Results */}
      {hasResults && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-white">Results</h2>
          {deidResult && <ResultBlock title="De-identified Record" data={deidResult} />}
          {maskResult && <ResultBlock title="Masked Record Data" data={maskResult} />}
          {anonResult && <ResultBlock title="Anonymized Record" data={anonResult} />}
        </div>
      )}
    </div>
  );
}
