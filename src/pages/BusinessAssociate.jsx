import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Search, RefreshCw, X, Eye, Edit2, Trash2, Handshake } from 'lucide-react';
import client from '../api/client';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import {
  fetchBaas,
  createBaa,
  suspendVendor,
  activateVendor,
  fetchBaaDetails,
  selectBaas,
  selectBaaLoading,
  selectSelectedBaa
} from '../store/slices/baaSlice';

const SERVICE_TYPES = [
  { value: 'NOTIFICATION_SERVICE', label: 'Notification Service' },
  { value: 'BILLING',              label: 'Billing & Claims' },
  { value: 'DATA_ANALYTICS',       label: 'Data Analytics' },
  { value: 'CLOUD_STORAGE',        label: 'Cloud Storage' },
  { value: 'TRANSCRIPTION',        label: 'Transcription' },
  { value: 'SCHEDULING',           label: 'Scheduling' },
  { value: 'OTHER',                label: 'Other' },
];
const BAA_STATUSES  = ['ACTIVE','EXPIRED','TERMINATED','PENDING'];
const STATUS_STYLE  = { ACTIVE:'bg-teal-500/10 text-teal-400 border-teal-500/20', EXPIRED:'bg-amber-500/10 text-amber-400 border-amber-500/20', TERMINATED:'bg-rose-500/10 text-rose-400 border-rose-500/20', PENDING:'bg-sky-500/10 text-sky-400 border-sky-500/20' };
const inputCls      = 'w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none';
const asList        = d => Array.isArray(d) ? d : (d?.content ?? []);
const emptyForm     = { organizationId:'', vendorName:'', serviceType:'NOTIFICATION_SERVICE', baaStatus:'ACTIVE', effectiveFrom:'', effectiveTo:'' };
const svcLabel      = v => SERVICE_TYPES.find(s => s.value === v)?.label || v;

