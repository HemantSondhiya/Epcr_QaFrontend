import { useState, useEffect } from 'react';
import { Plus, Filter, Search, FileEdit, Trash2, Eye, RefreshCw, X, Send, ArrowLeft, Save, ChevronRight, User, Activity, FilePlus2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import client from '../api/client';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';

const StatusBadge = ({ status }) => {
  const styles = {
    DRAFT:       'bg-slate-500/10 text-slate-400 border-slate-500/20',
    IN_PROGRESS: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    COMPLETED:   'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    SUBMITTED:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
    APPROVED:    'bg-teal-500/10 text-teal-400 border-teal-500/20',
    REJECTED:    'bg-rose-500/10 text-rose-400 border-rose-500/20',
    ARCHIVED:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
    QA_PENDING:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
    QA_APPROVED: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${styles[status] || styles.DRAFT}`}>
      {(status || 'DRAFT').replace(/_/g, ' ')}
    </span>
  );
};

const DetailRow = ({ label, value }) => (
  <div>
    <p className="text-xs text-slate-500 mb-1">{label}</p>
    <p className="text-sm text-slate-200">{value || '—'}</p>
  </div>
);

const RecordsList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View modal
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);

  // Edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editStep, setEditStep] = useState(1);
  const [editData, setEditData] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  // Confirm modal
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'delete'|'submit', recordId, message }

  const isManager   = user?.role === 'MANAGER';
  const isParamedic = user?.role === 'PARAMEDIC';
  const isReadOnly  = user?.role === 'PHYSICIAN' || user?.role === 'QA_REVIEWER' || user?.role === 'VIEWER';

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchRecords = async (pageNum = 0, isAppend = false) => {
    if (!isAppend) setLoading(true);
    setError('');
    try {
      const size = 20;
      let endpoint = `/api/epcr/records?page=${pageNum}&size=${size}`;

      if (isParamedic && (user?.userId || user?.id)) {
        const pid = user.userId || user.id;
        endpoint = `/api/epcr/records/paramedic/${pid}`;
      }

      const res = await client.get(endpoint, { hideToast: true });

      const isPaginated = res.data && res.data.content !== undefined;
      const newRecords = isPaginated ? res.data.content : (res.data || []);
      
      setRecords(prev => isAppend ? [...prev, ...newRecords] : newRecords);
      setHasMore(isPaginated ? !res.data.last : false);
      setPage(pageNum);
    } catch (err) {
      dispatch(addToast({ type: 'error', message: 'Failed to fetch records.' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(0, false);
  }, []);

  // ── VIEW ── use local data directly (no extra API call needed)
  const handleView = (recordId) => {
    const record = records.find(r => r.id === recordId);
    if (record) {
      setViewRecord(record);
      setIsViewOpen(true);
    }
  };

  // ── EDIT ──
  const handleOpenEdit = (record) => {
    if (isReadOnly || isManager) return;
    setEditData({
      id: record.id,
      patientName: record.patientName || '',
      patientDateOfBirth: record.patientDateOfBirth || '',
      patientGender: record.patientGender || '',
      patientPhone: record.patientPhone || '',
      patientAddress: record.patientAddress || '',
      incidentDateTime: record.incidentDateTime ? record.incidentDateTime.substring(0, 16) : '',
      incidentLocation: record.incidentLocation || '',
      incidentDescription: record.incidentDescription || '',
      complaints: Array.isArray(record.complaints) ? record.complaints.join(', ') : (record.complaints || ''),
      vitals: Array.isArray(record.vitals) ? record.vitals.join(', ') : (record.vitals || ''),
      diagnosis: record.diagnosis || '',
      treatmentProvided: record.treatmentProvided || '',
      transportDestination: record.transportDestination || ''
    });
    setEditStep(1);
    setIsEditOpen(true);
  };

  const handleEditChange = (e) => setEditData({ ...editData, [e.target.name]: e.target.value });

  const handleSaveEdit = async () => {
    setEditSaving(true);
    setError('');
    try {
      const payload = {};
      const stringFields = ['patientName', 'patientDateOfBirth', 'patientGender', 'patientPhone', 'patientAddress',
        'incidentLocation', 'incidentDescription', 'diagnosis', 'treatmentProvided', 'transportDestination'];
      
      stringFields.forEach(field => {
        if (editData[field] && editData[field].trim()) {
          payload[field] = editData[field].trim();
        }
      });

      if (editData.incidentDateTime) {
        let dt = editData.incidentDateTime;
        if (dt.length === 16) dt += ':00';
        payload.incidentDateTime = dt;
      }

      payload.complaints = editData.complaints ? editData.complaints.split(',').map(c => c.trim()).filter(Boolean) : [];
      payload.vitals = editData.vitals ? editData.vitals.split(',').map(v => v.trim()).filter(Boolean) : [];

      await client.put(`/api/epcr/records/${editData.id}`, payload);
      setIsEditOpen(false);
      dispatch(addToast({ type: 'success', message: 'Record updated' }));
      fetchRecords();
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err.response?.data?.message || err.response?.data?.error || 'Failed to update record.' }));
    } finally {
      setEditSaving(false);
    }
  };

  // ── DELETE ──
  const handleDelete = (recordId) => {
    if (isReadOnly || isManager) return;
    setConfirmAction({ type: 'delete', recordId, message: 'Are you sure you want to delete this EPCR record? This action cannot be undone.' });
  };

  // ── SUBMIT ──
  const handleSubmitRecord = (recordId) => {
    if (isReadOnly || isManager) return;
    setConfirmAction({ type: 'submit', recordId, message: 'Submit this record for QA review? Once submitted it cannot be edited.' });
  };

  // Execute confirmed action
  const executeConfirm = async () => {
    if (!confirmAction) return;
    const { type, recordId } = confirmAction;
    setConfirmAction(null);
    try {
      if (type === 'delete') {
        await client.delete(`/api/epcr/records/${recordId}`);
        dispatch(addToast({ type: 'success', message: 'Record deleted' }));
      } else if (type === 'submit') {
        await client.post(`/api/epcr/records/${recordId}/submit`);
        dispatch(addToast({ type: 'success', message: 'Record submitted' }));
        setIsViewOpen(false);
      }
      fetchRecords();
    } catch (err) {
      dispatch(addToast({ type: 'error', message: err.response?.data?.message || `Failed to ${type} record.` }));
    }
  };

  const filteredRecords = records.filter(record =>
    record.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inputClass = "w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50";

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">EPCR Records</h1>
          <p className="text-slate-400 text-sm mt-1">
            {isParamedic ? 'Your patient care reports returned by backend visibility.' : 'View and manage patient care reports.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchRecords(0, false)} disabled={loading} className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg transition-colors border border-slate-700/50 disabled:opacity-50" title="Refresh">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {(isParamedic || user?.role === 'ADMIN') && (
            <button onClick={() => navigate('/epcr/new')} className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-900 px-4 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(45,212,191,0.3)]">
              <Plus size={18} /><span>New Record</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 text-rose-400 text-sm border border-rose-500/20 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-300"><X size={16} /></button>
        </div>
      )}

      {/* Table Card */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder={isParamedic ? 'Search your records by name or ID...' : 'Search records by name or ID...'} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 hover:bg-slate-700/50 transition-colors">
            <Filter size={18} /><span>Filter</span>
          </button>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-[var(--border-color)]">
                <th className="px-6 py-4 font-medium">Record ID</th>
                <th className="px-6 py-4 font-medium">Patient</th>
                <th className="px-6 py-4 font-medium">Incident Date/Time</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400"><RefreshCw className="animate-spin w-6 h-6 mx-auto mb-2 text-teal-500" />Loading records...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">{isParamedic ? 'No records assigned to you yet.' : 'No records found.'}</td></tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm font-medium text-teal-400">{record.id}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-slate-200">{record.patientName}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{record.incidentDateTime ? new Date(record.incidentDateTime).toLocaleString() : '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{record.incidentLocation}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={record.status} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-1">
                        {/* View — always visible */}
                        <button onClick={() => handleView(record.id)} className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 rounded-md transition-colors" title="View Details">
                          <Eye size={16} />
                        </button>
                        {/* Edit — only for DRAFT */}
                        {!isReadOnly && !isManager && (!record.status || record.status === 'DRAFT') && (
                          <button onClick={() => handleOpenEdit(record)} className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-teal-400/10 rounded-md transition-colors" title="Edit Record">
                            <FileEdit size={16} />
                          </button>
                        )}
                        {/* Submit — only for DRAFT */}
                        {!isReadOnly && !isManager && (!record.status || record.status === 'DRAFT') && (
                          <button onClick={() => handleSubmitRecord(record.id)} className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-400/10 rounded-md transition-colors" title="Submit Record">
                            <Send size={16} />
                          </button>
                        )}
                        {/* Delete — only for DRAFT */}
                        {!isReadOnly && !isManager && (!record.status || record.status === 'DRAFT') && (
                          <button onClick={() => handleDelete(record.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-md transition-colors" title="Delete Record">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-between text-sm text-slate-400">
          <span>{isParamedic ? `Showing ${filteredRecords.length} of your records` : `Showing ${filteredRecords.length} records`}</span>
          {hasMore && (
            <button 
              onClick={() => fetchRecords(page + 1, true)}
              disabled={loading}
              className="px-4 py-1.5 text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-lg hover:bg-teal-500/20 transition-colors disabled:opacity-50"
            >
              Load More
            </button>
          )}
        </div>
      </div>

      {/* ═══════════ VIEW MODAL ═══════════ */}
      {isViewOpen && viewRecord && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white">Record Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">{viewRecord.id}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isReadOnly && !isManager && (!viewRecord.status || viewRecord.status === 'DRAFT') && (
                  <>
                    <button onClick={() => { setIsViewOpen(false); handleOpenEdit(viewRecord); }} className="px-3 py-1.5 text-sm bg-slate-800 text-teal-400 border border-teal-500/20 rounded-lg hover:bg-teal-500/10 transition-colors flex items-center gap-1.5">
                      <FileEdit size={14} />Edit
                    </button>
                    <button onClick={() => handleSubmitRecord(viewRecord.id)} className="px-3 py-1.5 text-sm bg-teal-500 text-slate-900 rounded-lg hover:bg-teal-400 transition-colors flex items-center gap-1.5 font-medium">
                      <Send size={14} />Submit
                    </button>
                  </>
                )}
                <button onClick={() => setIsViewOpen(false)} className="text-slate-400 hover:text-slate-200 ml-2"><X size={20} /></button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Status */}
              <div className="flex items-center gap-3">
                <StatusBadge status={viewRecord.status} />
                {viewRecord.createdAt && <span className="text-xs text-slate-500">Created: {new Date(viewRecord.createdAt).toLocaleString()}</span>}
              </div>

              {/* Patient Info */}
              <div>
                <h3 className="text-sm font-semibold text-teal-400 mb-3 uppercase tracking-wider">Patient Information</h3>
                <div className="grid grid-cols-2 gap-4 bg-slate-900/30 rounded-xl p-4 border border-slate-800">
                  <DetailRow label="Full Name" value={viewRecord.patientName} />
                  <DetailRow label="Date of Birth" value={viewRecord.patientDateOfBirth} />
                  <DetailRow label="Gender" value={viewRecord.patientGender} />
                  <DetailRow label="Phone" value={viewRecord.patientPhone} />
                  <div className="col-span-2"><DetailRow label="Address" value={viewRecord.patientAddress} /></div>
                </div>
              </div>

              {/* Incident Info */}
              <div>
                <h3 className="text-sm font-semibold text-sky-400 mb-3 uppercase tracking-wider">Incident Details</h3>
                <div className="grid grid-cols-2 gap-4 bg-slate-900/30 rounded-xl p-4 border border-slate-800">
                  <DetailRow label="Date & Time" value={viewRecord.incidentDateTime ? new Date(viewRecord.incidentDateTime).toLocaleString() : ''} />
                  <DetailRow label="Location" value={viewRecord.incidentLocation} />
                  <div className="col-span-2"><DetailRow label="Description" value={viewRecord.incidentDescription} /></div>
                  <div className="col-span-2"><DetailRow label="Chief Complaints" value={Array.isArray(viewRecord.complaints) ? viewRecord.complaints.join(', ') : viewRecord.complaints} /></div>
                </div>
              </div>

              {/* Treatment */}
              <div>
                <h3 className="text-sm font-semibold text-amber-400 mb-3 uppercase tracking-wider">Vitals & Treatment</h3>
                <div className="grid grid-cols-2 gap-4 bg-slate-900/30 rounded-xl p-4 border border-slate-800">
                  <div className="col-span-2"><DetailRow label="Vitals" value={Array.isArray(viewRecord.vitals) ? viewRecord.vitals.join(', ') : viewRecord.vitals} /></div>
                  <DetailRow label="Diagnosis" value={viewRecord.diagnosis} />
                  <DetailRow label="Transport Destination" value={viewRecord.transportDestination} />
                  <div className="col-span-2"><DetailRow label="Treatment Provided" value={viewRecord.treatmentProvided} /></div>
                </div>
              </div>

              {/* QA Auto-Flags */}
              {viewRecord.dynamicFormResponses?.qaAutoFlags?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-rose-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse inline-block"></span>
                    QA Auto-Flags ({viewRecord.dynamicFormResponses.qaAutoFlags.length})
                  </h3>
                  <div className="space-y-2">
                    {viewRecord.dynamicFormResponses.qaAutoFlags.map((flag, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg">
                        <span className="text-rose-400 text-xs font-bold mt-0.5">⚑</span>
                        <div>
                          <p className="text-sm text-rose-300 font-medium">{flag.ruleName || flag.message || flag}</p>
                          {flag.details && <p className="text-xs text-slate-400 mt-0.5">{flag.details}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Form Responses */}
              {viewRecord.dynamicFormResponses && (() => {
                const { qaAutoFlags, workflowId, workflowName, ...customFields } = viewRecord.dynamicFormResponses;
                const hasCustomFields = Object.keys(customFields).length > 0;
                if (!hasCustomFields) return null;
                return (
                  <div>
                    <h3 className="text-sm font-semibold text-purple-400 mb-3 uppercase tracking-wider">
                      Workflow Fields {workflowName && <span className="normal-case text-slate-500 font-normal ml-1">({workflowName})</span>}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 bg-slate-900/30 rounded-xl p-4 border border-slate-800">
                      {Object.entries(customFields).map(([key, value]) => (
                        <DetailRow
                          key={key}
                          label={key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          value={typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value ?? '—')}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ EDIT MODAL (Multi-step) ═══════════ */}
      {isEditOpen && editData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white">Edit Record</h2>
                <p className="text-xs text-slate-500 mt-0.5">{editData.id}</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>

            {/* Step indicator */}
            <div className="px-6 py-4 border-b border-slate-800 flex gap-2">
              {['Patient Info', 'Incident', 'Vitals & Treatment'].map((label, idx) => (
                <button key={idx} onClick={() => setEditStep(idx + 1)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${editStep === idx + 1 ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-500 hover:text-slate-300 border border-slate-800 hover:border-slate-700'}`}>
                  {idx + 1}. {label}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto">
              {error && (<div className="mb-4 p-3 bg-rose-500/10 text-rose-400 text-sm border border-rose-500/20 rounded-lg">{error}</div>)}

              {editStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Full Name</label>
                      <input name="patientName" value={editData.patientName} onChange={handleEditChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Date of Birth</label>
                      <input type="date" name="patientDateOfBirth" value={editData.patientDateOfBirth} onChange={handleEditChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Gender</label>
                      <select name="patientGender" value={editData.patientGender} onChange={handleEditChange} className={inputClass + ' appearance-none'}>
                        <option value="">Select</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Phone</label>
                      <input name="patientPhone" value={editData.patientPhone} onChange={handleEditChange} className={inputClass} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Address</label>
                    <input name="patientAddress" value={editData.patientAddress} onChange={handleEditChange} className={inputClass} />
                  </div>
                </div>
              )}

              {editStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Date & Time</label>
                      <input type="datetime-local" name="incidentDateTime" value={editData.incidentDateTime} onChange={handleEditChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Location</label>
                      <input name="incidentLocation" value={editData.incidentLocation} onChange={handleEditChange} className={inputClass} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Description</label>
                    <textarea name="incidentDescription" value={editData.incidentDescription} onChange={handleEditChange} rows="3" className={inputClass + ' resize-none'} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Complaints (comma separated)</label>
                    <input name="complaints" value={editData.complaints} onChange={handleEditChange} className={inputClass} />
                  </div>
                </div>
              )}

              {editStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Vitals (comma separated)</label>
                    <input name="vitals" value={editData.vitals} onChange={handleEditChange} className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Diagnosis</label>
                      <input name="diagnosis" value={editData.diagnosis} onChange={handleEditChange} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Transport Destination</label>
                      <input name="transportDestination" value={editData.transportDestination} onChange={handleEditChange} className={inputClass} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Treatment Provided</label>
                    <textarea name="treatmentProvided" value={editData.treatmentProvided} onChange={handleEditChange} rows="3" className={inputClass + ' resize-none'} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 flex justify-between items-center shrink-0">
              <button onClick={() => setEditStep(prev => Math.max(1, prev - 1))} disabled={editStep === 1} className="px-4 py-2 rounded-lg text-slate-300 font-medium hover:bg-slate-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">
                Back
              </button>
              <div className="flex gap-3">
                <button onClick={() => setIsEditOpen(false)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors">Cancel</button>
                {editStep < 3 ? (
                  <button onClick={() => setEditStep(prev => prev + 1)} className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-400 text-slate-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Next <ChevronRight size={16} />
                  </button>
                ) : (
                  <button onClick={handleSaveEdit} disabled={editSaving} className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-400 text-slate-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                    <Save size={16} />
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ═══════════ CONFIRM MODAL ═══════════ */}
      {confirmAction && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-main)] border border-slate-700/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-lg font-bold text-white">{confirmAction.type === 'delete' ? 'Delete Record' : 'Submit Record'}</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-300">{confirmAction.message}</p>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setConfirmAction(null)} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors">Cancel</button>
                <button onClick={executeConfirm} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${confirmAction.type === 'delete' ? 'bg-rose-500 hover:bg-rose-400 text-white' : 'bg-teal-500 hover:bg-teal-400 text-slate-900'}`}>
                  {confirmAction.type === 'delete' ? <><Trash2 size={14} /> Delete</> : <><Send size={14} /> Submit</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordsList;
