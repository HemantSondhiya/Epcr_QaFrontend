import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Plus, Filter, Search, FileEdit, Trash2, Eye, RefreshCw, X,
  Send, AlertCircle, Clock, MapPin, FileText, Activity, User, Heart, Truck, Shield, AlertTriangle
} from 'lucide-react';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import {
  fetchRecords as fetchEpcrRecords, updateRecord, deleteRecord,
  submitRecord, selectRecords, selectEpcrLoading, selectEpcrError
} from '../store/slices/epcrSlice';
import { fetchAllPatientHistory } from '../store/slices/patientHistorySlice';
import { extractErrorMessage } from '../api/client';

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

const RecordsList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const records = useSelector(selectRecords);
  const loading = useSelector(selectEpcrLoading);

  const [searchTerm, setSearchTerm] = useState('');
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ status: '', startDate: '', endDate: '', sortBy: 'incidentDateTime', direction: 'DESC' });

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
      return !r.status || ['DRAFT', 'PENDING', 'ACTIVE', 'APPROVED'].includes(r.status);
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

  const fetchRecords = (pageNum = 0, isAppend = false) => {
    dispatch(fetchEpcrRecords({ page: pageNum, size: 20, isAppend, filters: { ...filters, search: searchTerm }, paramedicId: isParamedic ? (user?.userId || user?.id) : null }))
      .unwrap()
      .catch(err => dispatch(addToast({ type: 'error', message: extractErrorMessage(err) })));
  };

  useEffect(() => { 
    dispatch(fetchEpcrRecords({ page: 0, size: 20, filters: { ...filters, search: searchTerm }, paramedicId: isParamedic ? (user?.userId || user?.id) : null }))
      .unwrap()
      .catch(err => dispatch(addToast({ type: 'error', message: `Failed to load records: ${extractErrorMessage(err)}` })));
  }, [dispatch]);

  const handleView = (record) => { setViewRecord(record); setIsViewOpen(true); };

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
        dispatch(addToast({ type: 'success', message: 'Record submitted for QA' }));
      }
      fetchRecords(0, false);
      setIsViewOpen(false);
    } catch (err) { dispatch(addToast({ type: 'error', message: extractErrorMessage(err) })); }
  };

  const filtered = records.filter(r =>
    !searchTerm ||
    r.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.incidentLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="section-label mb-1">Records</p>
          <h1 className="text-2xl font-black text-[#0F1A3A] tracking-tight">EPCR <span className="text-brand-blue">Registry</span></h1>
          <p className="text-sm text-[#8A97B0] mt-0.5">Electronic Patient Care Records</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsFilterOpen(o => !o)}
            className={`btn-ghost border rounded-xl px-3 py-2.5 ${isFilterOpen ? 'border-brand-blue text-brand-blue bg-[#EEF2FF]' : 'border-[#DDE3F0]'}`}>
            <Filter size={16} /> Filters
          </button>
          {['ADMIN', 'PARAMEDIC'].includes(user?.role) && (
            <button onClick={() => navigate('/epcr/new')} className="btn-primary text-sm px-4 py-2.5">
              <Plus size={16} /> New Record
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {isFilterOpen && (
        <div className="card p-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">Status</label>
              <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="input py-2.5 text-sm">
                <option value="">All Statuses</option>
                {['DRAFT', 'SUBMITTED', 'QA_PENDING', 'QA_APPROVED'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">Date From</label>
              <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="input py-2.5 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">Date To</label>
              <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="input py-2.5 text-sm" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={() => fetchRecords(0, false)} className="btn-primary flex-1 justify-center py-2.5 text-sm">Apply</button>
              <button onClick={() => { setFilters({ status: '', startDate: '', endDate: '', sortBy: 'incidentDateTime', direction: 'DESC' }); setSearchTerm(''); fetchRecords(0, false); }}
                className="btn-ghost border border-[#DDE3F0] rounded-xl p-2.5">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="card overflow-hidden">
        {/* Search */}
        <div className="flex items-center gap-3 p-5 border-b border-[#F0F4FC]">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0AECB]" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by patient, location, or ID…" className="input pl-10 py-2.5 text-sm" />
          </div>
          <span className="text-xs text-[#A0AECB] font-semibold sm:ml-auto">{filtered.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Location</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && records.length === 0 ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}><td colSpan="5" className="py-3 px-5">
                    <div className="h-10 bg-[#F0F4FC] rounded-xl animate-pulse" />
                  </td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className="py-16 text-center">
                  <FileText size={36} className="text-[#DDE3F0] mx-auto mb-3" />
                  <p className="text-sm text-[#A0AECB] font-medium">No records found</p>
                </td></tr>
              ) : filtered.map(r => (
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
                        <DetailRow label="Mech. of Injury" value={viewRecord.sceneAssessment.mechanismOfInjury} colSpan={2} />
                        <DetailRow label="Injury Location" value={viewRecord.sceneAssessment.injuryLocation} colSpan={2} />
                        <DetailRow label="Hazards" value={viewRecord.sceneAssessment.sceneHazards} colSpan={2} />
                        <DetailRow label="Witness Present" value={viewRecord.sceneAssessment.witnessPresent ? `YES - ${viewRecord.sceneAssessment.witnessName}` : 'NO'} colSpan={2} />
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
                    <DetailRow label="Mode" value={viewRecord.transportMode || viewRecord.transport?.transportMode} />
                    <DetailRow label="Care Level" value={viewRecord.careLevel || viewRecord.transport?.careLevel} />
                    <DetailRow label="Transport Reason" value={viewRecord.transport?.transportReason} colSpan={2} />
                    <DetailRow label="Condition Depart" value={viewRecord.transport?.patientConditionOnDeparture} />
                    <DetailRow label="Condition Arrive" value={viewRecord.transport?.patientConditionOnArrival} />
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
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

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