export default function BusinessAssociate() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  const baas     = useSelector(selectBaas);
  const loading  = useSelector(selectBaaLoading);
  const selected = useSelector(selectSelectedBaa);

  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen]     = useState(false);
  const [viewOpen, setViewOpen]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]             = useState({...emptyForm});
  const [editForm, setEditForm]     = useState({});

  // API: GET /api/baas/vendors?organizationId={id}
  const fetch_ = useCallback(() => {
    dispatch(fetchBaas(user?.organizationId));
  }, [dispatch, user]);

  useEffect(()=>{ fetch_(); },[fetch_]);

  // API: POST /api/baas/vendors  body: { vendorName, serviceType, organizationId, ... }
  const handleCreate = async e => {
    e.preventDefault(); setSubmitting(true);
    try {
      await dispatch(createBaa({
        vendorName:     form.vendorName,
        serviceType:    form.serviceType,
        organizationId: form.organizationId || user?.organizationId,
        baaStatus:      form.baaStatus,
        effectiveFrom:  form.effectiveFrom ? new Date(form.effectiveFrom).toISOString() : undefined,
        effectiveTo:    form.effectiveTo   ? new Date(form.effectiveTo).toISOString()   : undefined,
      })).unwrap();
      dispatch(addToast({ type: 'success', message: 'Business Associate created.' }));
      setCreateOpen(false); setForm({ ...emptyForm });
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err || 'Failed to create BAA.' }));
    } finally { setSubmitting(false); }
  };

  // API: POST /api/baas/vendors/{vendorId}/suspend
  const handleSuspend = async id => {
    if (!window.confirm('Suspend this vendor? This will pause their access.')) return;
    try {
      await dispatch(suspendVendor(id)).unwrap();
      dispatch(addToast({ type: 'success', message: 'Vendor suspended.' }));
    } catch { dispatch(addToast({ type: 'error', message: 'Failed to suspend.' })); }
  };

  const handleActivate = async id => {
    try {
      await dispatch(activateVendor(id)).unwrap();
      dispatch(addToast({ type: 'success', message: 'Vendor activated.' }));
    } catch { dispatch(addToast({ type: 'error', message: 'Failed to activate.' })); }
  };

  const handleEdit = async e => {
    e.preventDefault(); setSubmitting(true);
    try {
      // Use hipaa/baa/{id} for get, but use vendor endpoint for details display
      await client.post(`/api/baas/vendors/${selected.id}/activate`);
      dispatch(addToast({ type: 'success', message: 'Updated.' }));
      setEditOpen(false); fetch_();
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err.response?.data?.message || 'Failed.' }));
    } finally { setSubmitting(false); }
  };

  const handleDelete = async id => {
    dispatch(addToast({ type: 'warning', message: 'Delete not supported. Use Suspend instead.' }));
  };

  // API: GET /api/baas/vendors/{vendorId}
  const view = async id => {
    try {
      await dispatch(fetchBaaDetails(id)).unwrap();
      setViewOpen(true);
    } catch { dispatch(addToast({ type: 'error', message: 'Failed to load.' })); }
  };

  const filtered = baas.filter(b =>
    b.vendorName?.toLowerCase().includes(search.toLowerCase())||
    b.serviceType?.toLowerCase().includes(search.toLowerCase())||
    b.baaStatus?.toLowerCase().includes(search.toLowerCase())
  );

  const FormFields = ({ f, setF }) => (
    <>
      <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Vendor / Company Name *</label>
        <input required value={f.vendorName||''} onChange={e=>setF({...f,vendorName:e.target.value})} placeholder="HealthTech Analytics Inc." className={inputCls}/></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Service Type</label>
          <select value={f.serviceType||'NOTIFICATION_SERVICE'} onChange={e=>setF({...f,serviceType:e.target.value})} className={inputCls+' appearance-none'}>
            {SERVICE_TYPES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
        <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">BAA Status</label>
          <select value={f.baaStatus||'ACTIVE'} onChange={e=>setF({...f,baaStatus:e.target.value})} className={inputCls+' appearance-none'}>
            {BAA_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Effective From</label>
          <input type="datetime-local" value={f.effectiveFrom||''} onChange={e=>setF({...f,effectiveFrom:e.target.value})} className={inputCls}/></div>
        <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Effective To</label>
          <input type="datetime-local" value={f.effectiveTo||''} onChange={e=>setF({...f,effectiveTo:e.target.value})} className={inputCls}/></div>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Handshake className="text-emerald-400" size={24}/>Business Associate Agreements</h1>
          <p className="text-slate-400 text-sm mt-1">Manage HIPAA BAAs with third-party vendors and service providers.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetch_} disabled={loading} className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50"><RefreshCw size={18} className={loading?'animate-spin':''}/></button>
          <button onClick={()=>setCreateOpen(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-4 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(52,211,153,0.3)]"><Plus size={18}/><span>Add BAA</span></button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[['Total',baas.length,'text-white'],['Active',baas.filter(b=>b.baaStatus==='ACTIVE').length,'text-emerald-400'],['Expired',baas.filter(b=>b.baaStatus==='EXPIRED').length,'text-amber-400'],['Terminated',baas.filter(b=>b.baaStatus==='TERMINATED').length,'text-rose-400']].map(([l,v,cls])=>(
          <div key={l} className="glass-card rounded-xl p-4"><p className="text-xs text-slate-500 uppercase tracking-wider">{l}</p><p className={`text-3xl font-bold mt-1 ${cls}`}>{v}</p></div>
        ))}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2">
            {['all','active'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1.5 text-xs rounded-lg border capitalize transition-colors ${filter===f?'bg-emerald-500/10 text-emerald-400 border-emerald-500/20':'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/50'}`}>{f}</button>
            ))}
            <div className="relative ml-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search vendors..." className="bg-slate-900/50 border border-slate-700/50 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 w-52"/>
            </div>
          </div>
          <span className="text-xs text-slate-500">{filtered.length} agreements</span>
        </div>
        <div className="overflow-x-auto min-h-[280px]">
          <table className="w-full text-left">
            <thead><tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-[var(--border-color)]">
              {['Vendor','Service Type','Status','Effective From','Effective To','Actions'].map(h=><th key={h} className="px-6 py-4 font-medium">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading?(<tr><td colSpan="6" className="py-12 text-center text-slate-400"><RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-emerald-400"/>Loading...</td></tr>)
              :filtered.length===0?(<tr><td colSpan="6" className="py-12 text-center text-slate-400"><Handshake className="w-10 h-10 mx-auto mb-3 text-slate-600"/><p>No BAAs found.</p></td></tr>)
              :filtered.map(b=>(
                <tr key={b.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-200">{b.vendorName}</p>
                    {b.documentRef && <p className="text-xs text-slate-500">Doc: {b.documentRef}</p>}
                  </td>
                  <td className="px-6 py-4"><span className="px-2.5 py-1 text-xs font-medium rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">{svcLabel(b.serviceType)}</span></td>
                  <td className="px-6 py-4"><span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${STATUS_STYLE[b.baaStatus]||STATUS_STYLE.ACTIVE}`}>{b.baaStatus}</span></td>
                  <td className="px-6 py-4 text-sm text-slate-400">{b.effectiveFrom?new Date(b.effectiveFrom).toLocaleDateString():'—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{b.effectiveTo?new Date(b.effectiveTo).toLocaleDateString():'No expiry'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={()=>view(b.id)} className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 rounded-md" title="View Details"><Eye size={16}/></button>
                      {b.baaStatus === 'ACTIVE' 
                        ? <button onClick={()=>handleSuspend(b.id)} className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-md" title="Suspend Vendor"><Trash2 size={16}/></button>
                        : <button onClick={()=>handleActivate(b.id)} className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-teal-400/10 rounded-md" title="Activate Vendor"><Plus size={16}/></button>
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen&&(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0">
              <h2 className="text-xl font-bold text-white">Create Business Associate Agreement</h2>
              <button onClick={()=>setCreateOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20}/></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Organization ID</label>
                  <input value={form.organizationId} onChange={e=>setForm({...form,organizationId:e.target.value})} placeholder={user?.organizationId||'org123'} className={inputCls}/></div>
                <FormFields f={form} setF={setForm}/>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={()=>setCreateOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                    {submitting?<RefreshCw className="animate-spin" size={16}/>:<Plus size={16}/>}{submitting?'Creating...':'Create BAA'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {editOpen&&selected&&(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-xl font-bold text-white">Edit BAA</h2>
              <button onClick={()=>setEditOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20}/></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleEdit} className="space-y-4">
                <FormFields f={editForm} setF={setEditForm}/>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={()=>setEditOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                    {submitting?<RefreshCw className="animate-spin" size={16}/>:<Edit2 size={16}/>}{submitting?'Saving...':'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {viewOpen&&selected&&(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div><h2 className="text-xl font-bold text-white">BAA Details</h2><p className="text-xs text-slate-500 font-mono mt-0.5">{selected.id}</p></div>
              <button onClick={()=>setViewOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[['Vendor',selected.vendorName],['Service Type',selected.serviceType],['Status',selected.baaStatus],['Org ID',selected.organizationId],['Effective From',selected.effectiveFrom?new Date(selected.effectiveFrom).toLocaleDateString():'—'],['Effective To',selected.effectiveTo?new Date(selected.effectiveTo).toLocaleDateString():'—']].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-slate-500 mb-1">{k}</p><p className="text-sm text-slate-200 font-medium">{v||'—'}</p></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
