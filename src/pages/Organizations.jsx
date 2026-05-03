import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Building2, Plus, Search, RefreshCw, X, Eye, Trash2, Edit2, Check, AlertCircle } from 'lucide-react';
import client, { extractErrorMessage } from '../api/client';
import { addToast } from '../store/slices/uiSlice';

const inputCls = 'w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none';

const emptyOrg = { name:'', code:'', description:'', address:'', city:'', state:'', zipCode:'', phone:'', email:'', contactPerson:'', licenseNumber:'' };

/* ── OrgForm is defined OUTSIDE the component to prevent remount on every keystroke ── */
const OrgForm = ({ form, onChange, onSubmit, onCancel, title, isSubmitting, formError, fieldErrors }) => {
  const handleField = (field, value) => {
    onChange({ ...form, [field]: value });
  };

  const fieldErr = (field) => fieldErrors?.[field];
  const errBorder = (field) => fieldErr(field) ? 'border-rose-500/50 focus:border-rose-500/50 focus:ring-rose-500/50' : '';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          {formError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2">
              <AlertCircle size={16} className="text-rose-400 mt-0.5 shrink-0" />
              <p className="text-sm text-rose-400">{formError}</p>
            </div>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Name *</label>
                <input value={form.name} onChange={e => handleField('name', e.target.value)} required className={`${inputCls} ${errBorder('name')}`} placeholder="City EMS" />
                {fieldErr('name') && <p className="text-[11px] text-rose-400">{fieldErr('name')}</p>}</div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Code *</label>
                <input value={form.code} onChange={e => handleField('code', e.target.value)} required className={`${inputCls} font-mono ${errBorder('code')}`} placeholder="CITY_EMS" />
                {fieldErr('code') && <p className="text-[11px] text-rose-400">{fieldErr('code')}</p>}</div>
            </div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Description</label>
              <textarea value={form.description} onChange={e => handleField('description', e.target.value)} rows="2" className={`${inputCls} resize-none ${errBorder('description')}`} />
              {fieldErr('description') && <p className="text-[11px] text-rose-400">{fieldErr('description')}</p>}</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Address</label>
                <input value={form.address} onChange={e => handleField('address', e.target.value)} className={`${inputCls} ${errBorder('address')}`} />
                {fieldErr('address') && <p className="text-[11px] text-rose-400">{fieldErr('address')}</p>}</div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">City</label>
                <input value={form.city} onChange={e => handleField('city', e.target.value)} className={`${inputCls} ${errBorder('city')}`} />
                {fieldErr('city') && <p className="text-[11px] text-rose-400">{fieldErr('city')}</p>}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">State</label>
                <input value={form.state} onChange={e => handleField('state', e.target.value)} className={`${inputCls} ${errBorder('state')}`} />
                {fieldErr('state') && <p className="text-[11px] text-rose-400">{fieldErr('state')}</p>}</div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Zip</label>
                <input value={form.zipCode} onChange={e => handleField('zipCode', e.target.value)} className={`${inputCls} ${errBorder('zipCode')}`} />
                {fieldErr('zipCode') && <p className="text-[11px] text-rose-400">{fieldErr('zipCode')}</p>}</div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">License #</label>
                <input value={form.licenseNumber} onChange={e => handleField('licenseNumber', e.target.value)} className={`${inputCls} ${errBorder('licenseNumber')}`} />
                {fieldErr('licenseNumber') && <p className="text-[11px] text-rose-400">{fieldErr('licenseNumber')}</p>}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Phone</label>
                <input value={form.phone} onChange={e => handleField('phone', e.target.value)} className={`${inputCls} ${errBorder('phone')}`} />
                {fieldErr('phone') && <p className="text-[11px] text-rose-400">{fieldErr('phone')}</p>}</div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Email</label>
                <input type="email" value={form.email} onChange={e => handleField('email', e.target.value)} className={`${inputCls} ${errBorder('email')}`} />
                {fieldErr('email') && <p className="text-[11px] text-rose-400">{fieldErr('email')}</p>}</div>
              <div className="space-y-1.5"><label className="text-xs font-medium text-slate-300">Contact Person</label>
                <input value={form.contactPerson} onChange={e => handleField('contactPerson', e.target.value)} className={`${inputCls} ${errBorder('contactPerson')}`} />
                {fieldErr('contactPerson') && <p className="text-[11px] text-rose-400">{fieldErr('contactPerson')}</p>}</div>
            </div>
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
};

const Organizations = () => {
  const dispatch = useDispatch();
  const [organizations, setOrgs]      = useState([]);
  const [searchTerm, setSearchTerm]   = useState('');
  const [loading, setLoading]         = useState(true);
  const [filterActive, setFilter]     = useState('all');
  const [isAddOpen, setIsAddOpen]     = useState(false);
  const [isEditOpen, setIsEditOpen]   = useState(false);
  const [isViewOpen, setIsViewOpen]   = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addForm, setAddForm]         = useState(emptyOrg);
  const [editForm, setEditForm]       = useState(emptyOrg);
  const [formError, setFormError]     = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const endpoint = filterActive === 'active' ? '/api/organizations/active' : '/api/organizations';
      const res = await client.get(endpoint);
      const data = res.data;
      setOrgs(Array.isArray(data) ? data : (data?.content || []));
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to fetch organizations.' }));
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrgs(); }, [filterActive]);

  const parseValidationErrors = (err) => {
    const data = err.response?.data;
    const fields = {};
    // Spring Boot: { errors: { field: "msg" } }
    if (data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
      Object.assign(fields, data.errors);
    }
    // Spring Boot: { fieldErrors: { field: "msg" } }
    if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
      Object.assign(fields, data.fieldErrors);
    }
    // Spring Boot validation: { errors: [ { field, defaultMessage } ] }
    if (Array.isArray(data?.errors)) {
      data.errors.forEach(e => { if (e.field) fields[e.field] = e.defaultMessage || e.message; });
    }
    // Spring Boot: { subErrors: [ { field, message } ] }
    if (Array.isArray(data?.subErrors)) {
      data.subErrors.forEach(e => { if (e.field) fields[e.field] = e.message || e.rejectedValue; });
    }
    setFieldErrors(fields);
    setFormError(extractErrorMessage(err));
  };

  // Client-side validation before API call
  const validateForm = (form) => {
    const errors = {};
    if (!form.name || form.name.trim().length < 2) errors.name = 'Name is required (min 2 characters)';
    if (!form.code || form.code.trim().length < 2) errors.code = 'Code is required (min 2 characters)';
    if (form.code && form.code.length > 20) errors.code = 'Code must be 20 characters or less';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Invalid email format';
    if (form.phone && form.phone.replace(/\D/g, '').length < 10) errors.phone = 'Phone must be at least 10 digits';
    return errors;
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setFormError(''); setFieldErrors({});
    const clientErrors = validateForm(addForm);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setFormError('Please fix the highlighted fields below.');
      return;
    }
    setIsSubmitting(true);
    try {
      await client.post('/api/organizations', addForm);
      setIsAddOpen(false); setAddForm(emptyOrg); setFormError(''); setFieldErrors({});
      dispatch(addToast({ type: 'success', message: 'Organization created successfully' }));
      fetchOrgs();
    } catch (err) {
      parseValidationErrors(err);
    } finally { setIsSubmitting(false); }
  };

  const openEdit = (org) => {
    setSelectedOrg(org);
    setEditForm({ name: org.name||'', code: org.code||'', description: org.description||'',
      address: org.address||'', city: org.city||'', state: org.state||'', zipCode: org.zipCode||'',
      phone: org.phone||'', email: org.email||'', contactPerson: org.contactPerson||'', licenseNumber: org.licenseNumber||'' });
    setIsEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setFormError(''); setFieldErrors({});
    const clientErrors = validateForm(editForm);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setFormError('Please fix the highlighted fields below.');
      return;
    }
    setIsSubmitting(true);
    try {
      await client.put(`/api/organizations/${selectedOrg.id}`, editForm);
      setIsEditOpen(false); setSelectedOrg(null); setFormError(''); setFieldErrors({});
      dispatch(addToast({ type: 'success', message: 'Organization updated successfully' }));
      fetchOrgs();
    } catch (err) {
      parseValidationErrors(err);
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (orgId) => {
    if (!window.confirm('Delete this organization? This cannot be undone.')) return;
    try {
      await client.delete(`/api/organizations/${orgId}`);
      dispatch(addToast({ type: 'success', message: 'Organization deleted.' }));
      fetchOrgs();
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to delete organization.' }));
    }
  };

  const viewOrg = async (orgId) => {
    try {
      const res = await client.get(`/api/organizations/${orgId}`);
      setSelectedOrg(res.data);
      setIsViewOpen(true);
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to load details.' }));
    }
  };

  const filtered = (Array.isArray(organizations) ? organizations : []).filter(o =>
    o.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Organizations</h1>
          <p className="text-slate-400 text-sm mt-1">Manage EMS organizations and departments.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchOrgs} disabled={loading} className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50 transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(45,212,191,0.3)]">
            <Plus size={18} /><span>Add Organization</span>
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search organizations..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 transition-all" />
          </div>
          <div className="flex gap-2">
            {['all','active'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-lg border capitalize transition-colors ${filterActive === f ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/50'}`}>
                {f === 'active' ? 'Active Only' : 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-[var(--border-color)]">
                <th className="px-6 py-4 font-medium">Organization</th>
                <th className="px-6 py-4 font-medium">Code</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center"><RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-teal-500" /><p className="text-slate-400">Loading...</p></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">No organizations found.</td></tr>
              ) : filtered.map(org => (
                <tr key={org.id || org.code} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400"><Building2 size={16} /></div>
                      <div>
                        <div className="text-sm font-medium text-slate-200">{org.name}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[180px]">{org.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 text-xs font-mono bg-slate-800 text-teal-400 rounded border border-slate-700">{org.code}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{org.city}{org.state ? `, ${org.state}` : ''}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{org.contactPerson || org.email || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${org.active ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                      {org.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => viewOrg(org.id)} className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 rounded-md transition-colors" title="View"><Eye size={15} /></button>
                      <button onClick={() => openEdit(org)} className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-teal-400/10 rounded-md transition-colors" title="Edit"><Edit2 size={15} /></button>
                      <button onClick={() => handleDelete(org.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors" title="Delete"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddOpen && <OrgForm form={addForm} onChange={setAddForm} onSubmit={handleCreate} onCancel={() => { setIsAddOpen(false); setFormError(''); setFieldErrors({}); }} title="Add Organization" isSubmitting={isSubmitting} formError={formError} fieldErrors={fieldErrors} />}
      {isEditOpen && <OrgForm form={editForm} onChange={setEditForm} onSubmit={handleEdit} onCancel={() => { setIsEditOpen(false); setFormError(''); setFieldErrors({}); }} title="Save Changes" isSubmitting={isSubmitting} formError={formError} fieldErrors={fieldErrors} />}

      {/* VIEW MODAL */}
      {isViewOpen && selectedOrg && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-xl font-bold text-white">Organization Details</h2>
              <button onClick={() => setIsViewOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400"><Building2 size={24} /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedOrg.name}</h3>
                  <span className="px-2 py-0.5 text-xs font-mono bg-slate-800 text-teal-400 rounded border border-slate-700">{selectedOrg.code}</span>
                </div>
              </div>
              {selectedOrg.description && <p className="text-sm text-slate-400">{selectedOrg.description}</p>}
              <div className="grid grid-cols-2 gap-4">
                {[['Address', selectedOrg.address],['City/State', `${selectedOrg.city||''}${selectedOrg.state?', '+selectedOrg.state:''} ${selectedOrg.zipCode||''}`],
                  ['Phone', selectedOrg.phone],['Email', selectedOrg.email],['Contact', selectedOrg.contactPerson],['License', selectedOrg.licenseNumber]
                ].filter(([,v]) => v?.trim()).map(([label, val]) => (
                  <div key={label}><p className="text-xs text-slate-500 mb-1">{label}</p><p className="text-sm text-slate-300">{val}</p></div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${selectedOrg.active ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                  {selectedOrg.active ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => { setIsViewOpen(false); openEdit(selectedOrg); }}
                  className="flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 transition-colors">
                  <Edit2 size={14} />Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;
