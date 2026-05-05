import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Search, RefreshCw, X, Eye, BookOpen, Filter } from 'lucide-react';
import client from '../api/client';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import {
  fetchDisclosures,
  createDisclosure,
  selectDisclosures,
  selectHipaaLoading
} from '../store/slices/hipaaSlice';

// ── Constants ────────────────────────────────────────────────────────
const PURPOSE_OPTIONS = [
  { value: 'TREATMENT',      label: 'Treatment' },
  { value: 'PAYMENT',        label: 'Payment' },
  { value: 'OPERATIONS',     label: 'Health Care Operations' },
  { value: 'RESEARCH',       label: 'Research' },
  { value: 'PUBLIC_HEALTH',  label: 'Public Health Activity' },
  { value: 'LAW_ENFORCEMENT',label: 'Law Enforcement' },
  { value: 'OTHER',          label: 'Other' },
];
const LEGAL_BASIS_OPTIONS = [
  { value: 'HIPAA_TPO',             label: 'HIPAA TPO (Treatment/Payment/Operations)' },
  { value: 'PATIENT_AUTHORIZATION', label: 'Patient Authorization' },
  { value: 'PUBLIC_INTEREST',       label: 'Public Interest' },
  { value: 'LAW_ENFORCEMENT',       label: 'Law Enforcement' },
  { value: 'JUDICIAL_ORDER',        label: 'Judicial Order' },
];
const METHOD_OPTIONS = [
  { value: 'SECURE_TRANSFER', label: 'Secure Transfer' },
  { value: 'EMAIL',           label: 'Encrypted Email' },
  { value: 'FAX',             label: 'Secure Fax' },
  { value: 'MAIL',            label: 'Physical Mail' },
  { value: 'PORTAL',          label: 'Patient Portal' },
  { value: 'IN_PERSON',       label: 'In Person' },
];
const DATA_ELEMENTS = [
  'diagnosis', 'medications', 'vitals', 'patient_info', 'treatment', 'billing', 'labs', 'imaging',
];
const PURPOSE_COLORS = {
  TREATMENT: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  PAYMENT:   'bg-sky-500/10 text-sky-400 border-sky-500/20',
  RESEARCH:  'bg-violet-500/10 text-violet-400 border-violet-500/20',
  OTHER:     'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const inputCls = 'w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 outline-none';
const asList   = d => Array.isArray(d) ? d : (d?.content ?? []);

const purposeLabel    = v => PURPOSE_OPTIONS.find(p => p.value === v)?.label       || v;
const legalBasisLabel = v => LEGAL_BASIS_OPTIONS.find(l => l.value === v)?.label   || v;
const methodLabel     = v => METHOD_OPTIONS.find(m => m.value === v)?.label        || v;

const purposeColor = v => PURPOSE_COLORS[v] || PURPOSE_COLORS.OTHER;

const emptyForm = {
  patientId: '', organizationId: '', recordId: '',
  recipientName: '', recipientType: '',
  purpose: 'TREATMENT', legalBasis: 'HIPAA_TPO',
  consentId: '', method: 'SECURE_TRANSFER', dataElements: [],
};

export default function HipaaDisclosure() {
  const dispatch = useDispatch();
  const user     = useSelector(selectUser);

  const disclosures = useSelector(selectDisclosures);
  const loading     = useSelector(selectHipaaLoading);
  const [search,       setSearch]       = useState('');
  const [filterPurpose,setFilterPurpose]= useState('ALL');
  const [patId,        setPatId]        = useState('');
  const [createOpen,   setCreateOpen]   = useState(false);
  const [viewOpen,     setViewOpen]     = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [form,         setForm]         = useState({ ...emptyForm });

  // ── Fetch ──────────────────────────────────────────────────────────
  // API: GET /api/hipaa/disclosure?organizationId={id}
  // API: GET /api/disclosures/patients/{patientId}
  const fetch_ = useCallback(() => {
    dispatch(fetchDisclosures({ 
      patientId: patId.trim() || undefined, 
      organizationId: user?.organizationId 
    }));
  }, [dispatch, patId, user]);

  useEffect(() => { fetch_(); }, [fetch_]);

  // ── Create ─────────────────────────────────────────────────────────
  // API: POST /api/disclosures  (CreateDisclosureRequest)
  const handleCreate = async e => {
    e.preventDefault();
    if (!form.patientId.trim()) {
      dispatch(addToast({ type: 'error', message: 'Patient ID is required.' }));
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        organizationId: form.organizationId || user?.organizationId,
        patientId:      form.patientId.trim(),
        recordId:       form.recordId       || undefined,
        recipientType:  form.recipientType  || undefined,
        recipientName:  form.recipientName  || undefined,
        purpose:        form.purpose,
        legalBasis:     form.legalBasis,
        consentId:      form.consentId      || undefined,
        method:         form.method,
        dataElements:   form.dataElements,
      };
      await dispatch(createDisclosure(payload)).unwrap();
      dispatch(addToast({ type: 'success', message: 'Disclosure log created.' }));
      setCreateOpen(false);
      setForm({ ...emptyForm });
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err || 'Failed to create disclosure log.' }));
    } finally { setSubmitting(false); }
  };

  // ── View ───────────────────────────────────────────────────────────
  // API: GET /api/hipaa/disclosure/{id}
  const view = async id => {
    try {
      const r = await client.get(`/api/hipaa/disclosure/${id}`);
      setSelected(r.data);
      setViewOpen(true);
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to load disclosure.' }));
    }
  };

  const toggleElement = el =>
    setForm(f => ({
      ...f,
      dataElements: f.dataElements.includes(el) ? f.dataElements.filter(x => x !== el) : [...f.dataElements, el],
    }));

  const filtered = disclosures.filter(d => {
    const matchSearch =
      d.patientId?.toLowerCase().includes(search.toLowerCase()) ||
      d.recipientName?.toLowerCase().includes(search.toLowerCase()) ||
      purposeLabel(d.purpose).toLowerCase().includes(search.toLowerCase());
    const matchPurpose = filterPurpose === 'ALL' || d.purpose === filterPurpose;
    return matchSearch && matchPurpose;
  });

  const purposeCounts = {
    TREATMENT: disclosures.filter(d => d.purpose === 'TREATMENT').length,
    RESEARCH:  disclosures.filter(d => d.purpose === 'RESEARCH').length,
    OTHER:     disclosures.filter(d => !['TREATMENT', 'RESEARCH'].includes(d.purpose)).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="text-violet-400" size={24} />
            Disclosure Accounting (AoD)
          </h1>
          <p className="text-slate-400 text-sm mt-1">Track all PHI disclosures — HIPAA Accounting of Disclosures compliance.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetch_} disabled={loading} className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50 transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 bg-violet-500 hover:bg-violet-400 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(139,92,246,0.3)]">
            <Plus size={18} /><span>Log Disclosure</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['Total Disclosures', disclosures.length, 'text-white'],
          ['Treatment (TPO)',   purposeCounts.TREATMENT, 'text-teal-400'],
          ['Research',         purposeCounts.RESEARCH,  'text-violet-400'],
          ['Other Purposes',   purposeCounts.OTHER,     'text-slate-400'],
        ].map(([l, v, cls]) => (
          <div key={l} className="glass-card rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">{l}</p>
            <p className={`text-3xl font-bold mt-1 ${cls}`}>{v}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                className="bg-slate-900/50 border border-slate-700/50 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 w-48" />
            </div>
            <input value={patId} onChange={e => setPatId(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetch_()}
              placeholder="Patient ID (press ↵)"
              className="bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 w-48" />
            <select value={filterPurpose} onChange={e => setFilterPurpose(e.target.value)}
              className="bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 appearance-none">
              <option value="ALL">All Purposes</option>
              {PURPOSE_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <span className="text-xs text-slate-500">{filtered.length} disclosures</span>
        </div>

        <div className="overflow-x-auto min-h-[280px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-[var(--border-color)]">
                {['Patient', 'Recipient', 'Purpose', 'Legal Basis', 'Method', 'Data Elements', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr><td colSpan="8" className="py-12 text-center text-slate-400">
                  <RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-violet-400" />Loading...
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="8" className="py-12 text-center text-slate-400">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                  <p>No disclosures found.</p>
                  <p className="text-xs text-slate-600 mt-1">Enter a Patient ID above to search by patient, or log a new disclosure.</p>
                </td></tr>
              ) : filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm">
                    <div className="text-slate-200 font-medium">{d.patientId?.substring(0, 16) || '—'}</div>
                    {d.recordId && <div className="text-[10px] text-slate-500 font-mono">Rec: {d.recordId?.substring(0, 12)}…</div>}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="text-slate-300">{d.recipientName || '—'}</div>
                    {d.recipientType && <div className="text-[10px] text-slate-500">{d.recipientType.replace(/_/g,' ')}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${purposeColor(d.purpose)}`}>
                      {purposeLabel(d.purpose)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{legalBasisLabel(d.legalBasis)}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{methodLabel(d.method)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(d.dataElements || []).slice(0, 2).map(el => (
                        <span key={el} className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-400 rounded border border-slate-700">{el}</span>
                      ))}
                      {(d.dataElements || []).length > 2 && <span className="text-xs text-slate-500">+{d.dataElements.length - 2}</span>}
                      {!d.dataElements?.length && <span className="text-xs text-slate-500">—</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {d.disclosedAt ? new Date(d.disclosedAt).toLocaleDateString() : d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => view(d.id)} className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 rounded-md transition-colors" title="View Details">
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE MODAL ── */}
      {createOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0">
              <div>
                <h2 className="text-xl font-bold text-white">Log PHI Disclosure</h2>
                <p className="text-xs text-slate-500 mt-0.5">Record a new HIPAA Accounting of Disclosures entry</p>
              </div>
              <button onClick={() => { setCreateOpen(false); setForm({ ...emptyForm }); }} className="text-slate-400 hover:text-slate-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Patient ID *</label>
                    <input required value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })}
                      placeholder="patient-abc-123" className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Related Record ID</label>
                    <input value={form.recordId} onChange={e => setForm({ ...form, recordId: e.target.value })}
                      placeholder="optional" className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Recipient Name *</label>
                    <input required value={form.recipientName} onChange={e => setForm({ ...form, recipientName: e.target.value })}
                      placeholder="Dr. Smith / Hospital" className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Recipient Type</label>
                    <input value={form.recipientType} onChange={e => setForm({ ...form, recipientType: e.target.value })}
                      placeholder="PHYSICIAN, INSURANCE…" className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Purpose *</label>
                    <select required value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })}
                      className={inputCls + ' appearance-none'}>
                      {PURPOSE_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Legal Basis</label>
                    <select value={form.legalBasis} onChange={e => setForm({ ...form, legalBasis: e.target.value })}
                      className={inputCls + ' appearance-none'}>
                      {LEGAL_BASIS_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Transfer Method</label>
                    <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}
                      className={inputCls + ' appearance-none'}>
                      {METHOD_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Consent ID (if applicable)</label>
                    <input value={form.consentId} onChange={e => setForm({ ...form, consentId: e.target.value })}
                      placeholder="optional consent reference" className={inputCls} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">Data Elements Disclosed</label>
                  <div className="flex flex-wrap gap-2">
                    {DATA_ELEMENTS.map(el => (
                      <button key={el} type="button" onClick={() => toggleElement(el)}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-all ${form.dataElements.includes(el) ? 'bg-violet-500/20 text-violet-300 border-violet-500/40' : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/50'}`}>
                        {el.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                  <button type="button" onClick={() => { setCreateOpen(false); setForm({ ...emptyForm }); }}
                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">Cancel</button>
                  <button type="submit" disabled={submitting}
                    className="px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                    {submitting ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                    {submitting ? 'Logging...' : 'Log Disclosure'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW MODAL ── */}
      {viewOpen && selected && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h2 className="text-xl font-bold text-white">Disclosure Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">{purposeLabel(selected.purpose)} — {methodLabel(selected.method)}</p>
              </div>
              <button onClick={() => setViewOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Patient ID',    selected.patientId],
                  ['Record ID',     selected.recordId],
                  ['Recipient',     selected.recipientName],
                  ['Recipient Type',selected.recipientType],
                  ['Purpose',       purposeLabel(selected.purpose)],
                  ['Legal Basis',   legalBasisLabel(selected.legalBasis)],
                  ['Method',        methodLabel(selected.method)],
                  ['Consent Ref',   selected.consentId],
                  ['Disclosed At',  selected.disclosedAt ? new Date(selected.disclosedAt).toLocaleString() : selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'],
                  ['Request ID',    selected.requestId],
                ].map(([k, v]) => (
                  <div key={k}><p className="text-xs text-slate-500 mb-1">{k}</p><p className="text-sm text-slate-200 font-medium break-all">{v || '—'}</p></div>
                ))}
              </div>

              {selected.dataElements?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Data Elements Disclosed</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.dataElements.map(el => (
                      <span key={el} className="px-2.5 py-1 text-xs rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        {el.replace(/_/g,' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-600 border-t border-slate-800 pt-3">
                Disclosure ID: <span className="font-mono">{selected.id}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
