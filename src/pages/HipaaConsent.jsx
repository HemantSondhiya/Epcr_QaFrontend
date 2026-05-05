import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Search, RefreshCw, X, Eye, ShieldCheck, ShieldOff, FileText } from 'lucide-react';
import client from '../api/client';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import {
  fetchConsents,
  createConsent,
  revokeConsent,
  selectConsents,
  selectHipaaLoading
} from '../store/slices/hipaaSlice';

// ── Constants ────────────────────────────────────────────────────────
const CONSENT_TYPES = [
  { value: 'TREATMENT',    label: 'Treatment' },
  { value: 'PAYMENT',      label: 'Payment' },
  { value: 'OPERATIONS',   label: 'Health Care Operations' },
  { value: 'RESEARCH',     label: 'Research' },
  { value: 'MARKETING',    label: 'Marketing' },
  { value: 'DISCLOSURE',   label: 'Disclosure to Third Party' },
];
const CAPTURE_METHODS = [
  { value: 'ELECTRONIC',   label: 'Electronic Signature' },
  { value: 'PAPER',        label: 'Paper Form' },
  { value: 'VERBAL',       label: 'Verbal Confirmation' },
  { value: 'PORTAL',       label: 'Patient Portal' },
];
const DATA_CATEGORIES = ['PHI', 'MENTAL_HEALTH', 'SUBSTANCE_ABUSE', 'HIV_STATUS', 'GENETIC_INFO', 'BILLING'];
const RECIPIENT_TYPES  = ['INSURANCE', 'EMPLOYER', 'FAMILY', 'RESEARCHER', 'PUBLIC_HEALTH', 'LAW_ENFORCEMENT'];

const STATUS_STYLE = {
  ACTIVE:  'bg-teal-500/10 text-teal-400 border-teal-500/20',
  REVOKED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  EXPIRED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};
const inputCls = 'w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none';
const asList   = d => Array.isArray(d) ? d : (d?.content ?? []);

const emptyForm = {
  patientId: '', consentType: 'TREATMENT', effectiveFrom: '', effectiveTo: '',
  dataCategories: [], recipientTypes: [], captureMethod: 'ELECTRONIC', documentRef: '',
};

// ── Helper ───────────────────────────────────────────────────────────
const consentTypeLabel = v => CONSENT_TYPES.find(t => t.value === v)?.label || v;
const captureLabel     = v => CAPTURE_METHODS.find(m => m.value === v)?.label || v;

function ToggleChips({ options, selected, onChange, color = 'teal' }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const lbl = typeof opt === 'string' ? opt : opt.label;
        const active = selected.includes(val);
        return (
          <button key={val} type="button" onClick={() => onChange(active ? selected.filter(x => x !== val) : [...selected, val])}
            className={`px-2.5 py-1 text-xs rounded-full border transition-all ${active ? `bg-${color}-500/20 text-${color}-300 border-${color}-500/40` : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/50'}`}>
            {lbl}
          </button>
        );
      })}
    </div>
  );
}

