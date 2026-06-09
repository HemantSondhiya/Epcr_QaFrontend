import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Plus, Search, FileEdit, Trash2, Eye, RefreshCw, X,
  Send, AlertCircle, MapPin, FileText, AlertTriangle,
  User, Heart, Activity, Clock, Truck, Shield
} from 'lucide-react';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import {
  fetchRecords as fetchEpcrRecords, deleteRecord,
  submitRecord, selectRecords, selectEpcrLoading, selectEpcrPagination,
  fetchIncidentTypes, selectIncidentTypes
} from '../store/slices/epcrSlice';
import { fetchAllPatientHistory } from '../store/slices/patientHistorySlice';
import client, { extractErrorMessage } from '../api/client';
import { fetchUnreadNotifications } from '../store/slices/notificationSlice';
import AiSuggestionPanel from '../components/common/AiSuggestionPanel';

const INCIDENT_TYPES = [
  'GENERAL', 'EMERGENCY', 'TRAUMA', 'CARDIOLOGY', 'RESPIRATORY', 'NEUROLOGY',
  'OBSTETRIC', 'PEDIATRIC', 'BEHAVIORAL', 'DENTIST', 'ONCOLOGY', 'RADIOLOGY',
  'ORTHOPEDIC', 'DERMATOLOGY', 'OPHTHALMOLOGY', 'ENT', 'GASTROENTEROLOGY',
  'UROLOGY', 'NEPHROLOGY', 'ENDOCRINOLOGY', 'PSYCHIATRY', 'GERIATRIC',
  'ALLERGY', 'INFECTIOUS_DISEASE', 'OTHER',
];

const INCIDENT_TYPE_COLORS = {
  GENERAL: 'bg-blue-50 text-blue-700 border-blue-200',
  EMERGENCY: 'bg-red-50 text-red-700 border-red-200',
  TRAUMA: 'bg-orange-50 text-orange-700 border-orange-200',
  CARDIOLOGY: 'bg-rose-50 text-rose-700 border-rose-200',
  RESPIRATORY: 'bg-sky-50 text-sky-700 border-sky-200',
  NEUROLOGY: 'bg-violet-50 text-violet-700 border-violet-200',
  OBSTETRIC: 'bg-pink-50 text-pink-700 border-pink-200',
  PEDIATRIC: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  BEHAVIORAL: 'bg-purple-50 text-purple-700 border-purple-200',
  DENTIST: 'bg-teal-50 text-teal-700 border-teal-200',
  ONCOLOGY: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  RADIOLOGY: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ORTHOPEDIC: 'bg-amber-50 text-amber-700 border-amber-200',
  DERMATOLOGY: 'bg-lime-50 text-lime-700 border-lime-200',
  OTHER: 'bg-slate-50 text-slate-600 border-slate-200',
};

