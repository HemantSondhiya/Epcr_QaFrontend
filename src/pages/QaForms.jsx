import { useState, useEffect } from 'react';
import { ClipboardList, Plus, RefreshCw, X, Trash2, Eye, Edit2 } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import client from '../api/client';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';

const inputCls = 'w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none';

const emptyForm = () => ({
  name: '', description: '', organizationId: '', reviewCategory: '',
  callTypes: '', active: true,
  questions: [{ id: crypto.randomUUID(), question: '', type: 'YES_NO', required: true, options: [] }],
  auditCriteria: []
});

const QUESTION_TYPES = ['YES_NO', 'TEXT', 'NUMERIC', 'MULTIPLE_CHOICE', 'RATING'];

const QaForms = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [forms, setForms]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen]   = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData]       = useState(emptyForm());

  const fetchForms = async () => {
    setLoading(true); setError('');
    try {
      const orgId = user?.organizationId;
      if (orgId) {
        const res = await client.get(`/api/qa/forms/organization/${orgId}`);
        const data = res.data;
        setForms(Array.isArray(data) ? data : (data?.content || []));
      } else {
        const orgRes = await client.get('/api/organizations');
        const formLists = await Promise.all(
          (orgRes.data || []).map(org =>
            client.get(`/api/qa/forms/organization/${org.id}`).then(res => res.data || []).catch(() => [])
          )
        );
        setForms(formLists.flat());
      }
    } catch { 
      dispatch(addToast({ type: 'error', message: 'Failed to load QA forms.' }));
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchForms(); }, [user]);

  // Questions helpers
  const addQuestion = () => setFormData(prev => ({
    ...prev,
    questions: [...prev.questions, { id: crypto.randomUUID(), question: '', type: 'YES_NO', required: true, options: [] }]
  }));

  const updateQuestion = (idx, field, val) => setFormData(prev => {
    const qs = [...prev.questions];
    qs[idx] = { ...qs[idx], [field]: val };
    return { ...prev, questions: qs };
  });

  const removeQuestion = (idx) => setFormData(prev => ({
    ...prev, questions: prev.questions.filter((_, i) => i !== idx)
  }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); setError('');
    try {
      const payload = {
        ...formData,
        organizationId: formData.organizationId || user?.organizationId,
        callTypes: formData.callTypes ? formData.callTypes.split(',').map(s => s.trim()).filter(Boolean) : [],
        questions: formData.questions.map(q => ({
          id: q.id, question: q.question, type: q.type,
          required: q.required,
          options: q.type === 'MULTIPLE_CHOICE' ? q.options : []
        })),
        auditCriteria: []
      };
      await client.post('/api/qa/forms', payload);
      setIsCreateOpen(false);
      setFormData(emptyForm());
      dispatch(addToast({ type: 'success', message: 'QA form created successfully' }));
      fetchForms();
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err.response?.data?.message || 'Failed to create QA form.' }));
    } finally { setIsSubmitting(false); }
  };

  const viewForm = async (formId) => {
    try {
      const res = await client.get(`/api/qa/forms/${formId}`);
      setSelectedForm(res.data);
      setIsViewOpen(true);
    } catch { 
      dispatch(addToast({ type: 'error', message: 'Failed to load form details.' }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">QA Forms</h1>
          <p className="text-slate-400 text-sm mt-1">Build and manage quality assurance evaluation forms.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchForms} disabled={loading} className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50 transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(45,212,191,0.3)]">
            <Plus size={18} /><span>New Form</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 text-rose-400 text-sm border border-rose-500/20 rounded-lg flex justify-between">
          <span>{error}</span><button onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 glass-card rounded-2xl p-12 text-center">
            <RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-teal-500" /><p className="text-slate-400">Loading forms...</p>
          </div>
        ) : (Array.isArray(forms) ? forms : []).length === 0 ? (
          <div className="col-span-3 glass-card rounded-2xl p-16 text-center">
            <ClipboardList className="w-14 h-14 text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-300">No QA Forms</h2>
            <p className="text-slate-500 mt-2 text-sm">Create your first evaluation form to get started.</p>
          </div>
        ) : (Array.isArray(forms) ? forms : []).map(form => (
          <div key={form.id} className="glass-card rounded-2xl p-5 hover-glow transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <ClipboardList size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{form.name}</h3>
                  <p className="text-xs text-slate-500">v{form.version || 1} • {form.reviewCategory || 'General'}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${form.active ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                {form.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {form.description && <p className="text-xs text-slate-400 mb-4 line-clamp-2">{form.description}</p>}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{form.questions?.length || 0} questions</span>
              <div className="flex gap-2">
                {form.callTypes?.slice(0, 2).map(ct => (
                  <span key={ct} className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400">{ct}</span>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => viewForm(form.id)}
                className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 rounded-md transition-colors" title="View">
                <Eye size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0">
              <h2 className="text-xl font-bold text-white">Create QA Form</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              {error && <div className="mb-4 p-3 bg-rose-500/10 text-rose-400 text-sm border border-rose-500/20 rounded-lg">{error}</div>}
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Form Name *</label>
                    <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required className={inputCls} placeholder="Standard QA Review" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Review Category</label>
                    <input value={formData.reviewCategory} onChange={e => setFormData({ ...formData, reviewCategory: e.target.value })}
                      className={inputCls} placeholder="e.g. CARDIAC, TRAUMA" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows="2" className={inputCls + ' resize-none'} placeholder="Purpose of this form..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Call Types (comma-separated)</label>
                  <input value={formData.callTypes} onChange={e => setFormData({ ...formData, callTypes: e.target.value })}
                    className={inputCls} placeholder="e.g. ALS, BLS, CARDIAC" />
                </div>

                {/* Questions */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-300">Questions ({formData.questions.length})</label>
                    <button type="button" onClick={addQuestion}
                      className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1">
                      <Plus size={14} />Add Question
                    </button>
                  </div>
                  {formData.questions.map((q, idx) => (
                    <div key={q.id} className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-teal-400">Question {idx + 1}</span>
                        {formData.questions.length > 1 && (
                          <button type="button" onClick={() => removeQuestion(idx)} className="text-rose-400 hover:text-rose-300">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <input value={q.question} onChange={e => updateQuestion(idx, 'question', e.target.value)}
                        placeholder="Enter question text..." className={inputCls} />
                      <div className="grid grid-cols-2 gap-3">
                        <select value={q.type} onChange={e => updateQuestion(idx, 'type', e.target.value)}
                          className={inputCls + ' appearance-none'}>
                          {QUESTION_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                        </select>
                        <label className="flex items-center gap-2 text-sm text-slate-300">
                          <input type="checkbox" checked={q.required} onChange={e => updateQuestion(idx, 'required', e.target.checked)}
                            className="rounded border-slate-700 bg-slate-900 text-teal-500" />
                          Required
                        </label>
                      </div>
                      {q.type === 'MULTIPLE_CHOICE' && (
                        <input
                          value={q.options.join(', ')}
                          onChange={e => updateQuestion(idx, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          placeholder="Options: Yes, No, N/A" className={inputCls} />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-teal-500" />
                  <label className="text-sm text-slate-300">Active Form</label>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                    {isSubmitting ? 'Creating...' : 'Create Form'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {isViewOpen && selectedForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0">
              <h2 className="text-xl font-bold text-white">{selectedForm.name}</h2>
              <button onClick={() => setIsViewOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-slate-500 mb-1">Category</p><p className="text-slate-200">{selectedForm.reviewCategory || '—'}</p></div>
                <div><p className="text-xs text-slate-500 mb-1">Version</p><p className="text-slate-200">v{selectedForm.version || 1}</p></div>
                <div><p className="text-xs text-slate-500 mb-1">Questions</p><p className="text-slate-200">{selectedForm.questions?.length || 0}</p></div>
                <div><p className="text-xs text-slate-500 mb-1">Status</p>
                  <span className={`px-2 py-0.5 text-xs rounded-full border ${selectedForm.active ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                    {selectedForm.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              {selectedForm.description && <p className="text-sm text-slate-400">{selectedForm.description}</p>}
              {selectedForm.callTypes?.length > 0 && (
                <div><p className="text-xs text-slate-500 mb-2">Call Types</p>
                  <div className="flex flex-wrap gap-2">{selectedForm.callTypes.map(ct => <span key={ct} className="px-2 py-0.5 text-xs bg-slate-800 border border-slate-700 text-slate-300 rounded">{ct}</span>)}</div>
                </div>
              )}
              {selectedForm.questions?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Questions</p>
                  <div className="space-y-2">
                    {selectedForm.questions.map((q, i) => (
                      <div key={q.id || i} className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-slate-200">{i + 1}. {q.question}</p>
                          <div className="flex gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700">{q.type}</span>
                            {q.required && <span className="text-[10px] px-1.5 py-0.5 bg-rose-500/10 text-rose-400 rounded border border-rose-500/20">Required</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QaForms;
