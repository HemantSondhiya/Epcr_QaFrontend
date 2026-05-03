import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Search, Trash2, RefreshCw, X, Edit2, Code, FileText, Download, Upload, AlertCircle } from 'lucide-react';
import { fetchFormTemplates, fetchLatestTemplate, createFormTemplate, fetchFormSubmissions, clearError } from '../store/slices/formTemplateSlice';
import { fetchOrganizations } from '../store/slices/orgSlice';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';

const TEMPLATE_TYPES = ['EPCR', 'QA_FORM', 'FEEDBACK', 'CUSTOM'];
const inputCls = 'w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none';

const FormTemplates = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const { templates, submissions, loading, error } = useSelector(state => state.formTemplate);
  const { organizations } = useSelector(state => state.org);

  const [tab, setTab] = useState('templates'); // 'templates' or 'submissions'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [selectedType, setSelectedType] = useState('EPCR');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewTemplate, setViewTemplate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [addForm, setAddForm] = useState({
    name: '',
    templateType: 'EPCR',
    version: 1,
    published: false,
    active: true,
    schema: '{}',
    layout: '{}',
  });

  const orgId = selectedOrgId || user?.organizationId;

  useEffect(() => {
    dispatch(fetchOrganizations());
  }, [dispatch]);

  useEffect(() => {
    if (orgId) {
      if (tab === 'templates') {
        dispatch(fetchFormTemplates({ orgId, templateType: selectedType }));
      } else {
        dispatch(fetchFormSubmissions(orgId));
      }
    }
  }, [orgId, tab, selectedType, dispatch]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Validate JSON
      try {
        JSON.parse(addForm.schema);
        JSON.parse(addForm.layout);
      } catch {
        dispatch(addToast({ type: 'error', message: 'Invalid JSON in schema or layout' }));
        setIsSubmitting(false);
        return;
      }

      await dispatch(createFormTemplate({
        ...addForm,
        organizationId: orgId,
        schema: JSON.parse(addForm.schema),
        layout: JSON.parse(addForm.layout),
      })).unwrap();

      setIsAddOpen(false);
      setAddForm({
        name: '',
        templateType: 'EPCR',
        version: 1,
        published: false,
        active: true,
        schema: '{}',
        layout: '{}',
      });
      dispatch(addToast({ type: 'success', message: 'Form template created successfully' }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err || 'Failed to create template.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewTemplate = (template) => {
    setViewTemplate(template);
    setIsViewOpen(true);
  };

  const filtered = templates.filter(t =>
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.templateType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSubmissions = submissions.filter(s =>
    s.sourceRecordId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.submittedBy?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const FieldRow = ({ icon, label, name, type = 'text', form, setForm, opts, rows }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-300">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-3 text-slate-500">{icon}</span>
        {opts ? (
          <select name={name} value={form[name]} onChange={e => setForm({ ...form, [name]: e.target.value })}
            className={inputCls + ' pl-9 appearance-none'}>
            {opts.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
          </select>
        ) : rows ? (
          <textarea name={name} value={form[name]} onChange={e => setForm({ ...form, [name]: e.target.value })} rows={rows}
            className={inputCls + ' pl-9 font-mono text-xs resize-none'} />
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Form Templates</h1>
          <p className="text-slate-400 text-sm mt-1">Create and manage dynamic form templates.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => dispatch(tab === 'templates' ? fetchFormTemplates({ orgId, templateType: selectedType }) : fetchFormSubmissions(orgId))} disabled={loading} className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50 transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {tab === 'templates' && (
            <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(45,212,191,0.3)]">
              <Plus size={18} /><span>Add Template</span>
            </button>
          )}
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

      {/* TABS */}
      <div className="flex gap-2 border-b border-slate-700/50">
        <button onClick={() => setTab('templates')} className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'templates' ? 'text-teal-400 border-b-2 border-teal-500' : 'text-slate-400 hover:text-slate-300'}`}>
          <FileText className="inline mr-2" size={16} />
          Templates ({templates.length})
        </button>
        <button onClick={() => setTab('submissions')} className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'submissions' ? 'text-teal-400 border-b-2 border-teal-500' : 'text-slate-400 hover:text-slate-300'}`}>
          <Upload className="inline mr-2" size={16} />
          Submissions ({submissions.length})
        </button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-700/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {Array.isArray(organizations) && organizations.length > 0 && (
              <select value={selectedOrgId} onChange={e => setSelectedOrgId(e.target.value)} className={inputCls + ' flex-1 sm:flex-none sm:w-48'}>
                <option value="">{user?.organizationId ? 'My Organization' : 'Select Organization'}</option>
                {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            )}
            {tab === 'templates' && (
              <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className={inputCls + ' flex-1 sm:flex-none sm:w-40'}>
                {TEMPLATE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>
          <div className="relative flex-1 sm:flex-none sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder={tab === 'templates' ? 'Search templates...' : 'Search submissions...'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 transition-all" />
          </div>
          <span className="text-xs text-slate-500">{tab === 'templates' ? filtered.length : filteredSubmissions.length} items</span>
        </div>

        <div className="overflow-x-auto min-h-96">
          {tab === 'templates' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700/50">
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Version</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Created</th>
                  <th className="px-6 py-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400"><RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-teal-500" />Loading templates...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">No form templates found.</td></tr>
                ) : filtered.map(template => (
                  <tr key={template.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-teal-400" />
                        <span className="text-sm font-medium text-slate-200">{template.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        {template.templateType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">v{template.version}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${template.published ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                          {template.published ? 'Published' : 'Draft'}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${template.active ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                          {template.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {template.createdAt ? new Date(template.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleViewTemplate(template)} className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-teal-400/10 rounded-md transition-colors" title="View">
                          <Code size={15} />
                        </button>
                        <button onClick={() => handleViewTemplate(template)} className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 rounded-md transition-colors" title="Edit">
                          <Edit2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700/50">
                  <th className="px-6 py-4 font-medium">Submission ID</th>
                  <th className="px-6 py-4 font-medium">Template</th>
                  <th className="px-6 py-4 font-medium">Submitted By</th>
                  <th className="px-6 py-4 font-medium">Source Record</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400"><RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-teal-500" />Loading submissions...</td></tr>
                ) : filteredSubmissions.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">No form submissions found.</td></tr>
                ) : filteredSubmissions.map(submission => (
                  <tr key={submission.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-teal-400">{submission.id?.substring(0, 12)}...</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{submission.templateId?.substring(0, 12) || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{submission.submittedBy || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-400">{submission.sourceRecordId?.substring(0, 12) || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD TEMPLATE MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0">
              <h2 className="text-xl font-bold text-white">Add New Form Template</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow icon={<FileText size={16} />} label="Template Name" name="name" form={addForm} setForm={setAddForm} />
                  <FieldRow icon={<FileText size={16} />} label="Type" name="templateType" form={addForm} setForm={setAddForm}
                    opts={TEMPLATE_TYPES.map(t => ({ value: t, label: t }))} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FieldRow icon={<Code size={16} />} label="Version" name="version" type="number" form={addForm} setForm={setAddForm} />
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer pt-6">
                    <input type="checkbox" checked={addForm.published} onChange={e => setAddForm({ ...addForm, published: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-900 text-teal-500" />
                    Published
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer pt-6">
                    <input type="checkbox" checked={addForm.active} onChange={e => setAddForm({ ...addForm, active: e.target.checked })}
                      className="rounded border-slate-700 bg-slate-900 text-teal-500" />
                    Active
                  </label>
                </div>
                <FieldRow icon={<Code size={16} />} label="Schema (JSON)" name="schema" form={addForm} setForm={setAddForm} rows={6} />
                <FieldRow icon={<Code size={16} />} label="Layout (JSON)" name="layout" form={addForm} setForm={setAddForm} rows={6} />
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                    {isSubmitting ? 'Creating...' : 'Create Template'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TEMPLATE MODAL */}
      {isViewOpen && viewTemplate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0">
              <div>
                <h2 className="text-xl font-bold text-white">{viewTemplate.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">v{viewTemplate.version} • {viewTemplate.templateType}</p>
              </div>
              <button onClick={() => setIsViewOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Schema</h3>
                <pre className="bg-slate-950/50 border border-slate-700/50 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto font-mono">
                  {JSON.stringify(viewTemplate.schema, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Layout</h3>
                <pre className="bg-slate-950/50 border border-slate-700/50 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto font-mono">
                  {JSON.stringify(viewTemplate.layout, null, 2)}
                </pre>
              </div>
              <div className="flex justify-end pt-4">
                <button onClick={() => setIsViewOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormTemplates;
