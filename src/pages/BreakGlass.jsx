import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Plus, Search, RefreshCw, X, Eye, Zap, ZapOff, Clock,
  Shield, AlertTriangle, ShieldAlert, Activity, Fingerprint
} from 'lucide-react';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import {
  fetchActiveBreakGlass, fetchBreakGlassHistory,
  startBreakGlass, endBreakGlass,
  selectActiveBreakGlass, selectBreakGlassHistory, selectBreakGlassLoading
} from '../store/slices/breakGlassSlice';

const emptyForm = { patientId: '', organizationId: '', justification: '', expiresIn: 3600 };

export default function BreakGlass() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const events  = useSelector(selectActiveBreakGlass) || [];
  const history = useSelector(selectBreakGlassHistory) || [];
  const loading = useSelector(selectBreakGlassLoading);

  const [tab, setTab]           = useState('active');
  const [search, setSearch]     = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewOpen, setViewOpen]     = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchActive  = useCallback(() => dispatch(fetchActiveBreakGlass()), [dispatch]);
  const fetchHistory_ = useCallback(() => dispatch(fetchBreakGlassHistory(user?.organizationId)), [dispatch, user]);

  useEffect(() => { tab === 'active' ? fetchActive() : fetchHistory_(); }, [tab]);

  const handleStart = async e => {
    e.preventDefault(); setSubmitting(true);
    try {
      await dispatch(startBreakGlass({ ...form, organizationId: form.organizationId || user?.organizationId, expiresIn: Number(form.expiresIn) || 3600 })).unwrap();
      dispatch(addToast({ type: 'success', message: 'Break-glass access initiated.' }));
      setCreateOpen(false); setForm({ ...emptyForm });
    } catch (err) { dispatch(addToast({ type: 'error', message: err || 'Authorization failed.' })); }
    finally { setSubmitting(false); }
  };

  const handleEnd = async id => {
    if (!window.confirm('Terminate this emergency override session?')) return;
    try {
      await dispatch(endBreakGlass(id)).unwrap();
      dispatch(addToast({ type: 'success', message: 'Override session terminated.' }));
    } catch { dispatch(addToast({ type: 'error', message: 'Failed to terminate session.' })); }
  };

  const list = tab === 'active' ? events : history;
  const filtered = list.filter(e =>
    e.patientId?.toLowerCase().includes(search.toLowerCase()) ||
    e.justification?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="section-label mb-1">Security</p>
          <h1 className="text-2xl font-black text-[#0F1A3A] tracking-tight">Break-Glass <span className="text-brand-red">Override</span></h1>
          <p className="text-sm text-[#8A97B0] mt-0.5">Emergency clinical access governance and audit trail</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => tab === 'active' ? fetchActive() : fetchHistory_()} disabled={loading}
            className="btn-ghost border border-[#DDE3F0] px-3 py-2.5 rounded-xl">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-danger text-sm px-4 py-2.5">
            <Zap size={16} /> Break Glass
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active Sessions', value: events.length, icon: Zap, red: true },
          { label: 'Override History', value: history.length, icon: Activity, red: false },
          { label: 'Security Level', value: 'HIPAA-L4', icon: Shield, red: false },
        ].map(({ label, value, icon: Icon, red }) => (
          <div key={label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${red ? 'bg-red-50 text-brand-red' : 'bg-[#EEF2FF] text-brand-blue'}`}>
              <Icon size={18} />
            </div>
            <p className={`text-3xl font-black ${red ? 'text-brand-red' : 'text-brand-blue'}`}>{value}</p>
            <p className="text-xs text-[#8A97B0] font-semibold uppercase tracking-wider mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-3 p-5 border-b border-[#F0F4FC]">
          <div className="flex gap-1 p-1 bg-[#F0F4FC] rounded-xl">
            {['active', 'history'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${tab === t ? 'bg-white text-brand-blue shadow-sm' : 'text-[#8A97B0] hover:text-[#4B5A7A]'}`}>
                {t === 'active' ? 'Active' : 'History'}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0AECB]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by patient or reason…" className="input pl-10 py-2.5 text-sm" />
          </div>
          <span className="text-xs text-[#A0AECB] font-semibold sm:ml-auto">{filtered.length} events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Patient</th>
                <th>Initiated By</th>
                <th>Justification</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}><td colSpan="5" className="py-3 px-5">
                    <div className="h-10 bg-[#F0F4FC] rounded-xl animate-pulse" />
                  </td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className="py-16 text-center">
                  <ZapOff size={36} className="text-[#DDE3F0] mx-auto mb-3" />
                  <p className="text-sm text-[#A0AECB] font-medium">No emergency overrides detected</p>
                </td></tr>
              ) : filtered.map(ev => (
                <tr key={ev.id}>
                  <td>
                    <div>
                      <p className="font-bold text-brand-red font-mono text-sm">#{ev.id?.substring(0,8).toUpperCase()}</p>
                      <p className="text-xs text-[#A0AECB] flex items-center gap-1 mt-0.5">
                        <Clock size={11} /> {ev.startedAt ? new Date(ev.startedAt).toLocaleString() : '—'}
                      </p>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-blue">{ev.patientId || 'Unknown'}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-[#EEF2FF] rounded-lg flex items-center justify-center text-brand-blue">
                        <Fingerprint size={13} />
                      </div>
                      <p className="text-xs font-mono text-[#4B5A7A]">{ev.userId?.substring(0,12) || 'SYSTEM'}</p>
                    </div>
                  </td>
                  <td>
                    <p className="text-xs text-[#8A97B0] max-w-[240px] truncate italic">"{ev.justification || '—'}"</p>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setSelectedEvent(ev); setViewOpen(true); }}
                        className="p-2 rounded-lg bg-[#F0F4FC] text-brand-blue hover:bg-brand-blue hover:text-white transition-all">
                        <Eye size={15} />
                      </button>
                      {tab === 'active' && (
                        <button onClick={() => handleEnd(ev.id)}
                          className="p-2 rounded-lg bg-[#FFF0F3] text-brand-red hover:bg-brand-red hover:text-white transition-all">
                          <ZapOff size={15} />
                        </button>
                      )}
                      {tab === 'active' && (
                        <span className={`badge ${new Date(ev.expiresAt) > new Date() ? 'badge-orange' : 'badge-red'}`}>
                          {new Date(ev.expiresAt) > new Date() ? 'Active' : 'Expired'}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-center gap-4 p-5 bg-red-50 rounded-2xl border border-red-100">
        <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center shrink-0">
          <AlertTriangle size={18} className="text-white" />
        </div>
        <p className="text-sm text-brand-red font-semibold">
          All break-glass events are permanently logged and audited. Emergency access is subject to HIPAA compliance review.
        </p>
      </div>

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-[#0F1A3A]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-red-100 my-4">
            <div className="flex items-center justify-between p-6 border-b border-[#F0F4FC] bg-red-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center">
                  <ShieldAlert size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="font-black text-[#0F1A3A] text-lg">Emergency Override</h2>
                  <p className="text-xs text-brand-red font-semibold">Critical governance protocol active</p>
                </div>
              </div>
              <button onClick={() => setCreateOpen(false)}
                className="p-2 rounded-xl text-[#8A97B0] hover:bg-[#F0F4FC] hover:text-brand-red transition-all">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleStart} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">Patient ID *</label>
                  <input required value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })}
                    placeholder="e.g. PAT-992-X" className="input py-2.5 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">Duration (seconds)</label>
                  <input type="number" min="300" max="86400" value={form.expiresIn}
                    onChange={e => setForm({ ...form, expiresIn: e.target.value })} className="input py-2.5 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">Clinical Justification *</label>
                <textarea required rows={4} value={form.justification} onChange={e => setForm({ ...form, justification: e.target.value })}
                  placeholder="Provide detailed clinical justification for emergency access…"
                  className="input py-2.5 text-sm resize-none" />
              </div>
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-semibold flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                Window: {Math.floor(Number(form.expiresIn)/3600)}h {Math.floor((Number(form.expiresIn)%3600)/60)}m — This action will be permanently logged.
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)}
                  className="btn-ghost flex-1 justify-center border border-[#DDE3F0] rounded-xl py-2.5">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-danger flex-1 justify-center py-2.5 text-sm">
                  {submitting ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
                  {submitting ? 'Initiating…' : 'Activate Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewOpen && selectedEvent && (
        <div className="fixed inset-0 bg-[#0F1A3A]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#DDE3F0]">
            <div className="flex items-center justify-between p-6 border-b border-[#F0F4FC]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-brand-red">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h2 className="font-black text-[#0F1A3A] text-lg">Override Details</h2>
                  <p className="text-xs font-mono text-[#A0AECB]">#{selectedEvent.id?.substring(0,16)}</p>
                </div>
              </div>
              <button onClick={() => setViewOpen(false)}
                className="p-2 rounded-xl text-[#8A97B0] hover:bg-[#F0F4FC] hover:text-brand-red transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { label: 'Patient ID', value: selectedEvent.patientId },
                { label: 'Initiated By', value: selectedEvent.userId?.substring(0,12) },
                { label: 'Started At', value: selectedEvent.startedAt ? new Date(selectedEvent.startedAt).toLocaleString() : '—' },
                { label: 'Expires At', value: selectedEvent.expiresAt ? new Date(selectedEvent.expiresAt).toLocaleString() : '—' },
                { label: 'Organization', value: selectedEvent.organizationId?.substring(0,16) },
                { label: 'Status', value: selectedEvent.active ? 'ACTIVE' : 'CLOSED' },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-[#F8FAFF] rounded-xl">
                  <p className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-sm font-semibold text-[#0F1A3A]">{value || '—'}</p>
                </div>
              ))}
              <div className="col-span-2 p-4 bg-[#FFF8F0] border border-amber-100 rounded-xl">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Justification</p>
                <p className="text-sm text-[#4B5A7A] italic">"{selectedEvent.justification}"</p>
              </div>
            </div>
            <div className="p-5 border-t border-[#F0F4FC] flex justify-end gap-3">
              {selectedEvent.active && (
                <button onClick={() => { setViewOpen(false); handleEnd(selectedEvent.id); }}
                  className="btn-danger text-sm px-5 py-2.5">Terminate Session</button>
              )}
              <button onClick={() => setViewOpen(false)} className="btn-primary text-sm px-6 py-2.5">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
