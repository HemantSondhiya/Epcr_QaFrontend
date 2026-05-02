import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Plus, Search, Trash2, RefreshCw, X, Edit2, User as UserIcon, Mail, Phone, Building, Lock, Shield, Check } from 'lucide-react';
import client from '../api/client';
import { addToast } from '../store/slices/uiSlice';

const ROLES = ['ADMIN','MANAGER','PARAMEDIC','PHYSICIAN','QA_REVIEWER','VIEWER'];
const inputCls = 'w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none';

const ROLE_COLORS = {
  ADMIN:       'bg-rose-500/10 text-rose-400 border-rose-500/20',
  MANAGER:     'bg-purple-500/10 text-purple-400 border-purple-500/20',
  PARAMEDIC:   'bg-teal-500/10 text-teal-400 border-teal-500/20',
  PHYSICIAN:   'bg-sky-500/10 text-sky-400 border-sky-500/20',
  QA_REVIEWER: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  VIEWER:      'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const Users = () => {
  const dispatch = useDispatch();
  const [users, setUsers]             = useState([]);
  const [organizations, setOrgs]      = useState([]);
  const [searchTerm, setSearchTerm]   = useState('');
  const [loading, setLoading]         = useState(true);
  const [isAddOpen, setIsAddOpen]     = useState(false);
  const [isEditOpen, setIsEditOpen]   = useState(false);
  const [editUser, setEditUser]       = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [addForm, setAddForm] = useState({ firstName:'', lastName:'', email:'', phone:'', organizationId:'', role:'PARAMEDIC', password:'' });
  const [editForm, setEditForm] = useState({ firstName:'', lastName:'', phone:'', role:'PARAMEDIC', active: true });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, oRes] = await Promise.all([client.get('/api/users'), client.get('/api/organizations').catch(() => ({ data:[] }))]);
      setUsers(uRes.data || []);
      setOrgs(oRes.data || []);
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to fetch users.' }));
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      await client.post('/api/users', addForm);
      setIsAddOpen(false);
      setAddForm({ firstName:'', lastName:'', email:'', phone:'', organizationId:'', role:'PARAMEDIC', password:'' });
      dispatch(addToast({ type: 'success', message: 'User created successfully' }));
      fetchData();
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err.response?.data?.message || 'Failed to create user.' }));
    } finally { setIsSubmitting(false); }
  };

  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({ firstName: user.firstName||'', lastName: user.lastName||'', phone: user.phone||'', role: user.role||'PARAMEDIC', active: user.active ?? true });
    setIsEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      await client.put(`/api/users/${editUser.id}`, editForm);
      setIsEditOpen(false); setEditUser(null);
      dispatch(addToast({ type: 'success', message: 'User updated successfully' }));
      fetchData();
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err.response?.data?.message || 'Failed to update user.' }));
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await client.delete(`/api/users/${userId}`);
      dispatch(addToast({ type: 'success', message: 'User deleted.' }));
      fetchData();
    } catch {
      dispatch(addToast({ type: 'error', message: 'Failed to delete user.' }));
    }
  };

  const filtered = users.filter(u =>
    u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const orgName = (id) => organizations.find(o => o.id === id)?.name || id?.substring(0,12) + '...' || '—';

  const FieldRow = ({ icon, label, name, type='text', form, setForm, opts }) => (
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Users</h1>
          <p className="text-slate-400 text-sm mt-1">Manage system personnel, roles, and access.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} disabled={loading} className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50 transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(45,212,191,0.3)]">
            <Plus size={18} /><span>Add User</span>
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search users..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 transition-all" />
          </div>
          <span className="text-xs text-slate-500">{filtered.length} users</span>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-[var(--border-color)]">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Organization</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400"><RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-teal-500" />Loading users...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">No users found.</td></tr>
              ) : filtered.map(user => (
                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500/30 to-sky-500/30 border border-teal-500/20 flex items-center justify-center text-teal-400 text-xs font-bold">
                        {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                      </div>
                      <div className="text-sm font-medium text-slate-200">{user.firstName} {user.lastName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${ROLE_COLORS[user.role] || ROLE_COLORS.VIEWER}`}>{user.role}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{orgName(user.organizationId)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 text-xs rounded-full border ${user.active !== false ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                      {user.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(user)} className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-teal-400/10 rounded-md transition-colors" title="Edit">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors" title="Delete">
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

      {/* ADD USER MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-xl font-bold text-white">Add New User</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow icon={<UserIcon size={16} />} label="First Name" name="firstName" form={addForm} setForm={setAddForm} />
                  <FieldRow icon={<UserIcon size={16} />} label="Last Name" name="lastName" form={addForm} setForm={setAddForm} />
                </div>
                <FieldRow icon={<Mail size={16} />} label="Email" name="email" type="email" form={addForm} setForm={setAddForm} />
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow icon={<Phone size={16} />} label="Phone" name="phone" form={addForm} setForm={setAddForm} />
                  <FieldRow icon={<Shield size={16} />} label="Role" name="role" form={addForm} setForm={setAddForm}
                    opts={ROLES.map(r => ({ value: r, label: r.replace('_',' ') }))} />
                </div>
                <FieldRow icon={<Building size={16} />} label="Organization" name="organizationId" form={addForm} setForm={setAddForm}
                  opts={[{ value:'', label:'Select Organization' }, ...organizations.map(o => ({ value: o.id, label: o.name }))]} />
                <FieldRow icon={<Lock size={16} />} label="Password" name="password" type="password" form={addForm} setForm={setAddForm} />
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                    {isSubmitting ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditOpen && editUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h2 className="text-xl font-bold text-white">Edit User</h2>
                <p className="text-xs text-slate-500 mt-0.5">{editUser.email}</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow icon={<UserIcon size={16} />} label="First Name" name="firstName" form={editForm} setForm={setEditForm} />
                  <FieldRow icon={<UserIcon size={16} />} label="Last Name" name="lastName" form={editForm} setForm={setEditForm} />
                </div>
                <FieldRow icon={<Phone size={16} />} label="Phone" name="phone" form={editForm} setForm={setEditForm} />
                <FieldRow icon={<Shield size={16} />} label="Role" name="role" form={editForm} setForm={setEditForm}
                  opts={ROLES.map(r => ({ value: r, label: r.replace('_',' ') }))} />
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={editForm.active} onChange={e => setEditForm({ ...editForm, active: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-teal-500" />
                  Active Account
                </label>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
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

export default Users;
