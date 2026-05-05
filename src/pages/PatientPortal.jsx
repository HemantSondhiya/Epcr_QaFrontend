import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RefreshCw, X, Eye, FileEdit, Ban, History, User, AlertCircle, ChevronRight, Shield } from 'lucide-react';
import client from '../api/client';
import { addToast } from '../store/slices/uiSlice';
import { 
  fetchPortalData, 
  createAmendment, 
  createRestriction,
  selectPortalRecords,
  selectPortalAmendments,
  selectPortalRestrictions,
  selectPortalDisclosures,
  selectPortalLoading
} from '../store/slices/patientPortalSlice';

const asList = d => Array.isArray(d) ? d : (d?.content ?? []);
const inputCls = 'w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none';

const RESTRICTION_TYPES = ['NO_MARKETING', 'NO_RESEARCH', 'NO_THIRD_PARTY', 'NO_INSURANCE', 'CUSTOM'];
const DATA_CATEGORIES = ['ALL', 'PHI', 'DIAGNOSIS', 'MEDICATIONS', 'VITALS', 'DEMOGRAPHICS'];

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
    if (entries.length === 0) return null;
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

  return (
    <div className="bg-white text-slate-900 p-6 md:p-10 mx-auto w-full shadow-md border border-slate-300 rounded font-sans">
      <div className="border-b-4 border-slate-900 pb-4 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-wider text-slate-900 font-serif">Patient Care Report</h2>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Official Medical Record</p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Ref</p>
          <p className="text-sm font-mono font-bold text-slate-700">{data.id || data.recordId || 'N/A'}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        {entries.map(([k, v]) => {
          if (k === 'id' || k === 'recordId') return null;
          const titleKey = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return (
            <div key={k} className={`border-b border-slate-300 pb-2 ${typeof v === 'object' && !Array.isArray(v) ? 'col-span-1 md:col-span-2' : ''}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{titleKey}</p>
              <div className="text-sm">{formatValue(k, v)}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-12 pt-4 border-t-2 border-slate-300 text-center flex flex-col items-center justify-center gap-2">
        <Shield size={24} className="text-slate-300" />
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">End of Report • HealthCare Platform</p>
      </div>
    </div>
  );
};

export default function PatientPortal() {
  const dispatch = useDispatch();
  const [tab, setTab] = useState('records');
  
  const records      = useSelector(selectPortalRecords);
  const amendments   = useSelector(selectPortalAmendments);
  const restrictions = useSelector(selectPortalRestrictions);
  const disclosures  = useSelector(selectPortalDisclosures);
  const loading      = useSelector(selectPortalLoading);

  const [viewRecord, setViewRecord] = useState(null);
  const [amendOpen, setAmendOpen] = useState(false);
  const [restOpen, setRestOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [amendForm, setAmendForm] = useState({
    organizationId: '', patientId: '', recordId: '',
    reason: '', requestedChanges: [{ field: '', currentValue: '', proposedValue: '' }]
  });
  const [restForm, setRestForm] = useState({
    organizationId: '', patientId: '',
    restrictionType: 'NO_MARKETING', fields: []
  });

  const fetchAll = useCallback(() => {
    dispatch(fetchPortalData());
  }, [dispatch]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // API: POST /api/patient-portal/amendment-requests
  // Body: CreateAmendmentRequest { organizationId, patientId, recordId, requestedChanges, reason }
  const handleAmend = async e => {
    e.preventDefault(); setSubmitting(true);
    try {
      const payload = {
        organizationId: amendForm.organizationId || '',
        patientId: amendForm.patientId || '',
        recordId: amendForm.recordId,
        reason: amendForm.reason,
        requestedChanges: amendForm.requestedChanges
          .filter(c => c.field.trim())
          .map(c => ({ [c.field]: c.proposedValue })),
      };
      await dispatch(createAmendment(payload)).unwrap();
      dispatch(addToast({ type: 'success', message: 'Amendment request submitted.' }));
      setAmendOpen(false);
      setAmendForm({ organizationId: '', patientId: '', recordId: '', reason: '', requestedChanges: [{ field: '', currentValue: '', proposedValue: '' }] });
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err || 'Failed to submit amendment.' }));
    } finally { setSubmitting(false); }
  };

  // API: POST /api/patient-portal/disclosure-restrictions
  // Body: CreateDisclosureRestrictionRequest { organizationId, patientId, restrictionType, fields[] }
  const handleRestriction = async e => {
    e.preventDefault(); setSubmitting(true);
    try {
      await dispatch(createRestriction({
        organizationId: restForm.organizationId || '',
        patientId: restForm.patientId || '',
        restrictionType: restForm.restrictionType,
        fields: restForm.fields,
      })).unwrap();
      dispatch(addToast({ type: 'success', message: 'Disclosure restriction created.' }));
      setRestOpen(false);
      setRestForm({ organizationId: '', patientId: '', restrictionType: 'NO_MARKETING', fields: [] });
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err || 'Failed.' }));
    } finally { setSubmitting(false); }
  };

  const viewRec = async id => {
    try { const r = await client.get(`/api/patient-portal/records/${id}`); setViewRecord(r.data); }
    catch (_) { dispatch(addToast({ type: 'error', message: 'Failed to load record.' })); }
  };

  const TABS = [
    { key: 'records', label: `My Records (${records.length})`, icon: <User size={15} /> },
    { key: 'amendments', label: `Amendments (${amendments.length})`, icon: <FileEdit size={15} /> },
    { key: 'restrictions', label: `Restrictions (${restrictions.length})`, icon: <Ban size={15} /> },
    { key: 'disclosures', label: `Disclosures (${disclosures.length})`, icon: <History size={15} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><User className="text-sky-400" size={24} />Patient Portal</h1>
          <p className="text-slate-400 text-sm mt-1">Patient rights management — records, amendments, restrictions, and disclosure history.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchAll} disabled={loading} className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={() => setAmendOpen(true)} className="flex items-center gap-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors"><FileEdit size={16} /><span>Request Amendment</span></button>
          <button onClick={() => setRestOpen(true)} className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors"><Ban size={16} /><span>Add Restriction</span></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-700/50">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.key ? 'text-teal-400 border-teal-500' : 'text-slate-400 border-transparent hover:text-slate-300'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Records tab */}
      {tab === 'records' && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto min-h-[280px]">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-[var(--border-color)]">
                {['Patient', 'Incident Date', 'Status', 'Care Level', 'Transport', 'Actions'].map(h => <th key={h} className="px-6 py-4 font-medium">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {loading ? (<tr><td colSpan="6" className="py-12 text-center text-slate-400"><RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-sky-400" />Loading...</td></tr>)
                  : records.length === 0 ? (<tr><td colSpan="6" className="py-12 text-center text-slate-400"><User className="w-10 h-10 mx-auto mb-3 text-slate-600" /><p>No records found. Patient must be authenticated.</p></td></tr>)
                    : records.map(r => (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4"><p className="text-sm font-medium text-slate-200">{r.patientName || '—'}</p><p className="text-xs text-slate-500">{r.id?.substring(0, 12)}...</p></td>
                        <td className="px-6 py-4 text-sm text-slate-400">{r.incidentDateTime ? new Date(r.incidentDateTime).toLocaleDateString() : '—'}</td>
                        <td className="px-6 py-4"><span className="px-2.5 py-1 text-xs rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">{r.status || 'DRAFT'}</span></td>
                        <td className="px-6 py-4 text-sm text-slate-400">{r.careLevel || '—'}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{r.transportMode || '—'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => viewRec(r.id)} className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 rounded-md"><Eye size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Amendments tab */}
      {tab === 'amendments' && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto min-h-[280px]">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-[var(--border-color)]">
                {['Record ID', 'Reason', 'Changes', 'Status', 'Date'].map(h => <th key={h} className="px-6 py-4 font-medium">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {loading ? (<tr><td colSpan="6" className="py-12 text-center text-slate-400"><RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-teal-500" />Loading...</td></tr>)
                  : amendments.length === 0 ? (<tr><td colSpan="6" className="py-12 text-center text-slate-400"><FileEdit className="w-10 h-10 mx-auto mb-3 text-slate-600" /><p>No amendment requests found.</p></td></tr>)
                    : amendments.map(a => (
                      <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-200">{a.recordId?.substring(0, 16) || '—'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400 max-w-[200px]">
                          {a.reason || '—'}
                        </td>
                        <td className="px-6 py-4">
                          {(a.requestedChanges || []).length > 0 ? (
                            <span className="text-xs text-slate-400">{(a.requestedChanges || []).length} change(s) requested</span>
                          ) : <span className="text-slate-500">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-xs rounded-full border ${a.status === 'APPROVED' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                              a.status === 'DENIED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>{a.status || 'PENDING'}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Restrictions tab */}
      {tab === 'restrictions' && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto min-h-[280px]">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-[var(--border-color)]">
                {['Restriction Type', 'Fields', 'Organization', 'Status', 'Created'].map(h => <th key={h} className="px-6 py-4 font-medium">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {loading ? (<tr><td colSpan="6" className="py-12 text-center text-slate-400"><RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-teal-500" />Loading...</td></tr>)
                  : restrictions.length === 0 ? (<tr><td colSpan="6" className="py-12 text-center text-slate-400"><Ban className="w-10 h-10 mx-auto mb-3 text-slate-600" /><p>No disclosure restrictions set.</p></td></tr>)
                    : restrictions.map(r => (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 text-xs rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {r.restrictionType?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {(r.fields || []).length > 0
                              ? (r.fields || []).map(f => <span key={f} className="text-xs px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700">{f}</span>)
                              : <span className="text-slate-500 text-sm">All fields</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{r.organizationId?.substring(0, 14) || '—'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${r.status === 'APPROVED' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                              r.status === 'DENIED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                'bg-sky-500/10 text-sky-400 border-sky-500/20'
                            }`}>{r.status || 'Pending'}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Disclosures tab */}
      {tab === 'disclosures' && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto min-h-[280px]">
            <table className="w-full text-left">
              <thead><tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-[var(--border-color)]">
                {['Recipient', 'Purpose', 'Legal Basis', 'Method', 'Data Elements', 'Date'].map(h => <th key={h} className="px-6 py-4 font-medium">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {loading ? (<tr><td colSpan="6" className="py-12 text-center text-slate-400"><RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-teal-500" />Loading...</td></tr>)
                  : disclosures.length === 0 ? (<tr><td colSpan="6" className="py-12 text-center text-slate-400"><History className="w-10 h-10 mx-auto mb-3 text-slate-600" /><p>No disclosure history found.</p></td></tr>)
                    : disclosures.map(d => (
                      <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-300">{d.recipient?.substring(0, 24) || '—'}</td>
                        <td className="px-6 py-4"><span className="px-2.5 py-1 text-xs rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">{d.purpose}</span></td>
                        <td className="px-6 py-4 text-sm text-slate-400">{d.legalBasis || '—'}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{d.method || '—'}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{(d.dataElements || []).join(', ') || '—'}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Record modal */}
      {viewRecord && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="text-teal-400" size={20} /> Official Medical Record
              </h2>
              <button onClick={() => setViewRecord(null)} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-4 md:p-8 bg-slate-950/50 overflow-y-auto">
              <MedicalDocument data={viewRecord} />
            </div>
          </div>
        </div>
      )}

      {/* Amendment Request Modal */}
      {amendOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-xl font-bold text-white">Request Record Amendment</h2>
              <button onClick={() => setAmendOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleAmend} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Patient ID *</label>
                    <input required value={amendForm.patientId} onChange={e => setAmendForm({ ...amendForm, patientId: e.target.value })}
                      placeholder="patient-abc-123" className={inputCls} /></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Record ID *</label>
                    <input required value={amendForm.recordId} onChange={e => setAmendForm({ ...amendForm, recordId: e.target.value })}
                      placeholder="record-uuid" className={inputCls} /></div>
                </div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Reason for Amendment *</label>
                  <input required value={amendForm.reason} onChange={e => setAmendForm({ ...amendForm, reason: e.target.value })}
                    placeholder="Data entry error — incorrect date of birth" className={inputCls} /></div>
                {/* Requested Changes */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">Requested Changes *</label>
                  {amendForm.requestedChanges.map((chg, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                      <input value={chg.field} onChange={e => { const rc = [...amendForm.requestedChanges]; rc[idx] = { ...rc[idx], field: e.target.value }; setAmendForm({ ...amendForm, requestedChanges: rc }); }}
                        placeholder="Field name" className={inputCls} />
                      <input value={chg.currentValue} onChange={e => { const rc = [...amendForm.requestedChanges]; rc[idx] = { ...rc[idx], currentValue: e.target.value }; setAmendForm({ ...amendForm, requestedChanges: rc }); }}
                        placeholder="Current (incorrect) value" className={inputCls} />
                      <input value={chg.proposedValue} onChange={e => { const rc = [...amendForm.requestedChanges]; rc[idx] = { ...rc[idx], proposedValue: e.target.value }; setAmendForm({ ...amendForm, requestedChanges: rc }); }}
                        placeholder="Proposed (correct) value" className={inputCls} />
                    </div>
                  ))}
                  <button type="button" onClick={() => setAmendForm({ ...amendForm, requestedChanges: [...amendForm.requestedChanges, { field: '', currentValue: '', proposedValue: '' }] })}
                    className="text-xs text-teal-400 hover:text-teal-300">+ Add another change</button>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setAmendOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                    {submitting ? <RefreshCw className="animate-spin" size={16} /> : <FileEdit size={16} />}{submitting ? 'Submitting...' : 'Submit Request'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Restriction Modal */}
      {restOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-xl font-bold text-white">Create Disclosure Restriction</h2>
              <button onClick={() => setRestOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleRestriction} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Patient ID *</label>
                    <input required value={restForm.patientId} onChange={e => setRestForm({ ...restForm, patientId: e.target.value })}
                      placeholder="patient-abc-123" className={inputCls} /></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Organization ID</label>
                    <input value={restForm.organizationId} onChange={e => setRestForm({ ...restForm, organizationId: e.target.value })}
                      placeholder="Your org ID" className={inputCls} /></div>
                </div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Restriction Type *</label>
                  <select required value={restForm.restrictionType} onChange={e => setRestForm({ ...restForm, restrictionType: e.target.value })}
                    className={inputCls + ' appearance-none'}>
                    {RESTRICTION_TYPES.map(t => <option key={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select></div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">Specific Fields to Restrict (optional)</label>
                  <input value={(restForm.fields || []).join(', ')}
                    onChange={e => setRestForm({ ...restForm, fields: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    placeholder="e.g. diagnosis, medications (comma-separated, or leave blank for all)" className={inputCls} />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setRestOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                    {submitting ? <RefreshCw className="animate-spin" size={16} /> : <Ban size={16} />}{submitting ? 'Creating...' : 'Create Restriction'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
