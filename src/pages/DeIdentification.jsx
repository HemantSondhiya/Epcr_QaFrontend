import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RefreshCw, EyeOff, Shield, FileSearch, CheckCircle, AlertCircle } from 'lucide-react';
import { addToast } from '../store/slices/uiSlice';
import { fetchRecords, selectRecords } from '../store/slices/epcrSlice';
import { fetchDeIdRecord, maskRecord, anonymizeRecord, clearResults, selectDeIdResult, selectMaskResult, selectAnonResult, selectDeIdLoading, selectDeIdError } from '../store/slices/deIdSlice';

const MASKING_STRATEGIES = [
  { value: 'FULL_HIPAA_18', label: 'Full HIPAA 18 (Remove all identifiers)' },
  { value: 'PARTIAL_MASKING', label: 'Partial Masking (Redact specific fields)' },
  { value: 'PSEUDO_ANONYMIZATION', label: 'Pseudo-Anonymization (Replace with tokens)' },
];
const ANON_METHODS = [
  { value: 'GENERALIZATION', label: 'Generalization (broaden specific values)' },
  { value: 'SUPPRESSION', label: 'Suppression (remove sensitive records)' },
  { value: 'DATA_SWAPPING', label: 'Data Swapping (permute values across records)' },
  { value: 'K_ANONYMITY', label: 'k-Anonymity (ensure indistinguishability)' },
];