export default function HipaaConsent() {
  const dispatch = useDispatch();
  const user     = useSelector(selectUser);

  const consents = useSelector(selectConsents);
  const loading  = useSelector(selectHipaaLoading);
  const [search,       setSearch]       = useState('');
  const [patId,        setPatId]        = useState('');
  const [createOpen,   setCreateOpen]   = useState(false);
  const [viewOpen,     setViewOpen]     = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [form,         setForm]         = useState({ ...emptyForm });

  // ── Fetch ──────────────────────────────────────────────────────────
  // API: GET /api/hipaa/consent?patientId={id}
  const fetch_ = useCallback(() => {
    dispatch(fetchConsents(patId.trim()));
  }, [dispatch, patId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  // ── Create ─────────────────────────────────────────────────────────
  // API: POST /api/patients/{patientId}/consents?organizationId={orgId}
  const handleCreate = async e => {
    e.preventDefault();
    if (!form.patientId.trim()) {
      dispatch(addToast({ type: 'error', message: 'Patient ID is required.' }));
      return;
    }
    setSubmitting(true);
    try {
      const orgId = user?.organizationId || '';
      const payload = {
        consentType:    form.consentType,
        effectiveFrom:  form.effectiveFrom ? new Date(form.effectiveFrom).toISOString() : undefined,
        effectiveTo:    form.effectiveTo   ? new Date(form.effectiveTo).toISOString()   : undefined,
        dataCategories: form.dataCategories,
        recipientTypes: form.recipientTypes,
        captureMethod:  form.captureMethod,
        documentRef:    form.documentRef || undefined,
      };
      await dispatch(createConsent({ 
        patientId: form.patientId.trim(), 
        organizationId: orgId, 
        payload 
      })).unwrap();
      dispatch(addToast({ type: 'success', message: 'Consent record created.' }));
      setCreateOpen(false);
      setForm({ ...emptyForm });
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err || 'Failed to create consent.' }));
    } finally { setSubmitting(false); }
  };

  // ── Revoke ─────────────────────────────────────────────────────────
  // API: POST /api/patients/{patientId}/consents/{consentId}/revoke
  const revoke = async (consent) => {
    if (!window.confirm(`Revoke consent for patient? This cannot be undone.`)) return;
    try {
      await dispatch(revokeConsent({ patientId: consent.patientId, consentId: consent.id })).unwrap();
      dispatch(addToast({ type: 'success', message: 'Consent revoked.' }));
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to revoke consent.' }));
    }
  };

  // ── View ───────────────────────────────────────────────────────────
  // API: GET /api/hipaa/consent/{id}
  const view = async id => {
    try {
      const r = await client.get(`/api/hipaa/consent/${id}`);
      setSelected(r.data);
      setViewOpen(true);
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to load consent details.' }));
    }
  };

  const filtered = consents.filter(c =>
    c.patientId?.toLowerCase().includes(search.toLowerCase()) ||
    consentTypeLabel(c.consentType).toLowerCase().includes(search.toLowerCase()) ||
    c.status?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    ['Total Consents', consents.length, 'text-white'],
    ['Active', consents.filter(c => c.status === 'ACTIVE').length, 'text-teal-400'],
    ['Revoked', consents.filter(c => c.status === 'REVOKED').length, 'text-rose-400'],
    ['Expired', consents.filter(c => c.status === 'EXPIRED').length, 'text-amber-400'],
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="text-teal-400" size={24} />
            HIPAA Patient Consent
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage patient authorizations and HIPAA consent records.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetch_} disabled={loading} className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50 transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(45,212,191,0.3)]">
            <Plus size={18} /><span>New Consent</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(([l, v, cls]) => (
          <div key={l} className="glass-card rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider">{l}</p>
            <p className={`text-3xl font-bold mt-1 ${cls}`}>{v}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search consents..."
                className="bg-slate-900/50 border border-slate-700/50 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 w-56" />
            </div>
            <input value={patId} onChange={e => setPatId(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetch_()}
              placeholder="Filter by Patient ID ↵"
              className="bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 w-56" />
          </div>
          <span className="text-xs text-slate-500">{filtered.length} records</span>
        </div>

        <div className="overflow-x-auto min-h-[280px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-[var(--border-color)]">
                {['Patient ID', 'Consent Type', 'Data Categories', 'Status', 'Effective From', 'Expires', 'Capture Method', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr><td colSpan="8" className="py-12 text-center text-slate-400">
                  <RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-teal-500" />Loading...
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="8" className="py-12 text-center text-slate-400">
                  <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                  <p>No consent records found. Enter a Patient ID above to search.</p>
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm">
                    <div className="text-slate-200 font-medium">{c.patientId?.substring(0, 16) || '—'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {consentTypeLabel(c.consentType)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(c.dataCategories || []).slice(0, 2).map(d => (
                        <span key={d} className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-400 rounded border border-slate-700">{d.replace(/_/g,' ')}</span>
                      ))}
                      {(c.dataCategories || []).length > 2 && <span className="text-xs text-slate-500">+{c.dataCategories.length - 2}</span>}
                      {!c.dataCategories?.length && <span className="text-slate-500 text-xs">—</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${STATUS_STYLE[c.status] || STATUS_STYLE.ACTIVE}`}>
                      {c.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {c.effectiveFrom ? new Date(c.effectiveFrom).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {c.effectiveTo ? new Date(c.effectiveTo).toLocaleDateString() : 'No expiry'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {captureLabel(c.captureMethod) || '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => view(c.id)} className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 rounded-md transition-colors" title="View Details">
                        <Eye size={16} />
                      </button>
                      {c.status === 'ACTIVE' && (
                        <button onClick={() => revoke(c)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors" title="Revoke Consent">
                          <ShieldOff size={16} />
                        </button>
                      )}
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
                <h2 className="text-xl font-bold text-white">Create Patient Consent</h2>
                <p className="text-xs text-slate-500 mt-0.5">Record a new HIPAA patient consent authorization</p>
              </div>
              <button onClick={() => { setCreateOpen(false); setForm({ ...emptyForm }); }} className="text-slate-400 hover:text-slate-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreate} className="space-y-5">
                {/* Patient ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Patient ID *</label>
                  <input required value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })}
                    placeholder="e.g. patient-abc-123" className={inputCls} />
                  <p className="text-[11px] text-slate-500">The unique identifier of the patient granting consent.</p>
                </div>

                {/* Consent Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Consent Type *</label>
                  <select required value={form.consentType} onChange={e => setForm({ ...form, consentType: e.target.value })}
                    className={inputCls + ' appearance-none'}>
                    {CONSENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                {/* Effective Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Effective From *</label>
                    <input type="datetime-local" required value={form.effectiveFrom}
                      onChange={e => setForm({ ...form, effectiveFrom: e.target.value })} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Effective To (optional)</label>
                    <input type="datetime-local" value={form.effectiveTo}
                      onChange={e => setForm({ ...form, effectiveTo: e.target.value })} className={inputCls} />
                  </div>
                </div>

                {/* Capture Method */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Capture Method</label>
                  <select value={form.captureMethod} onChange={e => setForm({ ...form, captureMethod: e.target.value })}
                    className={inputCls + ' appearance-none'}>
                    {CAPTURE_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>

                {/* Data Categories */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">Data Categories Covered</label>
                  <ToggleChips options={DATA_CATEGORIES} selected={form.dataCategories}
                    onChange={val => setForm({ ...form, dataCategories: val })} color="teal" />
                </div>

                {/* Recipient Types */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">Recipient Types Authorized</label>
                  <ToggleChips options={RECIPIENT_TYPES} selected={form.recipientTypes}
                    onChange={val => setForm({ ...form, recipientTypes: val })} color="sky" />
                </div>

                {/* Document Reference */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Document Reference (optional)</label>
                  <input value={form.documentRef} onChange={e => setForm({ ...form, documentRef: e.target.value })}
                    placeholder="e.g. FORM-2024-001" className={inputCls} />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                  <button type="button" onClick={() => { setCreateOpen(false); setForm({ ...emptyForm }); }}
                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">Cancel</button>
                  <button type="submit" disabled={submitting}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                    {submitting ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                    {submitting ? 'Creating...' : 'Create Consent'}
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
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h2 className="text-xl font-bold text-white">Consent Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">{consentTypeLabel(selected.consentType)} — {selected.status}</p>
              </div>
              <button onClick={() => setViewOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Patient ID',      selected.patientId],
                  ['Organization',    selected.organizationId],
                  ['Consent Type',    consentTypeLabel(selected.consentType)],
                  ['Capture Method',  captureLabel(selected.captureMethod)],
                  ['Document Ref',    selected.documentRef],
                  ['Effective From',  selected.effectiveFrom ? new Date(selected.effectiveFrom).toLocaleString() : '—'],
                  ['Effective To',    selected.effectiveTo   ? new Date(selected.effectiveTo).toLocaleString()   : 'No expiry'],
                  ['Created At',      selected.createdAt     ? new Date(selected.createdAt).toLocaleString()     : '—'],
                ].map(([k, v]) => (
                  <div key={k}><p className="text-xs text-slate-500 mb-1">{k}</p><p className="text-sm text-slate-200 font-medium">{v || '—'}</p></div>
                ))}
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${STATUS_STYLE[selected.status] || STATUS_STYLE.ACTIVE}`}>
                  {selected.status}
                </span>
                {selected.dataCategories?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selected.dataCategories.map(d => (
                      <span key={d} className="px-2 py-0.5 text-[10px] bg-slate-800 text-teal-400 rounded border border-slate-700">{d.replace(/_/g,' ')}</span>
                    ))}
                  </div>
                )}
              </div>

              {selected.recipientTypes?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Authorized Recipient Types</p>
                  <div className="flex flex-wrap gap-1">
                    {selected.recipientTypes.map(r => (
                      <span key={r} className="px-2 py-0.5 text-[10px] bg-sky-500/10 text-sky-400 rounded border border-sky-500/20">{r.replace(/_/g,' ')}</span>
                    ))}
                  </div>
                </div>
              )}

              {selected.status === 'ACTIVE' && (
                <div className="flex justify-end pt-2 border-t border-slate-800">
                  <button onClick={() => { setViewOpen(false); revoke(selected); }}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-sm hover:bg-rose-500/20 transition-colors">
                    <ShieldOff size={16} />Revoke Consent
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
