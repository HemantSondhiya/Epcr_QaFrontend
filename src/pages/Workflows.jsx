import { useState, useEffect } from 'react';
import { GitBranch, Plus, RefreshCw, X, Trash2, Edit2, Eye, Rocket, Check, ChevronRight } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import client from '../api/client';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import FormBuilder from '../components/forms/FormBuilder';

const inputCls = 'w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none';

const emptyStep = () => ({ stepNumber: 1, stepName: '', assignedRole: 'PARAMEDIC', action: '', durationDays: 1, isMandatory: true });
const ROLES = ['ADMIN','MANAGER','PARAMEDIC','PHYSICIAN','QA_REVIEWER','VIEWER'];

const Workflows = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [workflows, setWorkflows]   = useState([]);
  const [orgs, setOrgs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [selectedWf, setSelectedWf] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deployTargets, setDeployTargets] = useState([]);

  const emptyForm = () => ({ name:'', description:'', organizationId: user?.organizationId||'', domain:'', category:'', active:true, steps:[emptyStep()], formSchema: { fields: [] } });
  const [wfForm, setWfForm] = useState(emptyForm());

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const endpoint = user?.role === 'MANAGER' && user?.organizationId
        ? `/api/workflows/organization/${user.organizationId}`
        : '/api/workflows';
      const [wfRes, orgRes] = await Promise.all([
        client.get(endpoint),
        client.get('/api/organizations').catch(() => ({ data: [] }))
      ]);
      const wfData = wfRes.data;
      const orgData = orgRes.data;
      setWorkflows(Array.isArray(wfData) ? wfData : (wfData?.content || []));
      setOrgs(Array.isArray(orgData) ? orgData : (orgData?.content || []));
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to load workflows.' }));
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [user]);

  // Steps helpers
  const addStep = (form, setForm) => setForm(prev => ({
    ...prev, steps: [...prev.steps, { ...emptyStep(), stepNumber: prev.steps.length + 1 }]
  }));
  const updateStep = (form, setForm, idx, field, val) => {
    const steps = [...form.steps];
    steps[idx] = { ...steps[idx], [field]: val };
    setForm({ ...form, steps });
  };
  const removeStep = (form, setForm, idx) => setForm({ ...form, steps: form.steps.filter((_, i) => i !== idx) });

  const handleCreate = async (e) => {
    e.preventDefault(); setIsSubmitting(true); setError('');
    try {
      await client.post('/api/workflows', { ...wfForm, rules: [], formSchema: {} });
      setIsCreateOpen(false); setWfForm(emptyForm());
      dispatch(addToast({ type: 'success', message: 'Workflow created successfully' }));
      fetchData();
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err.response?.data?.message || 'Failed to create workflow.' }));
    }
    finally { setIsSubmitting(false); }
  };

  const openEdit = (wf) => { setSelectedWf(wf); setWfForm({ ...wf }); setIsEditOpen(true); };

  const handleEdit = async (e) => {
    e.preventDefault(); setIsSubmitting(true); setError('');
    try {
      await client.put(`/api/workflows/${selectedWf.id}`, wfForm);
      setIsEditOpen(false); setSelectedWf(null);
      dispatch(addToast({ type: 'success', message: 'Workflow updated successfully' }));
      fetchData();
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err.response?.data?.message || 'Failed to update workflow.' }));
    }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this workflow?')) return;
    try {
      await client.delete(`/api/workflows/${id}`);
      dispatch(addToast({ type: 'success', message: 'Workflow deleted' }));
      fetchData();
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to delete workflow.' }));
    }
  };

  const openDeploy = (wf) => { setSelectedWf(wf); setDeployTargets([]); setIsDeployOpen(true); };

  const handleDeploy = async (e) => {
    e.preventDefault(); if (!deployTargets.length) return;
    setIsSubmitting(true); setError('');
    try {
      await client.post('/api/workflows/deployments', {
        targetOrganizationIds: deployTargets,
        configType: 'WORKFLOW',
        configId: selectedWf.id,
        configVersion: 1
      });
      setIsDeployOpen(false);
      dispatch(addToast({ type: 'success', message: 'Deployment initiated successfully!' }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err.response?.data?.message || 'Deployment failed.' }));
    }
    finally { setIsSubmitting(false); }
  };

  const toggleTarget = (orgId) => setDeployTargets(prev =>
    prev.includes(orgId) ? prev.filter(id => id !== orgId) : [...prev, orgId]
  );

  const StepsEditor = ({ form, setForm }) => (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-slate-300">Steps ({form.steps?.length || 0})</label>
        <button type="button" onClick={() => addStep(form, setForm)} className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"><Plus size={14} />Add Step</button>
      </div>
      {form.steps?.map((step, idx) => (
        <div key={idx} className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-teal-400">Step {idx + 1}</span>
            {form.steps.length > 1 && <button type="button" onClick={() => removeStep(form, setForm, idx)} className="text-rose-400 hover:text-rose-300"><Trash2 size={14} /></button>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-xs text-slate-400">Step Name</label>
              <input value={step.stepName} onChange={e => updateStep(form, setForm, idx, 'stepName', e.target.value)} className={inputCls} placeholder="Review" /></div>
            <div className="space-y-1.5"><label className="text-xs text-slate-400">Assigned Role</label>
              <select value={step.assignedRole} onChange={e => updateStep(form, setForm, idx, 'assignedRole', e.target.value)} className={inputCls + ' appearance-none'}>
                {ROLES.map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><label className="text-xs text-slate-400">Action</label>
              <input value={step.action} onChange={e => updateStep(form, setForm, idx, 'action', e.target.value)} className={inputCls} placeholder="REVIEW" /></div>
            <div className="space-y-1.5"><label className="text-xs text-slate-400">Duration (days)</label>
              <input type="number" min="1" value={step.durationDays} onChange={e => updateStep(form, setForm, idx, 'durationDays', parseInt(e.target.value)||1)} className={inputCls} /></div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input type="checkbox" checked={step.isMandatory} onChange={e => updateStep(form, setForm, idx, 'isMandatory', e.target.checked)} className="rounded border-slate-700 bg-slate-900 text-teal-500" />Mandatory
              </label>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const WfModal = ({ form, setForm, onSubmit, onCancel, title }) => (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto space-y-5">
          {error && <div className="p-3 bg-rose-500/10 text-rose-400 text-sm border border-rose-500/20 rounded-lg">{error}</div>}
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Workflow Name *</label>
                <input value={form.name} onChange={e => setForm({...form,name:e.target.value})} required className={inputCls} placeholder="EPCR Review Workflow" /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Domain</label>
                <input value={form.domain||''} onChange={e => setForm({...form,domain:e.target.value})} className={inputCls} placeholder="EMS" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Category</label>
                <input value={form.category||''} onChange={e => setForm({...form,category:e.target.value})} className={inputCls} placeholder="QA" /></div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Review Category</label>
                <input value={form.reviewCategory||''} onChange={e => setForm({...form,reviewCategory:e.target.value})} className={inputCls} placeholder="CARDIAC" /></div>
            </div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Description</label>
              <textarea value={form.description||''} onChange={e => setForm({...form,description:e.target.value})} rows="2" className={inputCls+' resize-none'} /></div>
            <StepsEditor form={form} setForm={setForm} />
            {/* Dynamic Form Builder */}
            <div className="pt-2 border-t border-slate-800">
              <FormBuilder
                schema={form.formSchema || { fields: [] }}
                onChange={newSchema => setForm({ ...form, formSchema: newSchema })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => setForm({...form,active:e.target.checked})} className="rounded border-slate-700 bg-slate-900 text-teal-500" />Active Workflow
            </label>
            <div className="pt-4 flex justify-end gap-3">
              <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                {isSubmitting ? 'Saving...' : title}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Workflows</h1>
          <p className="text-slate-400 text-sm mt-1">Configure and manage EMS process workflows.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchData} disabled={loading} className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50 transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(45,212,191,0.3)]">
            <Plus size={18} /><span>New Workflow</span>
          </button>
        </div>
      </div>

      {error && !isCreateOpen && !isEditOpen && !isDeployOpen && (
        <div className="p-4 bg-rose-500/10 text-rose-400 text-sm border border-rose-500/20 rounded-lg flex justify-between">
          <span>{error}</span><button onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 glass-card rounded-2xl p-12 text-center">
            <RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-teal-500" /><p className="text-slate-400">Loading workflows...</p>
          </div>
        ) : (Array.isArray(workflows) ? workflows : []).length === 0 ? (
          <div className="col-span-2 glass-card rounded-2xl p-16 text-center">
            <GitBranch className="w-14 h-14 text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-300">No Workflows</h2>
            <p className="text-slate-500 mt-2 text-sm">Create your first workflow to get started.</p>
          </div>
        ) : (Array.isArray(workflows) ? workflows : []).map(wf => (
          <div key={wf.id} className="glass-card rounded-2xl p-5 hover-glow transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <GitBranch size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{wf.name}</h3>
                  <p className="text-xs text-slate-500">{wf.domain || 'General'} • {wf.category || 'Workflow'}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${wf.active ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                {wf.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {wf.description && <p className="text-xs text-slate-400 mb-4 line-clamp-2">{wf.description}</p>}

            {/* Steps pipeline */}
            {wf.steps?.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-4">
                {wf.steps.slice(0,5).map((step, i) => (
                  <div key={i} className="flex items-center gap-1 shrink-0">
                    <div className="text-center">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-teal-400 font-bold">{i+1}</div>
                      <p className="text-[9px] text-slate-500 mt-1 max-w-[60px] truncate">{step.stepName}</p>
                    </div>
                    {i < wf.steps.slice(0,5).length - 1 && <ChevronRight size={12} className="text-slate-600 shrink-0" />}
                  </div>
                ))}
                {wf.steps.length > 5 && <span className="text-xs text-slate-500 ml-1">+{wf.steps.length-5} more</span>}
              </div>
            )}

            <div className="flex justify-end gap-1 pt-4 border-t border-slate-800">
              {user?.role === 'ADMIN' && (
                <button onClick={() => openDeploy(wf)} className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-md transition-colors" title="Deploy to orgs"><Rocket size={15} /></button>
              )}
              <button onClick={() => openEdit(wf)} className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-teal-400/10 rounded-md transition-colors" title="Edit"><Edit2 size={15} /></button>
              <button onClick={() => handleDelete(wf.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors" title="Delete"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>

      {isCreateOpen && <WfModal form={wfForm} setForm={setWfForm} onSubmit={handleCreate} onCancel={() => setIsCreateOpen(false)} title="Create Workflow" />}
      {isEditOpen && <WfModal form={wfForm} setForm={setWfForm} onSubmit={handleEdit} onCancel={() => setIsEditOpen(false)} title="Save Changes" />}

      {/* DEPLOY MODAL */}
      {isDeployOpen && selectedWf && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h2 className="text-xl font-bold text-white">Deploy Workflow</h2>
                <p className="text-xs text-slate-500 mt-0.5">{selectedWf.name}</p>
              </div>
              <button onClick={() => setIsDeployOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6">
              {error && <div className="mb-4 p-3 bg-rose-500/10 text-rose-400 text-sm border border-rose-500/20 rounded-lg">{error}</div>}
              <p className="text-sm text-slate-400 mb-4">Select target organizations to deploy this workflow to:</p>
              <form onSubmit={handleDeploy} className="space-y-4">
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {orgs.filter(o => o.id !== selectedWf.organizationId).map(org => (
                    <label key={org.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800 cursor-pointer hover:border-teal-500/30 transition-colors">
                      <input type="checkbox" checked={deployTargets.includes(org.id)} onChange={() => toggleTarget(org.id)} className="rounded border-slate-700 bg-slate-900 text-teal-500" />
                      <div>
                        <p className="text-sm text-slate-200">{org.name}</p>
                        <p className="text-xs text-slate-500">{org.code}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {deployTargets.length > 0 && (
                  <p className="text-xs text-teal-400">{deployTargets.length} organization(s) selected</p>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsDeployOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium">Cancel</button>
                  <button type="submit" disabled={isSubmitting || !deployTargets.length} className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Rocket size={16} />}
                    {isSubmitting ? 'Deploying...' : 'Deploy'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workflows;