const IncidentTypeBadge = ({ type }) => {
  if (!type) return <span className="text-[#A0AECB] text-xs">—</span>;
  
  const getIncidentTypeColor = (rawType) => {
    const t = String(rawType).toUpperCase();
    if (t === 'DENTIST' || t === 'DENTAL' || t.includes('DENT')) return 'bg-teal-50 text-teal-700 border-teal-200';
    if (t.includes('CARDIO') || t.includes('CARDIAC')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (t.includes('TRAUMA')) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (t.includes('OBSTETRIC') || t.includes('OBG')) return 'bg-pink-50 text-pink-700 border-pink-200';
    if (t.includes('ONCOLOGY')) return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
    if (t.includes('RADIOLOGY')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (t.includes('PEDIATRIC')) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (t.includes('NEURO')) return 'bg-violet-50 text-violet-700 border-violet-200';
    if (t.includes('RESPIRATORY')) return 'bg-sky-50 text-sky-700 border-sky-200';
    if (t.includes('BEHAVIORAL')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (t.includes('EMERGENCY')) return 'bg-red-50 text-red-700 border-red-200';
    if (t.includes('GENERAL')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (t.includes('ENT')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (t.includes('COLLISION') || t.includes('TRANSFER')) return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    
    return INCIDENT_TYPE_COLORS[t] || 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const colorCls = getIncidentTypeColor(type);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${colorCls}`}>
      {type.replace(/_/g, ' ')}
    </span>
  );
};

const STATUS_BADGE = {
  DRAFT: 'badge badge-gray',
  PENDING: 'badge badge-gray',
  IN_PROGRESS: 'badge badge-blue',
  ACTIVE: 'badge badge-blue',
  COMPLETED: 'badge badge-blue',
  SUBMITTED: 'badge badge-blue',
  APPROVED: 'badge badge-green',
  QA_APPROVED: 'badge badge-green',
  QA_COMPLETED: 'badge badge-green',
  REJECTED: 'badge badge-red',
  ARCHIVED: 'badge badge-gray',
  QA_PENDING: 'badge badge-orange',
};

const StatusBadge = ({ status }) => (
  <span className={STATUS_BADGE[status] || 'badge badge-gray'}>
    {(status || 'DRAFT').replace(/_/g, ' ')}
  </span>
);

const DetailRow = ({ label, value, colSpan = 1 }) => {
  const v = (value === null || value === undefined || value === '') ? '—' : value;
  return (
    <div className={`space-y-1 ${colSpan > 1 ? `col-span-${colSpan}` : ''}`}>
      <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest">{label}</p>
      <p className="text-sm font-semibold text-[#0F1A3A] break-words">{v}</p>
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, color = "text-brand-blue" }) => (
  <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 mb-4">
    <div className={`p-2 rounded-lg bg-slate-50 ${color}`}><Icon size={18} /></div>
    <h4 className={`text-xs font-black uppercase tracking-widest ${color}`}>{title}</h4>
  </div>
);

const PAGE_SIZE = 20;

const RecordsList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const records = useSelector(selectRecords);
  const loading = useSelector(selectEpcrLoading);
  const pagination = useSelector(selectEpcrPagination);
  const backendIncidentTypes = useSelector(selectIncidentTypes);
  const incidentTypesOptions = backendIncidentTypes && backendIncidentTypes.length > 0
    ? backendIncidentTypes
    : INCIDENT_TYPES;

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isParamedic = user?.role === 'PARAMEDIC';

  const canEditRecord = (r) => {
    if (isAdmin) return true;
    if (['PARAMEDIC', 'QA_REVIEWER', 'PHYSICIAN'].includes(user?.role)) {
      return !r.status || ['DRAFT', 'PENDING', 'ACTIVE', 'APPROVED'].includes(r.status);
    }
    return false;
  };

  const canDeleteRecord = (r) => {
    if (isAdmin) return true;
    if (isParamedic) {
      return !r.status || ['DRAFT', 'PENDING', 'ACTIVE'].includes(r.status);
    }
    return false;
  };

  const canSubmitRecord = (r) => {
    if (isAdmin) return true;
    if (isParamedic) {
      return !r.status || ['DRAFT', 'PENDING', 'ACTIVE'].includes(r.status);
    }
    return false;
  };

  const fetchPage = (pageNum = 0) => {
    setCurrentPage(pageNum);
    dispatch(fetchEpcrRecords({
      page: pageNum,
      size: PAGE_SIZE,
      status:       statusFilter  || undefined,
      incidentType: typeFilter    || undefined,
      search:       searchTerm    || undefined,
      startDate:    dateFrom      || undefined,
      endDate:      dateTo        || undefined,
    })).unwrap()
      .catch(err => dispatch(addToast({ type: 'error', message: extractErrorMessage(err) })));
  };

  useEffect(() => {
    if (!user?.accessToken) return;
    dispatch(fetchEpcrRecords({ page: 0, size: PAGE_SIZE }));
    dispatch(fetchIncidentTypes());
  }, [dispatch, user?.accessToken]);

  // Re-fetch from backend whenever filters change (debounce search by 400ms)
  useEffect(() => {
    if (!user?.accessToken) return;
    const timer = setTimeout(() => fetchPage(0), searchTerm ? 400 : 0);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, typeFilter, dateFrom, dateTo, user?.accessToken]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTypeFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = !!(searchTerm || statusFilter || typeFilter || dateFrom || dateTo);

  const handleView = async (record) => {
    setModalLoading(true);
    setViewRecord(record);
    setIsViewOpen(true);
    try {
      const res = await client.get(`/api/epcr/records/${record.id}`);
      setViewRecord(res.data);
    } catch (err) {
      dispatch(addToast({ type: 'error', message: extractErrorMessage(err) }));
      setIsViewOpen(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteClick = (record) => setConfirmAction({ type: 'delete', recordId: record.id, message: `Delete record for: ${record.patientName || 'Anonymous'}?` });
  const handleSubmitRecord = (record) => setConfirmAction({
    type: 'submit',
    recordId: record.id,
    patientId: record.patientId || record.patient?.id,
    message: 'Submit this record to QA review?',
  });

  const executeConfirm = async () => {
    const { type, recordId, patientId } = confirmAction;
    setConfirmAction(null);
    try {
      if (type === 'delete') {
        await dispatch(deleteRecord(recordId)).unwrap();
        dispatch(addToast({ type: 'success', message: 'Record deleted' }));
      } else {
        const submitted = await dispatch(submitRecord(recordId)).unwrap();
        const syncedPatientId = patientId || submitted?.patientId || submitted?.patient?.id;
        if (syncedPatientId) await dispatch(fetchAllPatientHistory(syncedPatientId));
        dispatch(addToast({ type: 'success', message: 'Record submitted for QA review' }));
        // Refresh notifications immediately so the QA assignment bell updates
        dispatch(fetchUnreadNotifications());
      }
      fetchPage(currentPage);
      setIsViewOpen(false);
    } catch (err) { dispatch(addToast({ type: 'error', message: extractErrorMessage(err) })); }
  };

  // All filtering is now done server-side — records from Redux are already the filtered page
  const pagedRecords = records;
  const totalFiltered = pagination.totalElements || records.length;
  const totalPages    = pagination.totalPages    || 1;
  const handlePage    = (p) => {
    const next = Math.max(0, Math.min(p, totalPages - 1));
    fetchPage(next);
  };

  return (
    <div className="space-y-5 pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="section-label mb-1">Records</p>
          <h1 className="text-2xl font-black text-[#0F1A3A] tracking-tight">EPCR <span className="text-brand-blue">Registry</span></h1>
          <p className="text-sm text-[#8A97B0] mt-0.5">Electronic Patient Care Records</p>
        </div>
        {['ADMIN', 'PARAMEDIC'].includes(user?.role) && (
          <button onClick={() => navigate('/epcr/new')} className="btn-primary text-sm px-4 py-2.5 shrink-0">
            <Plus size={16} /> New Record
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0AECB]" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search patient, location, ID…"
              className="input pl-9 py-2.5 text-sm w-full"
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input py-2.5 text-sm"
          >
            <option value="">All Statuses</option>
            {['DRAFT','SUBMITTED','QA_PENDING','QA_APPROVED','APPROVED','REJECTED'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
            ))}
          </select>

          {/* Incident Type */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="input py-2.5 text-sm"
          >
            <option value="">All Types</option>
            {incidentTypesOptions.map(t => (
              <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
            ))}
          </select>

          {/* Date range + clear */}
          <div className="flex gap-2 items-center">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input py-2.5 text-sm flex-1 min-w-0" title="From date" />
            <span className="text-[#A0AECB] text-xs font-bold shrink-0">–</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input py-2.5 text-sm flex-1 min-w-0" title="To date" />
            {hasFilters && (
              <button onClick={clearFilters} title="Clear all filters"
                className="p-2 rounded-lg text-[#A0AECB] hover:text-brand-red hover:bg-red-50 transition-colors shrink-0">
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {hasFilters && (
          <p className="text-xs text-[#A0AECB] mt-2.5 font-medium">
            Showing <span className="font-bold text-[#0F1A3A]">{totalFiltered}</span> results
          </p>
        )}
      </div>

      {/* Table Card */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0F4FC]">
          <p className="text-xs font-semibold text-[#A0AECB]">
            {hasFilters
              ? <>{totalFiltered} match{totalFiltered !== 1 ? 'es' : ''} <span className="text-[#C0CADF]">of {pagination.totalElements} records</span></>
              : <>{pagination.totalElements || records.length} record{(pagination.totalElements || records.length) !== 1 ? 's' : ''}</>}
          </p>
          <button onClick={() => fetchPage(currentPage)} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-[#A0AECB] hover:text-brand-blue transition-colors disabled:opacity-40">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Location</th>
                <th>Incident Type</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && records.length === 0 ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan="6" className="py-3 px-5">
                    <div className="h-10 bg-[#F0F4FC] rounded-xl animate-pulse" />
                  </td></tr>
                ))
              ) : pagedRecords.length === 0 ? (
                <tr><td colSpan="6" className="py-16 text-center">
                  <FileText size={36} className="text-[#DDE3F0] mx-auto mb-3" />
                  <p className="text-sm text-[#A0AECB] font-medium">No records found</p>
                </td></tr>
              ) : pagedRecords.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-brand-blue font-black text-sm shrink-0">
                        {(r.patientName || 'A').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[#0F1A3A]">{r.patientName || 'Anonymous'}</p>
                        <p className="text-xs text-[#A0AECB] font-mono">#{r.id?.substring(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-sm text-[#4B5A7A]">
                      <MapPin size={13} className="text-[#A0AECB]" /> {r.incidentLocation || '—'}
                    </div>
                  </td>
                  <td><IncidentTypeBadge type={r.incidentType} /></td>
                  <td className="text-sm text-[#4B5A7A]">
                    {r.incidentDateTime ? new Date(r.incidentDateTime).toLocaleDateString() : '—'}
                  </td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleView(r)}
                        className="p-2 rounded-lg bg-[#F0F4FC] text-brand-blue hover:bg-brand-blue hover:text-white transition-all">
                        <Eye size={15} />
                      </button>
                      {canEditRecord(r) && (
                        <button onClick={() => navigate(`/epcr/new?id=${r.id}`)}
                          className="p-2 rounded-lg bg-[#F0F4FC] text-brand-blue hover:bg-brand-blue hover:text-white transition-all">
                          <FileEdit size={15} />
                        </button>
                      )}
                      {canDeleteRecord(r) && (
                        <button onClick={() => handleDeleteClick(r)}
                          className="p-2 rounded-lg bg-[#FFF0F3] text-brand-red hover:bg-brand-red hover:text-white transition-all">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#F0F4FC]">
            <span className="text-xs text-[#8A97B0]">
              Page <span className="font-bold text-[#0F1A3A]">{currentPage + 1}</span> of{' '}
              <span className="font-bold text-[#0F1A3A]">{totalPages}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => { handlePage(0); }}       disabled={currentPage === 0 || loading} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#DDE3F0] text-[#4B5A7A] hover:bg-[#EEF2FF] hover:border-brand-blue hover:text-brand-blue disabled:opacity-40 transition-all">«</button>
              <button onClick={() => { handlePage(currentPage - 1); }} disabled={currentPage === 0 || loading} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#DDE3F0] text-[#4B5A7A] hover:bg-[#EEF2FF] hover:border-brand-blue hover:text-brand-blue disabled:opacity-40 transition-all">‹ Prev</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let start = Math.max(0, currentPage - 2);
                const end = Math.min(totalPages - 1, start + 4);
                start = Math.max(0, end - 4);
                const pg = start + i;
                if (pg > end) return null;
                return (
                  <button key={pg} onClick={() => handlePage(pg)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      pg === currentPage ? 'bg-brand-blue text-white border-brand-blue' : 'border-[#DDE3F0] text-[#4B5A7A] hover:bg-[#EEF2FF] hover:border-brand-blue hover:text-brand-blue'
                    }`}>{pg + 1}</button>
                );
              })}
              <button onClick={() => { handlePage(currentPage + 1); }} disabled={currentPage >= totalPages - 1 || loading} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#DDE3F0] text-[#4B5A7A] hover:bg-[#EEF2FF] hover:border-brand-blue hover:text-brand-blue disabled:opacity-40 transition-all">Next ›</button>
              <button onClick={() => { handlePage(totalPages - 1); }} disabled={currentPage >= totalPages - 1 || loading} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#DDE3F0] text-[#4B5A7A] hover:bg-[#EEF2FF] hover:border-brand-blue hover:text-brand-blue disabled:opacity-40 transition-all">»</button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {isViewOpen && viewRecord && createPortal(
        <div className="fixed inset-0 bg-[#0F1A3A]/60 backdrop-blur-sm z-[9999] flex items-start justify-center p-4 pt-12 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-[#DDE3F0] my-4">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-[#F0F4FC]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-brand-blue text-lg font-black">
                  {(viewRecord.patientName || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-black text-[#0F1A3A] text-xl">{viewRecord.patientName || 'Anonymous'}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StatusBadge status={viewRecord.status} />
                    <span className="text-xs text-[#A0AECB] font-mono">#{viewRecord.id}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canSubmitRecord(viewRecord) && (
                  <button onClick={() => handleSubmitRecord(viewRecord)} className="btn-danger text-sm px-4 py-2">
                    <Send size={15} /> Submit to QA
                  </button>
                )}
                <button onClick={() => setIsViewOpen(false)}
                  className="p-2 rounded-xl text-[#8A97B0] hover:bg-[#F0F4FC] hover:text-brand-red transition-all">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-6 overflow-y-auto max-h-[75vh] bg-[#F8FAFC]">
              {modalLoading ? (
                <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="animate-spin text-brand-blue w-8 h-8" />
                  <p className="text-xs font-black uppercase tracking-wider text-[#A0AECB] animate-pulse">Decrypting Secure Health Record...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Subject Information */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3F0]">
                  <SectionHeader icon={User} title="Subject Information" color="text-brand-blue" />
                  <div className="grid grid-cols-2 gap-4">
                    <DetailRow label="Name" value={viewRecord.patientName} />
                    <DetailRow label="DOB" value={viewRecord.patientDateOfBirth} />
                    <DetailRow label="Gender" value={viewRecord.patientGender} />
                    <DetailRow label="Age" value={viewRecord.age} />
                    <DetailRow label="Phone" value={viewRecord.patientPhone} />
                    <DetailRow label="Email" value={viewRecord.email} />
                    <DetailRow label="SSN (Last 4)" value={viewRecord.patientSSNLast4} />
                    <DetailRow label="Blood Group" value={viewRecord.bloodGroup} />
                    <DetailRow label="Height" value={viewRecord.height ? `${viewRecord.height} cm` : ''} />
                    <DetailRow label="Weight" value={viewRecord.weight ? `${viewRecord.weight} kg` : ''} />
                    <DetailRow label="Address" value={viewRecord.patientAddress} colSpan={2} />
                  </div>

                  <div className="mt-6">
                    <SectionHeader icon={Heart} title="Medical History" color="text-brand-red" />
                    <div className="grid grid-cols-2 gap-4">
                      <DetailRow label="Allergies" value={viewRecord.allergy || viewRecord.medicalHistory?.allergies?.join(', ')} colSpan={2} />
                      <DetailRow label="Comorbidities" value={viewRecord.comorbidity || viewRecord.medicalHistory?.pastConditions?.join(', ')} colSpan={2} />
                      <DetailRow label="Current Meds" value={viewRecord.currentMedicines || viewRecord.medicalHistory?.currentMedications?.join(', ')} colSpan={2} />
                      <DetailRow label="Surgical History" value={viewRecord.medicalHistory?.surgicalHistory?.join(', ')} colSpan={2} />
                      <DetailRow label="Physician" value={viewRecord.doctor || viewRecord.medicalHistory?.primaryPhysicianName} />
                      <DetailRow label="Physician Contact" value={viewRecord.medicalHistory?.primaryPhysicianContact} />
                      <DetailRow label="Advance Directive" value={viewRecord.medicalHistory?.advanceDirective ? `YES - ${viewRecord.medicalHistory?.advanceDirectiveType}` : 'NO'} />
                      <DetailRow label="DNR On File" value={viewRecord.medicalHistory?.dnrOnFile ? 'YES' : 'NO'} />
                      <DetailRow label="Smoker" value={viewRecord.medicalHistory?.smoker ? 'YES' : 'NO'} />
                      <DetailRow label="Alcohol Use" value={viewRecord.medicalHistory?.alcoholUse ? 'YES' : 'NO'} />
                      <DetailRow label="Substance Use" value={viewRecord.medicalHistory?.substanceUse ? `YES - ${viewRecord.medicalHistory?.substanceUseDetails}` : 'NO'} colSpan={2} />
                      {viewRecord.patientGender === 'FEMALE' && (
                        <>
                          <DetailRow label="Pregnant" value={viewRecord.medicalHistory?.pregnant ? 'YES' : 'NO'} />
                          <DetailRow label="Gestational Wk" value={viewRecord.medicalHistory?.gestationalWeekIfPregnant} />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Incident & Scene */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3F0]">
                  <SectionHeader icon={AlertTriangle} title="Incident & Scene" color="text-amber-500" />
                  <div className="grid grid-cols-2 gap-4">
                    <DetailRow label="Incident No." value={viewRecord.incidentNumber} />
                    <DetailRow label="Date/Time" value={viewRecord.incidentDateTime ? new Date(viewRecord.incidentDateTime).toLocaleString() : ''} />
                    <DetailRow label="Type" value={viewRecord.incidentType} />
                    <DetailRow label="Location" value={viewRecord.incidentLocation} />
                    <DetailRow label="Description" value={viewRecord.incidentDescription} colSpan={2} />
                  </div>

                  {viewRecord.sceneAssessment && (
                    <div className="mt-6">
                      <SectionHeader icon={Activity} title="Scene Assessment" color="text-amber-600" />
                      <div className="grid grid-cols-2 gap-4">
                        <DetailRow label="Scene Type" value={viewRecord.sceneAssessment.sceneType} />
                        <DetailRow label="Triage Tag" value={viewRecord.sceneAssessment.triageTag} />
                        <DetailRow label="Patients Count" value={viewRecord.sceneAssessment.numberOfPatients} />
                        <DetailRow label="Mass Casualty" value={viewRecord.sceneAssessment.massCasualtyIncident ? 'YES' : 'NO'} />
                        <DetailRow label="Trauma Call" value={viewRecord.sceneAssessment.traumaCall ? 'YES' : 'NO'} />
                        <DetailRow label="Scene Safe" value={viewRecord.sceneAssessment.sceneSafe ? 'YES' : 'NO'} />
                        <DetailRow label="Weather" value={viewRecord.sceneAssessment.weatherConditions} />
                        <DetailRow label="Lighting" value={viewRecord.sceneAssessment.lightingConditions} />
                        <DetailRow label="Access Difficulty" value={viewRecord.sceneAssessment.patientAccessDifficulty} />
                        <DetailRow label="Bystander CPR" value={viewRecord.sceneAssessment.bystanderCPRPerformed ? 'YES' : 'NO'} />
                        <DetailRow label="AED Used" value={viewRecord.sceneAssessment.aedUsedByBystander ? 'YES' : 'NO'} />
                        <DetailRow label="Mech. of Injury" value={viewRecord.sceneAssessment.mechanismOfInjury} colSpan={2} />
                        <DetailRow label="Injury Location" value={viewRecord.sceneAssessment.injuryLocation} colSpan={2} />
                        <DetailRow label="Hazards" value={viewRecord.sceneAssessment.sceneHazards} colSpan={2} />
                        <DetailRow label="Witness Present" value={viewRecord.sceneAssessment.witnessPresent ? `YES - ${viewRecord.sceneAssessment.witnessName}` : 'NO'} colSpan={2} />
                        {viewRecord.sceneAssessment.witnessPresent && (
                          <DetailRow label="Witness Contact" value={viewRecord.sceneAssessment.witnessContact} colSpan={2} />
                        )}
                        {viewRecord.sceneAssessment.geoLocation && (
                          <div className="col-span-2 grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <p className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-wider">Scene Geo-coordinates</p>
                            <DetailRow label="Latitude" value={viewRecord.sceneAssessment.geoLocation.latitude} />
                            <DetailRow label="Longitude" value={viewRecord.sceneAssessment.geoLocation.longitude} />
                            <DetailRow label="Altitude" value={viewRecord.sceneAssessment.geoLocation.altitude ? `${viewRecord.sceneAssessment.geoLocation.altitude} m` : ''} />
                            <DetailRow label="Geohash" value={viewRecord.sceneAssessment.geoLocation.geohash} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {viewRecord.timeline && (
                    <div className="mt-6">
                      <SectionHeader icon={Clock} title="Timeline" color="text-slate-500" />
                      <div className="grid grid-cols-2 gap-4">
                        <DetailRow label="Call Received" value={viewRecord.timeline.callReceivedAt ? new Date(viewRecord.timeline.callReceivedAt).toLocaleTimeString() : ''} />
                        <DetailRow label="Dispatched" value={viewRecord.timeline.dispatchedAt ? new Date(viewRecord.timeline.dispatchedAt).toLocaleTimeString() : ''} />
                        <DetailRow label="En Route" value={viewRecord.timeline.enRouteAt ? new Date(viewRecord.timeline.enRouteAt).toLocaleTimeString() : ''} />
                        <DetailRow label="Arrived Scene" value={viewRecord.timeline.arrivedSceneAt ? new Date(viewRecord.timeline.arrivedSceneAt).toLocaleTimeString() : ''} />
                        <DetailRow label="Patient Contact" value={viewRecord.timeline.patientContactAt ? new Date(viewRecord.timeline.patientContactAt).toLocaleTimeString() : ''} />
                        <DetailRow label="Departed Scene" value={viewRecord.timeline.departedSceneAt ? new Date(viewRecord.timeline.departedSceneAt).toLocaleTimeString() : ''} />
                        <DetailRow label="Arrived Dest." value={viewRecord.timeline.arrivedDestinationAt ? new Date(viewRecord.timeline.arrivedDestinationAt).toLocaleTimeString() : ''} />
                        <DetailRow label="Transfer of Care" value={viewRecord.timeline.transferOfCareAt ? new Date(viewRecord.timeline.transferOfCareAt).toLocaleTimeString() : ''} />
                        <DetailRow label="Unit Available" value={viewRecord.timeline.unitAvailableAt ? new Date(viewRecord.timeline.unitAvailableAt).toLocaleTimeString() : ''} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Clinical Assessment */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3F0]">
                  <SectionHeader icon={Heart} title="Clinical & Vitals" color="text-emerald-600" />
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <DetailRow label="BP" value={viewRecord.systolicBp && viewRecord.diastolicBp ? `${viewRecord.systolicBp}/${viewRecord.diastolicBp}` : ''} />
                    <DetailRow label="Heart Rate" value={viewRecord.heartRate || viewRecord.pulseRate} />
                    <DetailRow label="Resp. Rate" value={viewRecord.respirationRate} />
                    <DetailRow label="SpO2" value={viewRecord.spo2 ? `${viewRecord.spo2}%` : ''} />
                    <DetailRow label="Temp" value={viewRecord.temperature ? `${viewRecord.temperature}°C` : ''} />
                    <DetailRow label="Blood Sugar" value={viewRecord.bloodSugar} />
                    <DetailRow label="GCS" value={viewRecord.glasgowComaScale} />
                    <DetailRow label="Hemoglobin" value={viewRecord.hemoglobin} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <DetailRow label="Primary Impression" value={viewRecord.primaryImpression} colSpan={2} />
                    <DetailRow label="Secondary Imp." value={viewRecord.secondaryImpression} colSpan={2} />
                    <DetailRow label="Diagnosis" value={viewRecord.diagnosis} colSpan={2} />
                    <DetailRow label="ICD-10 Code" value={viewRecord.icd10Code} />
                    <DetailRow label="Treatment" value={viewRecord.treatmentProvided} colSpan={2} />
                    <DetailRow label="Treatment Plan" value={viewRecord.treatmentPlan} colSpan={2} />
                  </div>

                  {(viewRecord.complaints?.length > 0 || viewRecord.vitals?.length > 0 || viewRecord.medicationsAdministered?.length > 0 || viewRecord.proceduresPerformed?.length > 0) && (
                    <div className="mt-6 pt-4 border-t border-slate-100 space-y-4">
                      {viewRecord.complaints?.length > 0 && <DetailRow label="Complaints Logs" value={viewRecord.complaints.join(', ')} colSpan={2} />}
                      {viewRecord.vitals?.length > 0 && <DetailRow label="Vitals Logs" value={viewRecord.vitals.join(', ')} colSpan={2} />}
                      {viewRecord.medicationsAdministered?.length > 0 && <DetailRow label="Meds Administered" value={viewRecord.medicationsAdministered.join(', ')} colSpan={2} />}
                      {viewRecord.proceduresPerformed?.length > 0 && <DetailRow label="Procedures" value={viewRecord.proceduresPerformed.join(', ')} colSpan={2} />}
                    </div>
                  )}
                </div>

                {/* Disposition & Transport */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3F0]">
                  <SectionHeader icon={Truck} title="Disposition & Transport" color="text-indigo-500" />
                  <div className="grid grid-cols-2 gap-4">
                    <DetailRow label="Destination" value={viewRecord.transportDestination || viewRecord.transport?.destinationName} colSpan={2} />
                    <DetailRow label="Facility ID" value={viewRecord.transport?.destinationFacilityId} />
                    <DetailRow label="Facility Address" value={viewRecord.transport?.destinationAddress} colSpan={2} />
                    <DetailRow label="Facility Type" value={viewRecord.transport?.destinationType} />
                    <DetailRow label="Mode" value={viewRecord.transportMode || viewRecord.transport?.transportMode} />
                    <DetailRow label="Care Level" value={viewRecord.careLevel || viewRecord.transport?.careLevel} />
                    <DetailRow label="Transport Reason" value={viewRecord.transport?.transportReason} colSpan={2} />
                    {viewRecord.transport?.refusalOfTransportReason && (
                      <DetailRow label="Refusal Reason" value={viewRecord.transport.refusalOfTransportReason} colSpan={2} />
                    )}
                    <DetailRow label="Receiving Physician" value={viewRecord.transport?.receivingPhysicianName} />
                    <DetailRow label="Receiving Nurse" value={viewRecord.transport?.receivingNurseName} />
                    <DetailRow label="Condition Depart" value={viewRecord.transport?.patientConditionOnDeparture} />
                    <DetailRow label="Condition Arrive" value={viewRecord.transport?.patientConditionOnArrival} />
                    <DetailRow label="Hospital Notified" value={viewRecord.transport?.hospitalNotified ? `YES - ${viewRecord.transport?.hospitalNotifiedAt ? new Date(viewRecord.transport.hospitalNotifiedAt).toLocaleTimeString() : ''}` : 'NO'} />
                    <DetailRow label="Continued CPR" value={viewRecord.transport?.continuedCPRDuringTransport ? 'YES' : 'NO'} />
                    <DetailRow label="AED Used Transport" value={viewRecord.transport?.aedUsedDuringTransport ? 'YES' : 'NO'} />
                    {viewRecord.transport?.destinationGeoLocation && (
                      <div className="col-span-2 grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <p className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-wider">Destination Geo-coordinates</p>
                        <DetailRow label="Latitude" value={viewRecord.transport.destinationGeoLocation.latitude} />
                        <DetailRow label="Longitude" value={viewRecord.transport.destinationGeoLocation.longitude} />
                        <DetailRow label="Altitude" value={viewRecord.transport.destinationGeoLocation.altitude ? `${viewRecord.transport.destinationGeoLocation.altitude} m` : ''} />
                        <DetailRow label="Geohash" value={viewRecord.transport.destinationGeoLocation.geohash} />
                      </div>
                    )}
                    <DetailRow label="Handoff Report" value={viewRecord.transport?.handoffReport} colSpan={2} />
                    <DetailRow label="Paramedic" value={viewRecord.paramedicsName} />
                    <DetailRow label="Organization" value={viewRecord.organizationName} />
                  </div>

                  {viewRecord.consent && (
                    <div className="mt-6">
                      <SectionHeader icon={Shield} title="Consent & Refusals" color="text-slate-600" />
                      <div className="grid grid-cols-2 gap-4">
                        <DetailRow label="Consent Obtained" value={viewRecord.consent.patientConsentObtained ? 'YES' : 'NO'} />
                        <DetailRow label="Consent Type" value={viewRecord.consent.consentType} />
                        <DetailRow label="Decision Capacity" value={viewRecord.consent.patientHasDecisionCapacity ? 'YES' : 'NO'} />
                        <DetailRow label="Informed of Risks" value={viewRecord.consent.patientInformedOfRisks ? 'YES' : 'NO'} />
                        {viewRecord.consent.refusalOfCare && (
                          <>
                            <DetailRow label="Refused Care" value="YES" />
                            <DetailRow label="Refusal Reason" value={viewRecord.consent.refusalReason} colSpan={2} />
                            {viewRecord.consent.refusalWitnessed && (
                              <>
                                <DetailRow label="Refusal Witnessed" value="YES" />
                                <DetailRow label="Witness Name" value={viewRecord.consent.witnessName} />
                                <DetailRow label="Witness Contact" value={viewRecord.consent.witnessContact} colSpan={2} />
                              </>
                            )}
                          </>
                        )}
                        {viewRecord.consent.capacityAssessmentNotes && (
                          <DetailRow label="Capacity Notes" value={viewRecord.consent.capacityAssessmentNotes} colSpan={2} />
                        )}
                        <DetailRow label="Guardian Consent" value={viewRecord.consent.guardianConsentObtained ? 'YES' : 'NO'} />
                        {viewRecord.consent.guardianConsentObtained && (
                          <>
                            <DetailRow label="Guardian Name" value={viewRecord.consent.guardianName} />
                            <DetailRow label="Relationship" value={viewRecord.consent.guardianRelationship} />
                            <DetailRow label="Guardian Phone" value={viewRecord.consent.guardianPhone} colSpan={2} />
                          </>
                        )}
                        {(viewRecord.consent.patientSignatureAttachmentId || viewRecord.consent.guardianSignatureAttachmentId || viewRecord.consent.crewSignatureAttachmentId) && (
                          <div className="col-span-2 pt-2 border-t border-slate-100 grid grid-cols-3 gap-2">
                            <DetailRow label="Patient Sig ID" value={viewRecord.consent.patientSignatureAttachmentId} />
                            <DetailRow label="Guardian Sig ID" value={viewRecord.consent.guardianSignatureAttachmentId} />
                            <DetailRow label="Crew Sig ID" value={viewRecord.consent.crewSignatureAttachmentId} />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Structured Lists Section */}
                {((viewRecord.crew && viewRecord.crew.length > 0) ||
                  (viewRecord.structuredComplaints && viewRecord.structuredComplaints.length > 0) ||
                  (viewRecord.structuredVitals && viewRecord.structuredVitals.length > 0) ||
                  (viewRecord.structuredMedications && viewRecord.structuredMedications.length > 0) ||
                  (viewRecord.structuredProcedures && viewRecord.structuredProcedures.length > 0)) && (
                  <div className="col-span-1 lg:col-span-2 border-t border-[#DDE3F0] pt-6 space-y-8">
                    
                    {/* Incident Crew */}
                    {viewRecord.crew && viewRecord.crew.length > 0 && (
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3F0]">
                        <SectionHeader icon={User} title="Incident Crew Members" color="text-brand-blue" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {viewRecord.crew.map((c, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative shadow-sm">
                              <p className="font-bold text-[#0F1A3A] text-sm">{c.name}</p>
                              <p className="text-xs font-semibold text-brand-blue mt-1 uppercase tracking-wider">{c.role} | {c.certificationLevel}</p>
                              <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs text-[#4B5A7A] font-medium">
                                <div>Cert #: {c.certificationNumber || '—'}</div>
                                <div>Expires: {c.certificationExpiryDate || '—'}</div>
                              </div>
                              {c.primaryClinician && (
                                <span className="mt-2.5 inline-block text-[9px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded uppercase tracking-wider">Primary Clinician</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Structured Complaints */}
                    {viewRecord.structuredComplaints && viewRecord.structuredComplaints.length > 0 && (
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3F0]">
                        <SectionHeader icon={Activity} title="Structured Complaints Details" color="text-amber-500" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {viewRecord.structuredComplaints.map((c, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                              <p className="font-bold text-[#0F1A3A] text-sm">{c.complaint} {c.traumaRelated && <span className="text-[9px] bg-brand-red/10 text-brand-red font-black px-1.5 py-0.5 rounded ml-1 uppercase">TRAUMA</span>}</p>
                              <p className="text-xs font-medium text-[#4B5A7A] mt-1">Onset: {c.onset} | Severity: <span className="font-bold text-brand-blue">{c.severity}/10</span></p>
                              <div className="mt-2.5 pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs text-[#4B5A7A] font-medium">
                                {c.provocation && <div>Provoked by: {c.provocation}</div>}
                                {c.quality && <div>Quality: {c.quality}</div>}
                                {c.radiation && <div>Radiation: {c.radiation}</div>}
                                {c.timing && <div>Timing: {c.timing}</div>}
                                {c.associatedSymptoms && <div className="col-span-2">Symptoms: {c.associatedSymptoms}</div>}
                                {c.onsetTime && <div className="col-span-2">Onset Time: {new Date(c.onsetTime).toLocaleString()}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Structured Vitals Log */}
                    {viewRecord.structuredVitals && viewRecord.structuredVitals.length > 0 && (
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3F0]">
                        <SectionHeader icon={Heart} title="Structured Vitals History Logs" color="text-emerald-600" />
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                          {viewRecord.structuredVitals.map((c, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                              <p className="font-bold text-[#A0AECB] text-[10px] uppercase tracking-wider">Log #{idx+1} | {new Date(c.recordedAt).toLocaleString()}</p>
                              <div className="mt-2 grid grid-cols-3 md:grid-cols-6 gap-3 text-xs font-semibold text-[#0F1A3A]">
                                {c.systolicBP && c.diastolicBP && <div>BP: <span className="text-brand-blue">{c.systolicBP}/{c.diastolicBP}</span></div>}
                                {c.heartRate && <div>HR: <span className="text-brand-blue">{c.heartRate} bpm</span></div>}
                                {c.respiratoryRate && <div>RR: <span className="text-brand-blue">{c.respiratoryRate}/min</span></div>}
                                {c.oxygenSaturation && <div>SpO2: <span className="text-emerald-600">{c.oxygenSaturation}%</span></div>}
                                {c.temperature && <div>Temp: <span className="text-brand-blue">{c.temperature}°C ({c.temperatureRoute})</span></div>}
                                {c.bloodGlucose && <div>Glucose: <span className="text-brand-blue">{c.bloodGlucose} mg/dL</span></div>}
                              </div>
                              <div className="mt-3 pt-2 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] text-[#4B5A7A] font-medium">
                                {c.glasgowComaScale && <div>GCS: <span className="font-bold text-brand-blue">{c.glasgowComaScale}</span> (E{c.gcEye} V{c.gcVerbal} M{c.gcMotor})</div>}
                                {c.avpu && <div>AVPU: <span className="font-bold">{c.avpu}</span></div>}
                                {c.painScore !== null && c.painScore !== undefined && <div>Pain: <span className="font-bold text-brand-red">{c.painScore}/10</span> {c.painLocation ? `(${c.painLocation})` : ''}</div>}
                                {c.skinColor && <div>Skin: {c.skinColor}, {c.skinCondition}, {c.skinTemperature}</div>}
                                {(c.pupilLeft || c.pupilRight) && <div>Pupils: L{c.pupilLeft} R{c.pupilRight} {c.pupilsEqual ? '(Equal' : '(Unequal'} {c.pupilsReactive ? 'Reactive)' : 'Nonreactive)'}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Structured Medications */}
                    {viewRecord.structuredMedications && viewRecord.structuredMedications.length > 0 && (
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3F0]">
                        <SectionHeader icon={Heart} title="Structured Medications Administered" color="text-indigo-500" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {viewRecord.structuredMedications.map((c, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                              <p className="font-bold text-[#0F1A3A] text-sm">{c.medicationName} {c.brandName ? `(${c.brandName})` : ''}</p>
                              <p className="text-xs font-semibold text-brand-blue mt-1 uppercase tracking-wider">{c.dosage} {c.unit} via {c.route}</p>
                              <div className="mt-2.5 pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs text-[#4B5A7A] font-medium">
                                {c.administeredAt && <div>Time: {new Date(c.administeredAt).toLocaleTimeString()}</div>}
                                {c.administeredBy && <div>By: {c.administeredBy}</div>}
                                <div>Attempts: {c.administrationAttempts}</div>
                                {c.patientResponse && <div>Response: {c.patientResponse}</div>}
                                {c.indication && <div className="col-span-2">Indication: {c.indication}</div>}
                                {c.adverseReactionDetails && <div className="col-span-2">Adverse: {c.adverseReactionDetails}</div>}
                                {c.notes && <div className="col-span-2 text-slate-400 italic">Notes: {c.notes}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Structured Procedures */}
                    {viewRecord.structuredProcedures && viewRecord.structuredProcedures.length > 0 && (
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#DDE3F0]">
                        <SectionHeader icon={Activity} title="Structured Procedures Performed" color="text-indigo-600" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {viewRecord.structuredProcedures.map((c, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                              <p className="font-bold text-[#0F1A3A] text-sm">{c.procedureName} {c.successful ? <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded ml-1 uppercase">SUCCESSFUL</span> : <span className="text-[9px] bg-brand-red/10 text-brand-red font-black px-1.5 py-0.5 rounded ml-1 uppercase">FAILED</span>}</p>
                              <p className="text-xs font-semibold text-brand-blue mt-1 uppercase tracking-wider">{c.bodysite ? `Site: ${c.bodysite}` : 'Site: Unspecified'} | Attempts: {c.attempts}</p>
                              <div className="mt-2.5 pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs text-[#4B5A7A] font-medium">
                                {c.performedAt && <div>Time: {new Date(c.performedAt).toLocaleTimeString()}</div>}
                                {c.performedBy && <div>By: {c.performedBy}</div>}
                                {c.patientResponse && <div>Response: {c.patientResponse}</div>}
                                {c.snomedCode && <div>SNOMED: {c.snomedCode}</div>}
                                {c.complications && <div className="col-span-2">Complications: {c.complications}</div>}
                                {c.notes && <div className="col-span-2 text-slate-400 italic">Notes: {c.notes}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
                </div>
              )}
            </div>

            {/* AI Suggestion Panel — shown for all roles, generate restricted to PHYSICIAN/ADMIN/MANAGER */}
            {!modalLoading && viewRecord.id && (
              <div className="px-6 pb-5">
                <AiSuggestionPanel
                  recordId={viewRecord.id}
                  userRole={user?.role}
                />
              </div>
            )}

            <div className="p-5 border-t border-[#F0F4FC] flex justify-end">
              <button onClick={() => setIsViewOpen(false)} className="btn-primary text-sm px-6 py-2.5">Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Modal */}
      {confirmAction && createPortal(
        <div className="fixed inset-0 bg-[#0F1A3A]/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-[#DDE3F0] p-6 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-brand-red" />
            </div>
            <h3 className="font-black text-[#0F1A3A] text-lg mb-2">Confirm Action</h3>
            <p className="text-sm text-[#8A97B0] mb-6">{confirmAction.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="btn-ghost flex-1 justify-center border border-[#DDE3F0] rounded-xl py-2.5">Cancel</button>
              <button onClick={executeConfirm} className="btn-danger flex-1 justify-center py-2.5 text-sm">Confirm</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default RecordsList;
