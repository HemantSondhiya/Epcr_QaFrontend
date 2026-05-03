import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Search, Trash2, RefreshCw, X, Edit2, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { fetchQARules, createQARule, updateQARule, deleteQARule, clearError } from '../store/slices/qaRulesSlice';
import { fetchOrganizations } from '../store/slices/orgSlice';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';

const OPERATORS = ['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'GREATER_THAN', 'LESS_THAN', 'IN_LIST', 'NOT_IN_LIST'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const inputCls = 'w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none';

const SEVERITY_COLORS = {
  LOW:      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  MEDIUM:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  HIGH:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
  CRITICAL: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const QaRules = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const { rules, loading, error } = useSelector(state => state.qaRules);
  const { organizations } = useSelector(state => state.org);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [addForm, setAddForm] = useState({
    name: '',
    fieldPath: '',
    operator: 'EQUALS',
    expectedValue: '',
    severity: 'MEDIUM',
    message: '',
    active: true,
  });

  const [editForm, setEditForm] = useState({
    name: '',
    fieldPath: '',
    operator: 'EQUALS',
    expectedValue: '',
    severity: 'MEDIUM',
    message: '',
    active: true,
  });

  const orgId = selectedOrgId || user?.organizationId;

  useEffect(() => {
    dispatch(fetchOrganizations());
    if (orgId) {
      dispatch(fetchQARules(orgId));
    }
  }, [orgId, dispatch]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await dispatch(createQARule({
        ...addForm,
        organizationId: orgId,
      })).unwrap();
      setIsAddOpen(false);
      setAddForm({
        name: '',
        fieldPath: '',
        operator: 'EQUALS',
        expectedValue: '',
        severity: 'MEDIUM',
        message: '',
        active: true,
      });
      dispatch(addToast({ type: 'success', message: 'QA Rule created successfully' }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err || 'Failed to create rule.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (rule) => {
    setEditRule(rule);
    setEditForm({
      name: rule.name || '',
      fieldPath: rule.fieldPath || '',
      operator: rule.operator || 'EQUALS',
      expectedValue: rule.expectedValue || '',
      severity: rule.severity || 'MEDIUM',
      message: rule.message || '',
      active: rule.active ?? true,
    });
    setIsEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await dispatch(updateQARule({ id: editRule.id, data: editForm })).unwrap();
      setIsEditOpen(false);
      setEditRule(null);
      dispatch(addToast({ type: 'success', message: 'QA Rule updated successfully' }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err || 'Failed to update rule.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Delete this QA rule?')) return;
    try {
      await dispatch(deleteQARule(ruleId)).unwrap();
      dispatch(addToast({ type: 'success', message: 'QA Rule deleted.' }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: 'Failed to delete rule.' }));
    }
  };

  const filtered = rules.filter(r =>
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.fieldPath?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const FieldRow = ({ icon, label, name, type = 'text', form, setForm, opts }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-300">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>
        {opts ? (
          <select name={name} value={form[name]} onChange={e => setForm({ ...form, [name]: e.target.value })}
            className={inputCls + ' pl-9 appearance-none'}>
            {opts.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
          </select>
        ) : (
          <input type={type} name={name} value={form[name]} onChange={e => setForm({ ...form, [name]: e.target.value })}
            className={inputCls + ' pl-9'} />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">QA Auto-Flag Rules</h1>
          <p className="text-slate-400 text-sm mt-1">Create and manage automatic quality assurance flagging rules.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => dispatch(fetchQARules(orgId))} disabled={loading} className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50 transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(45,212,191,0.3)]">
            <Plus size={18} /><span>Add Rule</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-rose-400 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-medium text-rose-400">Error</p>
            <p className="text-xs text-rose-300 mt-0.5">{error}</p>
          </div>
          <button onClick={() => dispatch(clearError())} className="ml-auto text-rose-400 hover:text-rose-300">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {Array.isArray(organizations) && organizations.length > 0 && (
              <select value={selectedOrgId} onChange={e => setSelectedOrgId(e.target.value)} className={inputCls + ' flex-1 sm:flex-none sm:w-48'}>
                <option value="">{user?.organizationId ? 'My Organization' : 'Select Organization'}</option>
                {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            )}
          </div>
          <div className="relative flex-1 sm:flex-none sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search rules..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 transition-all" />
          </div>
          <span className="text-xs text-slate-500">{filtered.length} rules</span>
        </div>

        <div className="overflow-x-auto min-h-96">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700/50">
                <th className="px-6 py-4 font-medium">Rule Name</th>
                <th className="px-6 py-4 font-medium">Field Path</th>
                <th className="px-6 py-4 font-medium">Condition</th>
                <th className="px-6 py-4 font-medium">Severity</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400"><RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-teal-500" />Loading rules...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">No QA rules configured.</td></tr>
              ) : filtered.map(rule => (
                <tr key={rule.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-200">{rule.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{rule.message?.substring(0, 40)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{rule.fieldPath}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    <span className="font-mono">{rule.operator}</span>
                    <span className="mx-1">:</span>
                    <span className="font-mono text-teal-400">{rule.expectedValue?.substring(0, 20)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.MEDIUM}`}>
                      {rule.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full border ${rule.active !== false ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                      <CheckCircle2 size={12} />
                      {rule.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(rule)} className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-teal-400/10 rounded-md transition-colors" title="Edit">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => handleDelete(rule.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD RULE MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-xl font-bold text-white">Add New QA Rule</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow icon={<Shield size={16} />} label="Rule Name" name="name" form={addForm} setForm={setAddForm} />
                  <FieldRow icon={<AlertCircle size={16} />} label="Severity" name="severity" form={addForm} setForm={setAddForm}
                    opts={SEVERITIES.map(s => ({ value: s, label: s }))} />
                </div>
                <FieldRow icon={<AlertCircle size={16} />} label="Field Path (e.g., patientAge, diagnosis)" name="fieldPath" form={addForm} setForm={setAddForm} />
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow icon={<AlertCircle size={16} />} label="Operator" name="operator" form={addForm} setForm={setAddForm}
                    opts={OPERATORS.map(o => ({ value: o, label: o }))} />
                  <FieldRow icon={<AlertCircle size={16} />} label="Expected Value" name="expectedValue" form={addForm} setForm={setAddForm} />
                </div>
                <FieldRow icon={<AlertCircle size={16} />} label="Message" name="message" form={addForm} setForm={setAddForm} />
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={addForm.active} onChange={e => setAddForm({ ...addForm, active: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-teal-500" />
                  Active
                </label>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                    {isSubmitting ? 'Creating...' : 'Create Rule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT RULE MODAL */}
      {isEditOpen && editRule && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h2 className="text-xl font-bold text-white">Edit QA Rule</h2>
                <p className="text-xs text-slate-500 mt-0.5">{editRule.id}</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow icon={<Shield size={16} />} label="Rule Name" name="name" form={editForm} setForm={setEditForm} />
                  <FieldRow icon={<AlertCircle size={16} />} label="Severity" name="severity" form={editForm} setForm={setEditForm}
                    opts={SEVERITIES.map(s => ({ value: s, label: s }))} />
                </div>
                <FieldRow icon={<AlertCircle size={16} />} label="Field Path" name="fieldPath" form={editForm} setForm={setEditForm} />
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow icon={<AlertCircle size={16} />} label="Operator" name="operator" form={editForm} setForm={setEditForm}
                    opts={OPERATORS.map(o => ({ value: o, label: o }))} />
                  <FieldRow icon={<AlertCircle size={16} />} label="Expected Value" name="expectedValue" form={editForm} setForm={setEditForm} />
                </div>
                <FieldRow icon={<AlertCircle size={16} />} label="Message" name="message" form={editForm} setForm={setEditForm} />
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={editForm.active} onChange={e => setEditForm({ ...editForm, active: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-teal-500" />
                  Active
                </label>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
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

export default QaRules;
