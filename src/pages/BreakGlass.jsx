import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Search, RefreshCw, X, Eye, Zap, ZapOff, Clock } from 'lucide-react';
import client from '../api/client';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import {
  fetchActiveBreakGlass,
  fetchBreakGlassHistory,
  startBreakGlass,
  endBreakGlass,
  selectActiveBreakGlass,
  selectBreakGlassHistory,
  selectBreakGlassLoading
} from '../store/slices/breakGlassSlice';

const inputCls  = 'w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none';
const asList    = d => Array.isArray(d) ? d : (d?.content ?? []);
const emptyForm = { patientId:'', organizationId:'', justification:'', expiresIn:3600 };

export default function BreakGlass() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  const events  = useSelector(selectActiveBreakGlass);
  const history = useSelector(selectBreakGlassHistory);
  const loading = useSelector(selectBreakGlassLoading);

  const [tab, setTab]               = useState('active');
  const [search, setSearch]         = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]             = useState({...emptyForm});

  const fetchActive = useCallback(() => {
    dispatch(fetchActiveBreakGlass());
  }, [dispatch]);

  const fetchHistory = useCallback(() => {
    dispatch(fetchBreakGlassHistory(user?.organizationId));
  }, [dispatch, user]);

  useEffect(()=>{ if(tab==='active') fetchActive(); else fetchHistory(); },[tab,fetchActive,fetchHistory]);

  const handleStart = async e => {
    e.preventDefault(); setSubmitting(true);
    try {
      await dispatch(startBreakGlass({
        ...form,
        organizationId: form.organizationId||user?.organizationId,
        expiresIn: Number(form.expiresIn)||3600,
      })).unwrap();
      dispatch(addToast({type:'success',message:'Break-glass access initiated.'}));
      setCreateOpen(false); setForm({...emptyForm});
    } catch(err){ dispatch(addToast({type:'error',message:err || 'Failed.'})); }
    finally { setSubmitting(false); }
  };

  const handleEnd = async id => {
    if(!window.confirm('End this break-glass session?')) return;
    try {
      await dispatch(endBreakGlass(id)).unwrap();
      dispatch(addToast({type:'success',message:'Break-glass session ended.'}));
    } catch { dispatch(addToast({type:'error',message:'Failed to end session.'})); }
  };

  const list     = tab==='active' ? events : history;
  const filtered = list.filter(e=>
    e.patientId?.toLowerCase().includes(search.toLowerCase())||
    e.justification?.toLowerCase().includes(search.toLowerCase())||
    e.userId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Zap className="text-amber-400" size={24}/>Break-Glass Emergency Access</h1>
          <p className="text-slate-400 text-sm mt-1">Manage emergency override access events with full audit trail.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={()=>tab==='active'?fetchActive():fetchHistory()} disabled={loading} className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50"><RefreshCw size={18} className={loading?'animate-spin':''}/></button>
          <button onClick={()=>setCreateOpen(true)} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 px-4 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(245,158,11,0.3)]"><Zap size={18}/><span>Start Access</span></button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          ['Active Events',   events.length,  'text-amber-400'],
          ['Total History',   history.length, 'text-white'],
          ['Your Organization', user?.organizationId?.substring(0,14) || '—', 'text-slate-400'],
        ].map(([l,v,cls])=>(
          <div key={l} className="glass-card rounded-xl p-4"><p className="text-xs text-slate-500 uppercase tracking-wider">{l}</p><p className={`text-2xl font-bold mt-1 ${cls} truncate`}>{v}</p></div>
        ))}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-2">
            {['active','history'].map(t=>(
              <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1.5 text-xs rounded-lg border capitalize transition-colors ${tab===t?'bg-amber-500/10 text-amber-400 border-amber-500/20':'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/50'}`}>{t==='active'?'Active Events':'History'}</button>
            ))}
            <div className="relative ml-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="bg-slate-900/50 border border-slate-700/50 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50 w-48"/>
            </div>
          </div>
          <span className="text-xs text-slate-500">{filtered.length} events</span>
        </div>
        <div className="overflow-x-auto min-h-[280px]">
          <table className="w-full text-left">
            <thead><tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-[var(--border-color)]">
              {['Event ID','Patient ID','User','Justification','Expires In','Started','Actions'].map(h=><th key={h} className="px-6 py-4 font-medium">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading?(<tr><td colSpan="7" className="py-12 text-center text-slate-400"><RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-amber-400"/>Loading...</td></tr>)
              :filtered.length===0?(<tr><td colSpan="7" className="py-12 text-center text-slate-400"><Zap className="w-10 h-10 mx-auto mb-3 text-slate-600"/><p>No break-glass events found.</p></td></tr>)
              :filtered.map(ev=>(
                <tr key={ev.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm font-mono text-amber-400">{ev.id?.substring(0,12)||'—'}...</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-200">
                    {ev.patientId?.substring(0, 20) || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {ev.userId?.substring(0, 10) || ev.initiatedBy || 'Current User'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 max-w-[200px] truncate">{ev.justification||'—'}</td>
                  <td className="px-6 py-4">
                    {ev.expiresAt ? (
                      <span className={`flex items-center gap-1.5 text-xs ${new Date(ev.expiresAt) > new Date() ? 'text-amber-400' : 'text-rose-400'}`}>
                        <Clock size={12}/>
                        {new Date(ev.expiresAt) > new Date() 
                          ? `Expires ${new Date(ev.expiresAt).toLocaleTimeString()}` 
                          : 'Expired'}
                      </span>
                    ) : <span className="text-slate-500">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{ev.startedAt?new Date(ev.startedAt).toLocaleString():ev.createdAt?new Date(ev.createdAt).toLocaleString():'—'}</td>
                  <td className="px-6 py-4 text-right">
                    {tab==='active'&&(
                      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=>handleEnd(ev.id)} className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md hover:bg-rose-500/20"><ZapOff size={13}/>End</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen&&(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-amber-500/30 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-amber-500/20 flex justify-between items-center bg-amber-500/5">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Zap className="text-amber-400" size={20}/>Start Break-Glass Access</h2>
                <p className="text-xs text-amber-400/70 mt-0.5">⚠ This action will be fully audited and logged.</p>
              </div>
              <button onClick={()=>setCreateOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20}/></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleStart} className="space-y-4">
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Patient ID *</label>
                  <input required value={form.patientId} onChange={e=>setForm({...form,patientId:e.target.value})} placeholder="patient123" className={inputCls}/></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Organization ID</label>
                  <input value={form.organizationId} onChange={e=>setForm({...form,organizationId:e.target.value})} placeholder={user?.organizationId||'org123'} className={inputCls}/></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Justification *</label>
                  <textarea required rows={3} value={form.justification} onChange={e=>setForm({...form,justification:e.target.value})}
                    placeholder="Emergency treatment — patient unconscious, immediate access required..." className={inputCls+' resize-none'}/></div>
                <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Duration (seconds)</label>
                  <input type="number" min="300" max="86400" value={form.expiresIn} onChange={e=>setForm({...form,expiresIn:e.target.value})} className={inputCls}/>
                  <p className="text-xs text-slate-500">= {Math.floor(Number(form.expiresIn)/3600)}h {Math.floor((Number(form.expiresIn)%3600)/60)}m</p>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={()=>setCreateOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                    {submitting?<RefreshCw className="animate-spin" size={16}/>:<Zap size={16}/>}{submitting?'Starting...':'Start Access'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