const MedicalDocument = ({ data, isNested = false, rootData = null }) => {
  if (!data || typeof data !== 'object') return null;
  const currentRoot = rootData || data;

  const entries = Object.entries(data).filter(([k]) => {
    if (isNested && (k === 'paramedicsName' || k === 'organizationName' || k === 'submittedByName')) return false;
    return true;
  });

  const formatValue = (k, v) => {
    const sensitiveKeys = ['patientName', 'patientPhone', 'patientAddress', 'patientDateOfBirth', 'patientSSNLast4', 'email', 'medicalHistory', 'incidentLocation', 'incidentDescription', 'diagnosis', 'treatmentProvided', 'age', 'height', 'weight', 'bloodGroup', 'doctor', 'currentMedicines', 'comorbidity', 'allergy', 'spo2', 'heartRate', 'respirationRate', 'bloodSugar', 'diastolicBp', 'systolicBp', 'pulseRate', 'temperature', 'hemoglobin', 'incidentNumber', 'sceneAssessment', 'crew', 'timeline', 'structuredComplaints', 'structuredVitals', 'icd10Code', 'primaryImpression', 'secondaryImpression', 'structuredMedications', 'structuredProcedures', 'transport', 'consent', 'clinicalData', 'attachmentIds', 'auditTrail', 'feedback'];
    const isDeId = currentRoot?.patientName === 'REDACTED' || currentRoot?.incidentLocation === 'REDACTED' || currentRoot?.patientId === 'REDACTED';

    if (v === null || v === undefined || v === '' || v === 'N/A' || (Array.isArray(v) && v.length === 0)) {
      if (isDeId && sensitiveKeys.includes(k)) return <span className="badge badge-red animate-pulse">REDACTED</span>;
      return <span className="text-[#A0AECB] italic text-xs font-bold uppercase tracking-wider">Empty</span>;
    }
    
    if (typeof v === 'boolean') return <span className={v ? 'badge badge-green' : 'badge badge-red'}>{v ? 'True' : 'False'}</span>;
    if (typeof v === 'string') {
      const isMasked = v.includes('***') || v.includes('REDACTED') || v.includes('ANONYMIZED');
      if (isMasked) return <span className="badge badge-gray">{v}</span>;
      
      if (k === 'paramedicsId' && currentRoot?.paramedicsName) return <div><p className="font-bold text-[#0F1A3A]">{currentRoot.paramedicsName}</p><p className="text-xs text-[#8A97B0]">ID: {v}</p></div>;
      if (k === 'organizationId' && currentRoot?.organizationName) return <div><p className="font-bold text-[#0F1A3A]">{currentRoot.organizationName}</p><p className="text-xs text-[#8A97B0]">ID: {v}</p></div>;
      if (k === 'submittedBy' && currentRoot?.submittedByName) return <div><p className="font-bold text-[#0F1A3A]">{currentRoot.submittedByName}</p><p className="text-xs text-[#8A97B0]">ID: {v}</p></div>;
      if (k === 'qaApprovedBy' && currentRoot?.qaApprovedByName) return <div><p className="font-bold text-[#0F1A3A]">{currentRoot.qaApprovedByName}</p><p className="text-xs text-[#8A97B0]">ID: {v}</p></div>;
      
      return <span className="text-[#4B5A7A] font-medium text-sm">{v}</span>;
    }
    if (Array.isArray(v)) {
      return (
        <ul className="space-y-2 mt-2">
          {v.map((item, i) => (
            <li key={i} className="pl-4 border-l-2 border-brand-blue">
              {typeof item === 'object' ? <div className="bg-[#F8FAFF] p-4 rounded-xl border border-[#DDE3F0]"><MedicalDocument data={item} isNested={true} rootData={currentRoot} /></div> : <span className="text-[#4B5A7A] text-sm">{String(item)}</span>}
            </li>
          ))}
        </ul>
      );
    }
    if (typeof v === 'object') return <div className="mt-2"><MedicalDocument data={v} isNested={true} rootData={currentRoot} /></div>;
    return <span className="text-[#4B5A7A] text-sm">{String(v)}</span>;
  };

  if (isNested) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {entries.map(([k, v]) => {
          const titleKey = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return (
            <div key={k} className="flex flex-col gap-1 border-b border-[#F0F4FC] pb-2 last:border-0">
              <span className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider">{titleKey}</span>
              <div>{formatValue(k, v)}</div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="card p-8">
      <div className="border-b border-[#F0F4FC] pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] flex items-center justify-center text-brand-blue">
              <Shield size={24} />
           </div>
           <div>
              <h2 className="text-2xl font-black text-[#0F1A3A] tracking-tight">Clinical Report</h2>
              <div className="flex items-center gap-2 mt-1">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                 <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Privacy Restricted</p>
              </div>
           </div>
        </div>
        <div className="bg-[#F8FAFF] px-4 py-2 rounded-xl border border-[#DDE3F0] text-right">
           <p className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider mb-0.5">Manifest ID</p>
           <p className="text-sm font-mono font-bold text-brand-blue">{data.id || data.recordId || 'N/A'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {entries.map(([k, v]) => {
          if (k === 'id' || k === 'recordId') return null;
          const titleKey = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return (
            <div key={k} className={typeof v === 'object' && !Array.isArray(v) ? 'col-span-full' : ''}>
               <p className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider mb-2">{titleKey}</p>
               <div className="bg-[#F8FAFF] p-3 rounded-xl border border-[#DDE3F0]">
                  {formatValue(k, v)}
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ResultBlock = ({ title, data }) => (
  <div className="mt-8 animate-fade-in">
    <div className="flex items-center justify-between mb-4 px-2">
       <h3 className="font-black text-[#0F1A3A] text-lg flex items-center gap-2"><CheckCircle size={20} className="text-green-500" /> {title}</h3>
    </div>
    <MedicalDocument data={data} />
  </div>
);

export default function DeIdentification() {
  const dispatch = useDispatch();
  const records = useSelector(selectRecords);
  const deidResult = useSelector(selectDeIdResult);
  const maskResult = useSelector(selectMaskResult);
  const anonResult = useSelector(selectAnonResult);
  const loading = useSelector(selectDeIdLoading);
  const error = useSelector(selectDeIdError);

  const [recordId, setRecordId] = useState('');
  const [maskStrategy, setMaskStrategy] = useState('FULL_HIPAA_18');
  const [anonMethod, setAnonMethod] = useState('GENERALIZATION');

  useEffect(() => { dispatch(fetchRecords()); return () => { dispatch(clearResults()); }; }, [dispatch]);

  const handleAction = (actionFn, params) => {
    if (!recordId.trim()) { dispatch(addToast({ type: 'error', message: 'Select a record first.' })); return; }
    dispatch(actionFn(params));
  };

  const hasResults = deidResult || maskResult || anonResult;

  return (
    <div className="space-y-6 pb-10 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="section-label mb-1">Compliance & Privacy</p>
          <h1 className="text-2xl font-black text-[#0F1A3A] tracking-tight">Data <span className="text-brand-blue">Governance</span></h1>
          <p className="text-sm text-[#8A97B0] mt-0.5">De-identification and anonymization engine</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl border border-green-100 font-bold text-sm">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Core Active
        </div>
      </div>

      <div className="card p-6">
         <h2 className="text-lg font-black text-[#0F1A3A] mb-4">Select Source Record</h2>
         <div className="max-w-md space-y-2">
            <select value={recordId} onChange={e => setRecordId(e.target.value)} className="input py-2.5 text-sm">
               <option value="">-- Choose Patient Record --</option>
               {records.map(r => <option key={r.id} value={r.id}>{r.patientName || 'Unknown'} (ID: {r.id.substring(0,8)})</option>)}
            </select>
         </div>
         {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
               <AlertCircle size={16} /> <span className="font-bold">{error}</span>
            </div>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 flex flex-col hover:-translate-y-1 transition-transform">
           <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-brand-blue flex items-center justify-center mb-4">
              <FileSearch size={20} />
           </div>
           <h3 className="font-black text-[#0F1A3A] mb-2">De-identify</h3>
           <p className="text-sm text-[#8A97B0] mb-6 flex-1">Remove all 18 HIPAA identifiers while preserving clinical schema.</p>
           <button onClick={() => handleAction(fetchDeIdRecord, recordId.trim())} disabled={loading.deid || !recordId} className="btn-primary w-full justify-center py-2.5 text-sm">
              {loading.deid ? <RefreshCw className="animate-spin" size={16} /> : <FileSearch size={16} />} 
              {loading.deid ? 'Processing...' : 'Run De-identification'}
           </button>
        </div>

        <div className="card p-6 flex flex-col hover:-translate-y-1 transition-transform">
           <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
              <EyeOff size={20} />
           </div>
           <h3 className="font-black text-[#0F1A3A] mb-2">Mask Data</h3>
           <p className="text-sm text-[#8A97B0] mb-4">Targeted PHI redaction strategies.</p>
           <div className="mb-6 flex-1 space-y-1">
              <label className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider">Strategy</label>
              <select value={maskStrategy} onChange={e => setMaskStrategy(e.target.value)} className="input py-2 text-sm">
                 {MASKING_STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
           </div>
           <button onClick={() => handleAction(maskRecord, { recordId: recordId.trim(), maskingStrategy: maskStrategy })} disabled={loading.mask || !recordId} className="btn-primary bg-orange-500 hover:bg-orange-600 text-white w-full justify-center py-2.5 text-sm border-none shadow-orange-500/20">
              {loading.mask ? <RefreshCw className="animate-spin" size={16} /> : <EyeOff size={16} />} 
              {loading.mask ? 'Masking...' : 'Apply Mask'}
           </button>
        </div>

        <div className="card p-6 flex flex-col hover:-translate-y-1 transition-transform">
           <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-4">
              <Shield size={20} />
           </div>
           <h3 className="font-black text-[#0F1A3A] mb-2">Anonymize</h3>
           <p className="text-sm text-[#8A97B0] mb-4">Statistical anonymization for research.</p>
           <div className="mb-6 flex-1 space-y-1">
              <label className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider">Method</label>
              <select value={anonMethod} onChange={e => setAnonMethod(e.target.value)} className="input py-2 text-sm">
                 {ANON_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
           </div>
           <button onClick={() => handleAction(anonymizeRecord, { recordId: recordId.trim(), anonymizationMethod: anonMethod })} disabled={loading.anonymize || !recordId} className="btn-primary bg-green-600 hover:bg-green-700 text-white w-full justify-center py-2.5 text-sm border-none shadow-green-600/20">
              {loading.anonymize ? <RefreshCw className="animate-spin" size={16} /> : <Shield size={16} />} 
              {loading.anonymize ? 'Synthesizing...' : 'Apply Anonymity'}
           </button>
        </div>
      </div>

      {hasResults && (
        <div className="pt-6 border-t border-[#F0F4FC]">
          {deidResult && <ResultBlock title="De-identified Record" data={deidResult} />}
          {maskResult && <ResultBlock title="Masked Record" data={maskResult} />}
          {anonResult && <ResultBlock title="Anonymized Record" data={anonResult} />}
        </div>
      )}
    </div>
  );
}
