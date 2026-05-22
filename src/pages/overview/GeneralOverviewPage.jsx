import { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchAllPatientHistory,
  clearHistory,
  selectHistorySummary,
  selectVitals,
  selectMedications,
  selectConditions,
  selectLabResults,
  selectDocuments,
  selectEncounters,
  selectTimeline,
} from '../../store/slices/patientHistorySlice';
import { addToast } from '../../store/slices/uiSlice';
import client from '../../api/client';
import {
  Activity, Check, FileText, FlaskConical, HeartPulse, Pill,
  Stethoscope, Thermometer, ExternalLink, ChevronRight,
  Clock, Loader2, User, ChevronDown, Plus, RefreshCw, Eye, Edit3, Trash2, ShieldAlert, X,
  Search, FileCheck, Grid3x3, List, Download, Printer, Maximize2, Minimize2, FileDigit, Microscope
} from 'lucide-react';

/* ─── Dentist-style clinical helpers ─── */
const getId = (item) => item?.id || item?.conditionId || item?.medicationId || item?.encounterId || item?.labResultId || item?.documentId;
const getConditionLinkId = (item) => {
  const value = item?.conditionId || item?.relatedConditionId || item?.condition?.id || item?.condition?.conditionId;
  if (value && typeof value === 'object') return value.id || value.conditionId || value._id || '';
  return value || '';
};
const sameId = (a, b) => String(a || '') === String(b || '');
const timelineKey = (item, index) => [
  item?.eventType || item?.type || 'event',
  item?.sourceId || getId(item) || item?.title || 'unknown',
  item?.date || item?.eventDate || item?.timestamp || 'no-date',
  index,
].join(':');

const text = (value, fallback = 'Not recorded') => (value === 0 || value ? String(value) : fallback);
const fmtDate = (value) => value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not recorded';

const statusClass = (status) => {
  const key = String(status || '').toUpperCase();
  if (['ACTIVE', 'ABNORMAL', 'OPEN', 'ONGOING'].includes(key)) return 'bg-red-50 text-red-700 border-red-100';
  if (['RESOLVED', 'NORMAL', 'STOPPED', 'COMPLETED'].includes(key)) return 'bg-green-50 text-green-700 border-green-100';
  if (['CHRONIC', 'MODERATE'].includes(key)) return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-[#E8EEF8] text-[#1A3C8F] border-[#DDE3F0]';
};

const EVENT_TYPE_STYLES = {
  CONDITION_DIAGNOSED: { icon: HeartPulse, color: '#C8102E', bg: '#FEE2E2', label: 'Condition Diagnosed' },
  CONDITION_RESOLVED: { icon: Check, color: '#059669', bg: '#D1FAE5', label: 'Condition Resolved' },
  MEDICATION_STARTED: { icon: Pill, color: '#7C3AED', bg: '#F3E8FF', label: 'Medication Started' },
  MEDICATION_STOPPED: { icon: Pill, color: '#6B7280', bg: '#F3F4F6', label: 'Medication Stopped' },
  EPCR_ENCOUNTER: { icon: Stethoscope, color: '#EA580C', bg: '#FFEDD5', label: 'ePCR Encounter' },
  HOSPITAL_ADMISSION: { icon: Activity, color: '#0891B2', bg: '#CFFAFE', label: 'Hospital Admission' },
  LAB_RESULT: { icon: FlaskConical, color: '#1A3C8F', bg: '#DBEAFE', label: 'Lab Result' },
  DOCUMENT: { icon: FileText, color: '#475569', bg: '#E2E8F0', label: 'Document' },
};
const DEFAULT_EVENT_STYLE = { icon: Activity, color: '#4B5A7A', bg: '#E8EEF8', label: 'Event' };

const getEventStyle = (eventType) => {
  const key = String(eventType || '').toUpperCase().replace(/[\s-]+/g, '_');
  return EVENT_TYPE_STYLES[key] || DEFAULT_EVENT_STYLE;
};

const relativeTime = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 0) return 'Upcoming';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};

const assessVitalStatus = (v) => {
  const crit = [
    v.systolicBP != null && (v.systolicBP > 180 || v.systolicBP < 80),
    v.diastolicBP != null && (v.diastolicBP > 120 || v.diastolicBP < 50),
    v.heartRate != null && (v.heartRate > 150 || v.heartRate < 40),
    v.oxygenSaturation != null && v.oxygenSaturation < 88,
    v.respiratoryRate != null && (v.respiratoryRate > 30 || v.respiratoryRate < 8),
    v.temperature != null && (v.temperature > 39.5 || v.temperature < 35),
  ];
  if (crit.some(Boolean)) return { label: 'Critical', cls: 'bg-red-100 text-red-700 border-red-200' };
  const warn = [
    v.systolicBP != null && (v.systolicBP > 140 || v.systolicBP < 90),
    v.diastolicBP != null && (v.diastolicBP > 90 || v.diastolicBP < 60),
    v.heartRate != null && (v.heartRate > 100 || v.heartRate < 60),
    v.oxygenSaturation != null && v.oxygenSaturation < 95,
    v.respiratoryRate != null && (v.respiratoryRate > 20 || v.respiratoryRate < 12),
    v.temperature != null && (v.temperature > 37.2 || v.temperature < 36.1),
  ];
  if (warn.some(Boolean)) return { label: 'Monitor', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { label: 'Normal', cls: 'bg-green-100 text-green-700 border-green-200' };
};

const viewSecureDocument = async (dispatch, patientId, documentId) => {
  if (!documentId || !patientId) return;
  try {
    const res = await client.get(`/api/patients/${patientId}/history/documents/${documentId}/signed-url`, { hideToast: true });
    window.open(res.data.url, '_blank');
  } catch (error) {
    const status = error.response?.status;
    const message = status === 404
      ? 'This document was stored on a previous server and must be re-uploaded to be accessible.'
      : (error.response?.data?.message || 'Unable to open document. Please try again or contact support.');
    dispatch(addToast({ type: 'error', message }));
  }
};

const SecureInlineImage = ({ patientId, doc, className, onClick, onError }) => {
  const [src, setSrc] = useState(null);
  const [err, setErr] = useState(false);
  const missingDocument = !patientId || !getId(doc);

  useEffect(() => {
    let active = true;
    const documentId = getId(doc);
    if (!patientId || !documentId) return;
    client.get(`/api/patients/${patientId}/history/documents/${documentId}/signed-url`, { hideToast: true })
      .then(res => { if (active) setSrc(res.data.url); })
      .catch(() => { if (active) setErr(true); });
    return () => { active = false; };
  }, [patientId, doc]);

  if (err || missingDocument) return <div className="w-full h-full flex items-center justify-center text-[#A0AECB] bg-slate-50" onClick={onClick}><FileText size={16} /></div>;
  if (!src) return <div className="w-full h-full flex items-center justify-center text-[#A0AECB] animate-pulse bg-slate-50" onClick={onClick}><FileText size={16} className="opacity-30" /></div>;

  return (
    <img
      src={src}
      alt={doc.fileName || doc.name || 'Medical image'}
      className={className}
      onClick={onClick}
      onError={onError}
    />
  );
};

/* ─── Document Filter & Viewer Enhancements ─── */
const DocumentCategory = {
  ALL: 'ALL',
  LAB: 'LAB',
  IMAGING: 'IMAGING',
  DISCHARGE: 'DISCHARGE',
  OTHER: 'OTHER'
};

const getDocCategory = (doc) => {
  const type = (doc?.type || doc?.category || '').toUpperCase();
  if (type.includes('LAB')) return DocumentCategory.LAB;
  if (type.includes('IMAGING') || type.includes('RADIO')) return DocumentCategory.IMAGING;
  if (type.includes('DISCHARGE')) return DocumentCategory.DISCHARGE;
  return DocumentCategory.OTHER;
};

const docColor = (doc) => {
  const cat = getDocCategory(doc);
  switch (cat) {
    case DocumentCategory.LAB: return { bg: '#dbeafe', fg: '#1d4ed8', icon: FlaskConical };
    case DocumentCategory.IMAGING: return { bg: '#fef9c3', fg: '#a16207', icon: Activity };
    case DocumentCategory.DISCHARGE: return { bg: '#dcfce7', fg: '#15803d', icon: FileCheck };
    default: return { bg: '#f1f5f9', fg: '#475569', icon: FileText };
  }
};

const isImageFile = (doc) => {
  const name = (doc?.fileName || doc?.name || '').toLowerCase();
  return /\.(jpe?g|png|gif|webp|svg|bmp|tiff?)$/.test(name);
};

const getDocumentSortTime = (doc) => {
  const value = doc?.createdAt || doc?.uploadedAt || doc?.updatedAt || doc?.date || doc?.documentDate;
  if (!value) return 0;
  if (Array.isArray(value)) {
    return new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0, value[5] || 0).getTime() || 0;
  }
  return new Date(value).getTime() || 0;
};

const getLatestDocument = (documents) => {
  return [...documents].sort((a, b) => getDocumentSortTime(b) - getDocumentSortTime(a))[0] || null;
};

/* ─── main component ─── */
export default function GeneralOverviewPage({
  patientId: patientIdProp,
  canEdit: canEditProp,
  conditions: conditionsProp,
  documents: documentsProp,
  encounters: encountersProp,
  labResults: labResultsProp,
  medications: medicationsProp,
  vitals: vitalsProp,
  timeline: timelineProp,
  setModal,
  setViewModal,
  setTimelineViewItem,
  displayName,
  onDelete,
}) {
  const { patientId: routePatientId } = useParams();
  const patientId = patientIdProp || routePatientId;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const summaryFromStore = useSelector(selectHistorySummary);
  const vitalsFromStore = useSelector(selectVitals);
  const medicationsFromStore = useSelector(selectMedications);
  const conditionsFromStore = useSelector(selectConditions);
  const encountersFromStore = useSelector(selectEncounters);
  const labResultsFromStore = useSelector(selectLabResults);
  const documentsFromStore = useSelector(selectDocuments);
  const timelineFromStore = useSelector(selectTimeline);

  const conds = conditionsProp || conditionsFromStore || [];
  const meds = medicationsProp || medicationsFromStore || [];
  const vits = vitalsProp || vitalsFromStore || [];
  const labs = labResultsProp || labResultsFromStore || [];
  const encs = encountersProp || encountersFromStore || [];
  const docs = documentsProp || documentsFromStore || [];
  const tl = timelineProp || timelineFromStore || [];

  const patName = displayName || summaryFromStore?.patientName || summaryFromStore?.name || 'Patient';
  const patGender = summaryFromStore?.gender || '—';
  const patAge = summaryFromStore?.age || '—';

  const handleDelete = onDelete || (async (type, item) => {
    if (!window.confirm(`Delete this clinical record?`)) return;
    dispatch(addToast({ type: 'info', message: 'Delete handler is not available' }));
  });
  const previousDocIdsRef = useRef(new Set(docs.map((doc) => String(getId(doc) || ''))));
  const shouldPreviewNextDocumentRef = useRef(false);

  const openAddDocumentModal = () => {
    if (setModal) {
      previousDocIdsRef.current = new Set(docs.map((doc) => String(getId(doc) || '')));
      shouldPreviewNextDocumentRef.current = true;
      setModal({ type: 'documents' });
      return;
    }
    dispatch(addToast({ type: 'info', message: 'Document upload is available from the Patient History page.' }));
  };

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [docFilter, setDocFilter] = useState(DocumentCategory.LAB);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftTab, setLeftTab] = useState('overview');

  /* Filter documents by category and search */
  const filteredDocs = useMemo(() => {
    let filtered = docs;
    if (docFilter !== DocumentCategory.ALL) {
      filtered = filtered.filter(doc => getDocCategory(doc) === docFilter);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        (doc.fileName || doc.name || '').toLowerCase().includes(query) ||
        (doc.type || '').toLowerCase().includes(query) ||
        (doc.notes || '').toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [docs, docFilter, searchQuery]);

  /* Close slide-up viewer if selected document is deleted */
  useEffect(() => {
    if (selectedDoc) {
      const exists = docs.some(d => getId(d) === getId(selectedDoc));
      if (!exists) {
        setSelectedDoc(null);
        setPreviewUrl(null);
      }
    }
  }, [docs, selectedDoc]);

  /* fetch only when standalone (not embedded in PatientHistory) */
  useEffect(() => {
    if (routePatientId && !patientIdProp) {
      dispatch(fetchAllPatientHistory(routePatientId));
    }
  }, [routePatientId, patientIdProp, dispatch]);

  /* reset selected doc when patient changes */
  const [prevPid, setPrevPid] = useState(patientId);
  if (patientId !== prevPid) {
    setPrevPid(patientId);
    setSelectedDoc(null);
    setPreviewUrl(null);
  }

  const handleSelectDoc = (doc) => {
    if (!doc) return;
    const category = getDocCategory(doc);
    setSearchQuery('');
    if (category === DocumentCategory.OTHER) {
      setDocFilter(DocumentCategory.ALL);
    } else {
      setDocFilter(category);
    }
    setSelectedDoc(doc);
  };

  useEffect(() => {
    const currentIds = new Set(docs.map((doc) => String(getId(doc) || '')));
    const hasNewDocument = docs.some((doc) => {
      const id = String(getId(doc) || '');
      return id && !previousDocIdsRef.current.has(id);
    });
    const selectedStillExists = selectedDoc && docs.some((doc) => sameId(getId(doc), getId(selectedDoc)));
    const latestDoc = getLatestDocument(docs);

    if (latestDoc && (shouldPreviewNextDocumentRef.current || hasNewDocument || !selectedStillExists)) {
      shouldPreviewNextDocumentRef.current = false;
      setLeftTab('documents');
      handleSelectDoc(latestDoc);
    }

    previousDocIdsRef.current = currentIds;
  }, [docs]);

  const findAssociatedDoc = (item) => {
    if (!item) return null;
    const itemId = getId(item);
    return docs.find(d => 
      sameId(getId(d), item.documentId) ||
      (d.name && item.testName && d.name.toLowerCase().includes(item.testName.toLowerCase())) ||
      (d.fileName && item.testName && d.fileName.toLowerCase().includes(item.testName.toLowerCase()))
    );
  };


  /* fetch signed URL when a doc is selected */
  useEffect(() => {
    const id = getId(selectedDoc);
    if (!id || !patientId) { setPreviewUrl(null); return; }
    setLoadingUrl(true);
    client.get(`/api/patients/${patientId}/history/documents/${id}/signed-url`, { hideToast: true })
      .then(r => setPreviewUrl(r.data.url))
      .catch(() => setPreviewUrl(null))
      .finally(() => setLoadingUrl(false));
  }, [selectedDoc, patientId]);

  const getValidTime = (dateVal) => {
    if (!dateVal) return null;
    if (Array.isArray(dateVal)) {
      return new Date(dateVal[0], dateVal[1] - 1, dateVal[2], dateVal[3] || 0, dateVal[4] || 0, dateVal[5] || 0).getTime();
    }
    const t = new Date(dateVal).getTime();
    return isNaN(t) ? null : t;
  };

  const conditionSortTime = (condition) => getValidTime(condition.createdAt || condition.updatedAt || condition.dateDiagnosed || condition.diagnosedAt);

  const activeConditions = conds
    .map((condition, index) => ({ condition, index, time: conditionSortTime(condition) }))
    .filter(({ condition }) => !condition.status || condition.status === 'ACTIVE')
    .sort((a, b) => {
      if (a.time !== null && b.time !== null && a.time !== b.time) return a.time - b.time;
      if (a.time !== null && b.time === null) return -1;
      if (a.time === null && b.time !== null) return 1;
      return b.index - a.index;
    })
    .map(({ condition }) => condition);

  const fallbackCondition = conds.length > 0 ? conds[0] : null;
  const conditionsToDisplay = activeConditions.length > 0 ? activeConditions : (fallbackCondition ? [fallbackCondition] : []);

  const QuickDocBox = ({ label, color, accent, docs, imgs, conditionId, phase }) => {
    return (
      <div className={`bg-white border ${color} rounded-lg shadow-sm overflow-hidden shrink-0`}>
        <div className={`flex items-center justify-between border-b ${color} px-2 py-1 ${accent} shrink-0`}>
          <div className="flex items-center gap-1 min-w-0">
            <div className={`h-4 w-4 rounded flex items-center justify-center shrink-0 ${accent}`}><FileText size={10} /></div>
            <div className="min-w-0">
              <h2 className="text-[9px] font-black text-[#0F1A3A] leading-none truncate">{label} Documents</h2>
            </div>
          </div>
          {canEditProp && (
            <button
              type="button"
              onClick={() => setModal({
                type: 'documents',
                initialValues: {
                  conditionId: conditionId || '',
                  documentPhase: phase,
                },
              })}
              className="w-4 h-4 rounded bg-[#C8102E] text-white flex items-center justify-center shrink-0 hover:bg-red-700 transition-colors"
            >
              <Plus size={8} />
            </button>
          )}
        </div>
        <div className="bg-white">
          {docs.length === 0 && imgs.length === 0 ? (
            <div className="p-2 text-center">
              <p className="text-[8px] font-bold text-[#A0AECB]">No {label.toLowerCase()} files</p>
            </div>
          ) : null}
          {imgs.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto custom-scrollbar p-1.5 border-b border-[#F0F4FC]">
              {imgs.map((doc) => (
                <div key={getId(doc)} className="relative group rounded overflow-hidden border border-[#DDE3F0] w-14 h-10 bg-slate-50 shrink-0">
                  <SecureInlineImage
                    patientId={patientId}
                    doc={doc}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => handleSelectDoc(doc)}
                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                  />
                  <div className="hidden w-full h-full items-center justify-center text-[#A0AECB] bg-slate-50" onClick={() => handleSelectDoc(doc)}>
                    <FileText size={12} />
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center cursor-pointer" onClick={() => handleSelectDoc(doc)}>
                    <span className="opacity-0 group-hover:opacity-100 text-[7px] font-black text-white bg-black/60 px-1 py-0.5 rounded">View</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {docs.length > 0 && (
            <div className="divide-y divide-[#F0F4FC]">
              {docs.map(doc => (
                <div key={getId(doc)} className="px-2 py-1 flex items-center justify-between gap-1 hover:bg-[#F8FAFF] transition-colors">
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleSelectDoc(doc)}>
                    <p className="text-[9px] font-bold text-[#0F1A3A] truncate">{doc.fileName || doc.name || 'Document'}</p>
                    <p className="text-[8px] text-[#A0AECB]">{(doc.type || 'FILE').replace(/_/g, ' ')}</p>
                  </div>
                  <button type="button" onClick={() => handleSelectDoc(doc)} className="text-[8px] font-black text-blue-600 hover:underline shrink-0">
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* Helper to render document icon based on category */
  const DocIcon = ({ doc, className = "w-3.5 h-3.5" }) => {
    const { icon: IconComp } = docColor(doc);
    return <IconComp className={className} />;
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 font-sans text-slate-800" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Patient identity strip — compact medical header */}
      <div className="shrink-0 px-4 py-3 bg-[#F8FAFF] border-b border-[#DDE3F0] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#E8EEF8] border border-[#DDE3F0] flex items-center justify-center shrink-0">
            <User size={15} className="text-[#1A3C8F]" />
          </div>
          <div className="min-w-0">
            <p className="text-[#0F1A3A] font-black text-xs leading-tight truncate tracking-wide">{patName}</p>
            <p className="text-[#4B5A7A] text-[9px] font-bold mt-0.5">{patGender} · {patAge} yrs · MRN: {patientId?.slice(-8) || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => dispatch(fetchAllPatientHistory(patientId))}
            className="bg-white hover:bg-[#F8FAFF] border border-[#DDE3F0] text-[#0F1A3A] rounded-md p-1.5 text-[9px] font-black uppercase tracking-wider transition-all"
            title="Refresh History"
          >
            <RefreshCw size={11} className="text-[#4B5A7A]" />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/epcr/new?patientId=${patientId}`)}
            className="bg-[#C8102E] hover:bg-red-700 text-white rounded-md px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm"
          >
            + ePCR
          </button>
          <button
            type="button"
            onClick={() => { dispatch(clearHistory()); navigate('/patient-history'); }}
            className="text-[#8A97B0] hover:text-[#1A3C8F] text-[9px] font-black uppercase tracking-wider transition-all px-2 py-1.5"
          >
            Change
          </button>
        </div>
      </div>

      {/* ── Stats Count Bar ── */}
      <div className="shrink-0 px-3 py-1.5 bg-white border-b border-[#DDE3F0] flex items-center gap-1.5 flex-wrap">
        {[
          { label: 'CONDITIONS', value: conds.filter(c => c.status === 'ACTIVE').length, total: conds.length, icon: HeartPulse, color: 'text-red-500', bg: 'bg-red-50', activeDot: true },
          { label: 'MEDS', value: meds.filter(m => !m.status || m.status === 'ACTIVE').length, total: meds.length, icon: Pill, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'VISITS', value: encs.length, icon: Stethoscope, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'LABS', value: labs.length, icon: FlaskConical, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'DOCS', value: docs.length, icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'VITALS', value: vits.length, icon: Thermometer, color: 'text-teal-500', bg: 'bg-teal-50' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-1 bg-[#F8FAFF] border border-[#DDE3F0] rounded-md px-2 py-0.5 shadow-sm hover:shadow-md transition-all cursor-default"
          >
            <div className={`w-4 h-4 ${stat.bg} ${stat.color} rounded flex items-center justify-center shrink-0`}>
              <stat.icon size={9} />
            </div>
            <span className={`text-[10px] font-black ${stat.color}`}>{stat.value}</span>
            <span className="text-[8px] font-bold text-[#A0AECB] uppercase tracking-wider leading-none">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* ── Tab Navigation Bar ── */}
      <div className="shrink-0 px-2 py-1 bg-white border-b border-[#DDE3F0] flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'conditions', label: 'Conditions', icon: HeartPulse },
          { id: 'medications', label: 'Medications', icon: Pill },
          { id: 'vitals', label: 'Vitals', icon: Thermometer },
          { id: 'labs', label: 'Labs', icon: FlaskConical },
          { id: 'visits', label: 'Visits', icon: Stethoscope },
          { id: 'documents', label: 'Documents', icon: FileText },
          { id: 'timeline', label: 'Timeline', icon: Clock },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setLeftTab(id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-all ${
              leftTab === id
                ? 'bg-[#C8102E] text-white shadow-sm'
                : 'text-[#8A97B0] hover:bg-[#F8FAFF] hover:text-[#4B5A7A]'
            }`}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Main Split View ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ══════════════ LEFT PANEL (Clinical Summary / Document Preview) ══════════════ */}
        <div className="flex flex-col w-[68%] border-r border-[#DDE3F0] overflow-hidden bg-[#F8FAFF] z-10">
          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>

          {/* ═══ OVERVIEW TAB ═══ */}
          {leftTab === 'overview' && (<>
          {/* Dentist-Style Quick Reference Top Bar */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            {/* Conditions Box */}
            <div className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm px-3 py-1.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-md bg-red-50 flex items-center justify-center shrink-0">
                    <HeartPulse size={11} className="text-red-600" />
                  </div>
                  <span className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide">Conditions</span>
                  <span className="text-[9px] font-black text-red-600 bg-red-50 px-1 rounded">
                    {conds.filter(c => c.status === 'ACTIVE').length} active
                  </span>
                </div>
                {canEditProp && (
                  <button
                    type="button"
                    onClick={() => setModal({ type: 'conditions' })}
                    className="w-5 h-5 rounded-md bg-[#C8102E] text-white flex items-center justify-center shrink-0 hover:bg-red-700 transition-colors"
                  >
                    <Plus size={9} />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1 max-h-[52px] overflow-y-auto custom-scrollbar">
                {conds.length === 0 ? (
                  <span className="text-[9px] text-[#A0AECB]">None on record</span>
                ) : (
                  conds.map((c, i) => (
                    <span
                      key={getId(c) || i}
                      onClick={() => setViewModal({ type: 'conditions', item: c })}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border cursor-pointer hover:shadow-sm transition-all ${statusClass(c.status)}`}
                    >
                      <span className={`w-1 h-1 rounded-full shrink-0 ${c.status === 'ACTIVE' ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`} />
                      {c.name}{c.severity ? ` · ${c.severity}` : ''}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Medications Box */}
            <div className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm px-3 py-1.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-md bg-purple-50 flex items-center justify-center shrink-0">
                    <Pill size={11} className="text-purple-600" />
                  </div>
                  <span className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide">Medications</span>
                  <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-1 rounded">
                    {meds.filter(m => !m.status || m.status === 'ACTIVE').length} active
                  </span>
                </div>
                {canEditProp && (
                  <button
                    type="button"
                    onClick={() => setModal({ type: 'medications' })}
                    className="w-5 h-5 rounded-md bg-[#C8102E] text-white flex items-center justify-center shrink-0 hover:bg-red-700 transition-colors"
                  >
                    <Plus size={9} />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1 max-h-[52px] overflow-y-auto custom-scrollbar">
                {meds.length === 0 ? (
                  <span className="text-[9px] text-[#A0AECB]">None on record</span>
                ) : (
                  meds.map((m, i) => (
                    <span
                      key={getId(m) || i}
                      onClick={() => setViewModal({ type: 'medications', item: m })}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border cursor-pointer hover:shadow-sm transition-all ${statusClass(m.status)}`}
                    >
                      {m.name || m.medicationName}{m.dosage ? ` ${m.dosage}` : ''}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Vitals Box */}
          {(() => {
            const sortedV = [...vits].sort((a, b) => new Date(a.recordedAt || a.createdAt) - new Date(b.recordedAt || b.createdAt));
            const initialVital = sortedV[0] || null;
            const latestVital = sortedV.length > 1 ? sortedV[sortedV.length - 1] : null;

            const VitalsBox = ({ label, v, accentCls, borderCls }) => {
              const st = v ? assessVitalStatus(v) : null;
              return (
                <div className={`bg-white border ${borderCls} rounded-lg shadow-sm overflow-hidden flex-1`}>
                  <div className={`flex items-center justify-between border-b ${borderCls} px-2 py-1 ${accentCls}`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={`h-4 w-4 rounded flex items-center justify-center shrink-0 ${accentCls}`}><Thermometer size={10} /></div>
                      <h2 className="text-[9px] font-black text-[#0F1A3A] uppercase tracking-wide truncate">{label} Vitals</h2>
                      {v && <span className="text-[8px] font-bold text-[#8A97B0] shrink-0">{fmtDate(v.recordedAt || v.createdAt)}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {st && <span className={`text-[8px] font-black px-1 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>}
                      {v && (
                        <div className="flex gap-1">
                          <button onClick={() => setViewModal({ type: 'vitals', item: v })} className="p-0.5 text-slate-400 hover:text-blue-600 transition-colors"><Eye size={11} /></button>
                          {canEditProp && (
                            <>
                              <button onClick={() => setModal({ type: 'vitals', item: v })} className="p-0.5 text-slate-400 hover:text-amber-600"><Edit3 size={11} /></button>
                              <button onClick={() => handleDelete('vitals', v)} className="p-0.5 text-slate-400 hover:text-red-600"><Trash2 size={11} /></button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="px-2 py-1 flex flex-wrap gap-1">
                    {(() => {
                      const VITAL_KEYS = [
                        { k: 'BP', val: v?.systolicBP ? `${v.systolicBP}/${v.diastolicBP}` : null, u: 'mmHg', w: v && (v.systolicBP > 140 || v.systolicBP < 90 || v.diastolicBP > 90 || v.diastolicBP < 60) },
                        { k: 'HR', val: v?.heartRate ?? null, u: 'bpm', w: v && (v.heartRate > 100 || v.heartRate < 60) },
                        { k: 'SpO₂', val: v?.oxygenSaturation ?? null, u: '%', w: v && v.oxygenSaturation < 95 },
                        { k: 'Temp', val: v?.temperature ?? null, u: '°C', w: v && (v.temperature > 37.2 || v.temperature < 36.1) },
                        { k: 'RR', val: v?.respiratoryRate ?? null, u: '/min', w: v && (v.respiratoryRate > 20 || v.respiratoryRate < 12) },
                        { k: 'GCS', val: v?.glasgowComaScale ?? null, u: '/15', w: v && v.glasgowComaScale < 14 },
                      ];
                      return VITAL_KEYS.map(x => (
                        <span key={x.k} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold border ${x.val != null && x.val !== '' ? (x.w ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-[#F8FAFF] border-[#DDE3F0] text-[#0F1A3A]') : 'bg-[#F8FAFF] border-[#DDE3F0] text-[#A0AECB]'}`}>
                          <span className="text-[7px] font-black uppercase opacity-60">{x.k}</span>
                          <span className="tabular-nums font-black">{x.val != null && x.val !== '' ? x.val : 'N/A'}</span>
                          {x.val != null && x.val !== '' && <span className="text-[7px] text-[#8A97B0]">{x.u}</span>}
                        </span>
                      ));
                    })()}
                  </div>
                  {v?.notes && (
                    <div className="px-2 pb-1.5 pt-0">
                      <p className="text-[8px] text-slate-500 italic border-l border-slate-200 pl-1 truncate">Note: {v.notes}</p>
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm p-3">
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#F0F4FC]">
                  <span className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide flex items-center gap-1">
                    <Thermometer size={12} className="text-red-500" /> Patient Vitals Comparison
                  </span>
                  {canEditProp && (
                    <button type="button" onClick={() => setModal({ type: 'vitals' })} className="w-5 h-5 rounded-md bg-[#C8102E] text-white flex items-center justify-center shrink-0 hover:bg-red-700 transition-colors">
                      <Plus size={10} />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <VitalsBox label="Initial" v={initialVital} accentCls="bg-[#EFF6FF] text-[#1A3C8F]" borderCls="border-[#DBEAFE]" />
                  <VitalsBox label="Latest" v={latestVital || initialVital} accentCls="bg-[#F0FDF4] text-[#16A34A]" borderCls="border-[#DCFCE7]" />
                </div>
              </div>
            );
          })()}

          {/* Incidents / Active Conditions blocks */}
          {conditionsToDisplay.length === 0 ? (
            <div className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm p-6 text-center">
              <HeartPulse className="mx-auto text-[#A0AECB] opacity-50 mb-1" size={24} />
              <p className="text-[10px] font-bold text-[#8A97B0]">No active conditions or incidents found</p>
            </div>
          ) : (
            conditionsToDisplay.map((cond, idx) => {
              const condId = getId(cond) || cond?._id;

              return (
                <div key={condId || idx} className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm p-3 relative group">
                  {/* Incident header */}
                  <div className="flex items-center justify-between border-b border-[#F0F4FC] pb-1.5 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                      <h3 className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide truncate">
                        Incident: {cond.name || 'Condition'}
                      </h3>
                      {cond.dateDiagnosed && (
                        <span className="text-[8px] font-bold text-[#8A97B0] shrink-0">Dx: {fmtDate(cond.dateDiagnosed)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => setViewModal({ type: 'conditions', item: cond })} className="p-0.5 text-slate-400 hover:text-blue-600 transition-colors"><Eye size={11} /></button>
                      {canEditProp && (
                        <>
                          <button onClick={() => setModal({ type: 'conditions', item: cond })} className="p-0.5 text-slate-400 hover:text-amber-600"><Edit3 size={11} /></button>
                          <button onClick={() => handleDelete('conditions', cond)} className="p-0.5 text-slate-400 hover:text-red-600"><Trash2 size={11} /></button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Findings / Symptoms / Analysis / Plan */}
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="bg-white border border-[#DDE3F0] rounded p-1.5 flex flex-col min-h-[48px]">
                      <span className="text-[7px] font-black text-[#A0AECB] uppercase tracking-wider mb-0.5 leading-none">Findings</span>
                      <p className="text-[9px] text-[#4B5A7A] leading-snug flex-1 overflow-y-auto max-h-[48px] custom-scrollbar">{cond.findings || '—'}</p>
                    </div>
                    <div className="bg-white border border-[#DDE3F0] rounded p-1.5 flex flex-col min-h-[48px]">
                      <span className="text-[7px] font-black text-[#A0AECB] uppercase tracking-wider mb-0.5 leading-none">Symptoms</span>
                      <p className="text-[9px] text-[#4B5A7A] leading-snug flex-1 overflow-y-auto max-h-[48px] custom-scrollbar">{cond.symptoms || '—'}</p>
                    </div>
                    <div className="bg-white border border-[#DDE3F0] rounded p-1.5 flex flex-col min-h-[48px]">
                      <span className="text-[7px] font-black text-[#A0AECB] uppercase tracking-wider mb-0.5 leading-none">Analysis</span>
                      <p className="text-[9px] text-[#4B5A7A] leading-snug flex-1 overflow-y-auto max-h-[48px] custom-scrollbar">{cond.analysis || '—'}</p>
                    </div>
                    <div className="bg-white border border-[#DDE3F0] rounded p-1.5 flex flex-col min-h-[48px]">
                      <span className="text-[7px] font-black text-[#A0AECB] uppercase tracking-wider mb-0.5 leading-none">Plan</span>
                      <p className="text-[9px] text-[#4B5A7A] leading-snug flex-1 overflow-y-auto max-h-[48px] custom-scrollbar">{cond.recommendedTreatment || '—'}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Labs & Encounters Grid */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            {/* Lab Results */}
            <section className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-[#DDE3F0] px-2 py-1 shrink-0 bg-[#F8FAFF]">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-md bg-[#DBEAFE] flex items-center justify-center"><FlaskConical size={11} className="text-[#1A3C8F]" /></div>
                  <h2 className="text-[10px] font-black text-[#0F1A3A]">Lab Results</h2>
                </div>
                {canEditProp && (
                  <button type="button" onClick={() => setModal({ type: 'labResults' })} className="w-5 h-5 rounded-md bg-[#C8102E] text-white flex items-center justify-center hover:bg-red-700 transition-colors shrink-0">
                    <Plus size={11} />
                  </button>
                )}
              </div>
              <div className="divide-y divide-[#F0F4FC] overflow-y-auto custom-scrollbar max-h-[160px]">
                {labs.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-[9px] text-[#A0AECB]">No lab results</p>
                  </div>
                ) : labs.map(lab => (
                  <div key={getId(lab)} className="flex flex-col gap-1 px-2.5 py-1.5 hover:bg-[#F8FAFF] transition-colors relative group">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 pr-6">
                        <p className="text-[10px] font-bold text-[#0F1A3A] truncate">{lab.testName || lab.name}</p>
                        <p className="text-[8px] font-bold text-[#A0AECB]">{fmtDate(lab.date || lab.resultDate)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-[#1A3C8F]">{lab.value} <span className="text-[8px] text-[#8A97B0]">{lab.unit}</span></p>
                        {lab.interpretation && (
                          <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${
                            String(lab.interpretation).toUpperCase() === 'NORMAL' ? 'text-green-600' : 'text-red-500'
                          }`}>{lab.interpretation}</p>
                        )}
                      </div>
                    </div>
                    {lab.normalRange && (
                      <p className="text-[8px] text-[#8A97B0] font-semibold">Ref Range: {lab.normalRange}</p>
                    )}
                    {lab.notes && (
                      <p className="text-[8px] text-[#4B5A7A] italic leading-tight border-l-2 border-[#DDE3F0] pl-1.5">{lab.notes}</p>
                    )}
                    <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 flex gap-0.5 bg-white/95 rounded shadow-sm p-0.5">
                      {(() => {
                        const assoc = findAssociatedDoc(lab);
                        return assoc ? (
                          <button
                            type="button"
                            onClick={() => handleSelectDoc(assoc)}
                            className="p-0.5 text-blue-600 hover:text-blue-800 hover:bg-slate-100 rounded transition-colors"
                            title="Preview Report PDF"
                          >
                            <FileText size={10} />
                          </button>
                        ) : null;
                      })()}
                      <button onClick={() => setViewModal({ type: 'labResults', item: lab })} className="p-0.5 text-slate-400 hover:text-blue-600"><Eye size={10} /></button>
                      {canEditProp && (
                        <>
                          <button onClick={() => setModal({ type: 'labResults', item: lab })} className="p-0.5 text-slate-400 hover:text-amber-600"><Edit3 size={10} /></button>
                          <button onClick={() => handleDelete('labResults', lab)} className="p-0.5 text-slate-400 hover:text-red-600"><Trash2 size={10} /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Procedures & Visits */}
            <section className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-[#DDE3F0] px-2 py-1 shrink-0 bg-[#F8FAFF]">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-md bg-orange-50 flex items-center justify-center"><Stethoscope size={11} className="text-orange-600" /></div>
                  <h2 className="text-[10px] font-black text-[#0F1A3A]">Procedures &amp; Visits</h2>
                </div>
                {canEditProp && (
                  <button type="button" onClick={() => setModal({ type: 'encounters' })} className="w-5 h-5 rounded-md bg-[#C8102E] text-white flex items-center justify-center hover:bg-red-700 transition-colors shrink-0">
                    <Plus size={11} />
                  </button>
                )}
              </div>
              <div className="divide-y divide-[#F0F4FC] overflow-y-auto custom-scrollbar max-h-[160px]">
                {encs.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-[9px] text-[#A0AECB]">No visits or procedures</p>
                  </div>
                ) : encs.map(enc => (
                  <div key={getId(enc)} className="px-2.5 py-1.5 hover:bg-[#F8FAFF] transition-colors relative group">
                    <div className="flex items-center justify-between gap-1 pr-6">
                      <p className="text-[10px] font-bold text-[#0F1A3A] truncate">{enc.chiefComplaint || enc.type || 'Visit'}</p>
                      {enc.outcome && <span className="inline-flex items-center rounded-md border border-[#DDE3F0] bg-[#E8EEF8] text-[#1A3C8F] px-1.5 py-0.5 text-[8px] font-black uppercase shrink-0">{enc.outcome}</span>}
                    </div>
                    <p className="text-[8px] font-bold text-[#A0AECB] mt-0.5">{fmtDate(enc.date || enc.encounterDate)}</p>
                    <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 flex gap-0.5 bg-white/95 rounded shadow-sm p-0.5">
                      <button onClick={() => setViewModal({ type: 'encounters', item: enc })} className="p-0.5 text-slate-400 hover:text-blue-600"><Eye size={10} /></button>
                      {canEditProp && (
                        <>
                          <button onClick={() => setModal({ type: 'encounters', item: enc })} className="p-0.5 text-slate-400 hover:text-amber-600"><Edit3 size={10} /></button>
                          <button onClick={() => handleDelete('encounters', enc)} className="p-0.5 text-slate-400 hover:text-red-600"><Trash2 size={10} /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm overflow-hidden shrink-0 mt-2">
            <div className="flex items-center gap-2 border-b border-[#DDE3F0] px-3 py-1.5 bg-[#F8FAFF]">
              <div className="h-5 w-5 rounded-md bg-[#E8EEF8] flex items-center justify-center"><Clock size={11} className="text-[#4B5A7A]" /></div>
              <h2 className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide">Recent Activity</h2>
              <span className="text-[9px] font-bold text-[#A0AECB]">{tl.length} event{tl.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-[#F0F4FC] max-h-[140px] overflow-y-auto custom-scrollbar">
              {tl.length === 0 ? (
                <p className="text-[9px] text-[#A0AECB] px-3 py-2">No activity recorded yet.</p>
              ) : (
                [...tl]
                  .sort((a, b) => new Date(b.date || b.eventDate || b.timestamp) - new Date(a.date || a.eventDate || a.timestamp))
                  .slice(0, 8)
                  .map((item, index) => {
                    const st = getEventStyle(item.eventType || item.type);
                    const Icon = st.icon;
                    const eventDate = item.date || item.eventDate || item.timestamp;
                    const isDocEvent = String(item.eventType || item.type).toUpperCase() === 'DOCUMENT';
                    const handleTimelineClick = () => {
                      if (isDocEvent) {
                        const docId = item.sourceId || getId(item) || item.documentId;
                        const matchingDoc = docs.find(d => sameId(getId(d), docId));
                        if (matchingDoc) {
                          handleSelectDoc(matchingDoc);
                          return;
                        }
                      }
                      if (setTimelineViewItem) {
                        setTimelineViewItem(item);
                      }
                    };
                    return (
                      <button
                        key={timelineKey(item, index)}
                        type="button"
                        onClick={handleTimelineClick}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#F8FAFF] transition-colors text-left"
                      >
                        <div className="h-5 w-5 rounded flex items-center justify-center shrink-0" style={{ background: st.bg, color: st.color }}>
                          <Icon size={10} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wide shrink-0" style={{ color: st.color }}>{st.label}</span>
                        <span className="text-[9px] font-bold text-[#0F1A3A] truncate flex-1">{item.title || item.description || ''}</span>
                        <span className="text-[8px] font-bold text-[#A0AECB] shrink-0">{eventDate ? relativeTime(eventDate) : ''}</span>
                      </button>
                    );
                  })
              )}
            </div>
          </div>

          {/* END OVERVIEW TAB */}
          </>)}


        {/* ═══ CONDITIONS TAB ═══ */}
        {leftTab === 'conditions' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide flex items-center gap-1.5">
                <HeartPulse size={12} className="text-red-500" /> All Conditions
                <span className="text-[9px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">{conds.filter(c => c.status === 'ACTIVE').length} active</span>
              </span>
              {canEditProp && <button type="button" onClick={() => setModal({ type: 'conditions' })} className="w-6 h-6 rounded-md bg-[#C8102E] text-white flex items-center justify-center hover:bg-red-700 transition-colors"><Plus size={11} /></button>}
            </div>
            {conds.length === 0 ? (
              <div className="bg-white border border-dashed border-[#DDE3F0] rounded-xl p-8 text-center"><HeartPulse size={24} className="mx-auto text-[#A0AECB] mb-2" /><p className="text-xs font-bold text-[#A0AECB]">No conditions on record</p></div>
            ) : conds.map((c, i) => (
              <div key={getId(c) || i} className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm p-3 flex items-start justify-between gap-2 hover:shadow-md transition-all">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${c.status === 'ACTIVE' ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`} />
                    <p className="text-[11px] font-black text-[#0F1A3A]">{c.name || '—'}</p>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${statusClass(c.status)}`}>{c.status || 'Unknown'}</span>
                    {c.severity && <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${statusClass(c.severity)}`}>{c.severity}</span>}
                  </div>
                  {c.dateDiagnosed && <p className="text-[9px] text-[#8A97B0] mt-1">Diagnosed {fmtDate(c.dateDiagnosed)}</p>}
                  {c.notes && <p className="text-[9px] text-[#4B5A7A] mt-1 italic">{c.notes}</p>}
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={() => setViewModal({ type: 'conditions', item: c })} className="p-1 text-slate-400 hover:text-blue-600"><Eye size={11} /></button>
                  {canEditProp && <><button onClick={() => setModal({ type: 'conditions', item: c })} className="p-1 text-slate-400 hover:text-amber-600"><Edit3 size={11} /></button><button onClick={() => handleDelete('conditions', c)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={11} /></button></>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ MEDICATIONS TAB ═══ */}
        {leftTab === 'medications' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide flex items-center gap-1.5">
                <Pill size={12} className="text-purple-600" /> All Medications
                <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">{meds.filter(m => !m.status || m.status === 'ACTIVE').length} active</span>
              </span>
              {canEditProp && <button type="button" onClick={() => setModal({ type: 'medications' })} className="w-6 h-6 rounded-md bg-[#C8102E] text-white flex items-center justify-center hover:bg-red-700 transition-colors"><Plus size={11} /></button>}
            </div>
            {meds.length === 0 ? (
              <div className="bg-white border border-dashed border-[#DDE3F0] rounded-xl p-8 text-center"><Pill size={24} className="mx-auto text-[#A0AECB] mb-2" /><p className="text-xs font-bold text-[#A0AECB]">No medications on record</p></div>
            ) : meds.map((m, i) => (
              <div key={getId(m) || i} className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm p-3 flex items-start justify-between gap-2 hover:shadow-md transition-all">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[11px] font-black text-[#0F1A3A]">{m.name || m.medicationName || '—'}</p>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${statusClass(m.status || 'ACTIVE')}`}>{m.status || 'ACTIVE'}</span>
                  </div>
                  {(m.dosage || m.frequency) && <p className="text-[9px] text-[#4B5A7A] mt-1">{[m.dosage, m.frequency].filter(Boolean).join(' · ')}</p>}
                  {m.startDate && <p className="text-[9px] text-[#8A97B0] mt-0.5">Started {fmtDate(m.startDate)}{m.endDate ? ` · Ended ${fmtDate(m.endDate)}` : ''}</p>}
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={() => setViewModal({ type: 'medications', item: m })} className="p-1 text-slate-400 hover:text-blue-600"><Eye size={11} /></button>
                  {canEditProp && <><button onClick={() => setModal({ type: 'medications', item: m })} className="p-1 text-slate-400 hover:text-amber-600"><Edit3 size={11} /></button><button onClick={() => handleDelete('medications', m)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={11} /></button></>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ VITALS TAB ═══ */}
        {leftTab === 'vitals' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide flex items-center gap-1.5"><Thermometer size={12} className="text-teal-500" /> Vitals History</span>
              {canEditProp && <button type="button" onClick={() => setModal({ type: 'vitals' })} className="w-6 h-6 rounded-md bg-[#C8102E] text-white flex items-center justify-center hover:bg-red-700 transition-colors"><Plus size={11} /></button>}
            </div>
            {vits.length === 0 ? (
              <div className="bg-white border border-dashed border-[#DDE3F0] rounded-xl p-8 text-center"><Thermometer size={24} className="mx-auto text-[#A0AECB] mb-2" /><p className="text-xs font-bold text-[#A0AECB]">No vitals recorded</p></div>
            ) : [...vits].sort((a, b) => new Date(b.recordedAt || b.createdAt) - new Date(a.recordedAt || a.createdAt)).map((v, i) => {
              const st = assessVitalStatus(v);
              return (
                <div key={getId(v) || i} className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm p-3 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-[#8A97B0]">{fmtDate(v.recordedAt || v.createdAt)}</span>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="flex gap-0.5">
                      <button onClick={() => setViewModal({ type: 'vitals', item: v })} className="p-1 text-slate-400 hover:text-blue-600"><Eye size={11} /></button>
                      {canEditProp && <><button onClick={() => setModal({ type: 'vitals', item: v })} className="p-1 text-slate-400 hover:text-amber-600"><Edit3 size={11} /></button><button onClick={() => handleDelete('vitals', v)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={11} /></button></>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { k: 'BP', val: v.systolicBP ? `${v.systolicBP}/${v.diastolicBP}` : null, u: 'mmHg' },
                      { k: 'HR', val: v.heartRate, u: 'bpm' },
                      { k: 'SpO₂', val: v.oxygenSaturation, u: '%' },
                      { k: 'Temp', val: v.temperature, u: '°C' },
                      { k: 'RR', val: v.respiratoryRate, u: '/min' },
                      { k: 'GCS', val: v.glasgowComaScale, u: '/15' },
                    ].filter(x => x.val != null && x.val !== '').map(x => (
                      <span key={x.k} className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold border bg-[#F8FAFF] border-[#DDE3F0] text-[#0F1A3A]">
                        <span className="text-[7px] opacity-60 font-black uppercase">{x.k}</span>
                        <span className="tabular-nums">{x.val}</span>
                        <span className="text-[7px] text-[#8A97B0]">{x.u}</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ LABS TAB ═══ */}
        {leftTab === 'labs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide flex items-center gap-1.5"><FlaskConical size={12} className="text-green-600" /> Lab Results</span>
              {canEditProp && <button type="button" onClick={() => setModal({ type: 'labResults' })} className="w-6 h-6 rounded-md bg-[#C8102E] text-white flex items-center justify-center hover:bg-red-700 transition-colors"><Plus size={11} /></button>}
            </div>
            {labs.length === 0 ? (
              <div className="bg-white border border-dashed border-[#DDE3F0] rounded-xl p-8 text-center"><FlaskConical size={24} className="mx-auto text-[#A0AECB] mb-2" /><p className="text-xs font-bold text-[#A0AECB]">No lab results on record</p></div>
            ) : labs.map((lab, i) => (
              <div key={getId(lab) || i} className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm p-3 flex items-start justify-between gap-2 hover:shadow-md transition-all">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black text-[#0F1A3A]">{lab.testName || lab.name || '—'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-black text-[#1A3C8F]">{lab.value} <span className="text-[9px] font-bold text-[#8A97B0]">{lab.unit}</span></span>
                    {lab.interpretation && <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${statusClass(lab.interpretation)}`}>{lab.interpretation}</span>}
                  </div>
                  {lab.normalRange && <p className="text-[8px] text-[#8A97B0] mt-0.5">Ref: {lab.normalRange}</p>}
                  <p className="text-[9px] text-[#8A97B0] mt-0.5">{fmtDate(lab.date || lab.resultDate)}</p>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {(() => {
                    const assoc = findAssociatedDoc(lab);
                    return assoc ? (
                      <button
                        type="button"
                        onClick={() => handleSelectDoc(assoc)}
                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-slate-100 rounded transition-colors"
                        title="Preview Report PDF"
                      >
                        <FileText size={11} />
                      </button>
                    ) : null;
                  })()}
                  <button onClick={() => setViewModal({ type: 'labResults', item: lab })} className="p-1 text-slate-400 hover:text-blue-600"><Eye size={11} /></button>
                  {canEditProp && <><button onClick={() => setModal({ type: 'labResults', item: lab })} className="p-1 text-slate-400 hover:text-amber-600"><Edit3 size={11} /></button><button onClick={() => handleDelete('labResults', lab)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={11} /></button></>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ VISITS TAB ═══ */}
        {leftTab === 'visits' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide flex items-center gap-1.5"><Stethoscope size={12} className="text-blue-500" /> Visits & Encounters</span>
              {canEditProp && <button type="button" onClick={() => setModal({ type: 'encounters' })} className="w-6 h-6 rounded-md bg-[#C8102E] text-white flex items-center justify-center hover:bg-red-700 transition-colors"><Plus size={11} /></button>}
            </div>
            {encs.length === 0 ? (
              <div className="bg-white border border-dashed border-[#DDE3F0] rounded-xl p-8 text-center"><Stethoscope size={24} className="mx-auto text-[#A0AECB] mb-2" /><p className="text-xs font-bold text-[#A0AECB]">No visits on record</p></div>
            ) : [...encs].sort((a, b) => new Date(b.date || b.encounterDate || 0) - new Date(a.date || a.encounterDate || 0)).map((enc, i) => (
              <div key={getId(enc) || i} className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm p-3 flex items-start justify-between gap-2 hover:shadow-md transition-all">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black text-[#0F1A3A]">{enc.chiefComplaint || enc.type || 'Visit'}</p>
                  <p className="text-[9px] text-[#8A97B0] mt-0.5">{fmtDate(enc.date || enc.encounterDate)}</p>
                  {enc.outcome && <span className="mt-1 inline-flex text-[8px] font-black border border-[#DDE3F0] bg-[#E8EEF8] text-[#1A3C8F] px-1.5 py-0.5 rounded">{enc.outcome}</span>}
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {(() => {
                    const assoc = findAssociatedDoc(enc);
                    return assoc ? (
                      <button
                        type="button"
                        onClick={() => handleSelectDoc(assoc)}
                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-slate-100 rounded transition-colors"
                        title="Preview Enc. Report PDF"
                      >
                        <FileText size={11} />
                      </button>
                    ) : null;
                  })()}
                  <button onClick={() => setViewModal({ type: 'encounters', item: enc })} className="p-1 text-slate-400 hover:text-blue-600"><Eye size={11} /></button>
                  {canEditProp && <><button onClick={() => setModal({ type: 'encounters', item: enc })} className="p-1 text-slate-400 hover:text-amber-600"><Edit3 size={11} /></button><button onClick={() => handleDelete('encounters', enc)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={11} /></button></>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ TIMELINE TAB ═══ */}
        {leftTab === 'timeline' && (
          <div className="space-y-2">
            <span className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide flex items-center gap-1.5"><Clock size={12} className="text-[#4B5A7A]" /> Complete Timeline <span className="text-[9px] font-bold text-[#A0AECB]">{tl.length} events</span></span>
            {tl.length === 0 ? (
              <div className="bg-white border border-dashed border-[#DDE3F0] rounded-xl p-8 text-center"><Clock size={24} className="mx-auto text-[#A0AECB] mb-2" /><p className="text-xs font-bold text-[#A0AECB]">No events recorded yet</p></div>
            ) : [...tl].sort((a, b) => new Date(b.date || b.eventDate || b.timestamp) - new Date(a.date || a.eventDate || a.timestamp)).map((item, index) => {
              const st = getEventStyle(item.eventType || item.type);
              const Icon = st.icon;
              const eventDate = item.date || item.eventDate || item.timestamp;
              return (
                <button key={timelineKey(item, index)} type="button" onClick={() => setTimelineViewItem && setTimelineViewItem(item)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-[#DDE3F0] rounded-lg hover:bg-[#F8FAFF] transition-colors text-left shadow-sm">
                  <div className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: st.bg, color: st.color }}><Icon size={11} /></div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-black uppercase tracking-wide block" style={{ color: st.color }}>{st.label}</span>
                    <span className="text-[9px] font-bold text-[#0F1A3A] truncate block">{item.title || item.description || ''}</span>
                  </div>
                  <span className="text-[8px] font-bold text-[#A0AECB] shrink-0">{eventDate ? relativeTime(eventDate) : ''}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ═══ DOCUMENTS TAB ═══ */}
        {leftTab === 'documents' && (
          <div className="space-y-3">
            {/* Filter tabs + Search within left panel Documents tab */}
            <div className="bg-white border border-[#DDE3F0] rounded-xl p-3 flex flex-col gap-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide flex items-center gap-1.5">
                  <FileText size={12} className="text-indigo-600" /> Patient Documents &amp; Reports
                </span>
                {canEditProp && (
                  <button onClick={() => setModal({ type: 'documents' })} className="flex items-center gap-1 px-2.5 py-1.5 bg-[#C8102E] text-white rounded-lg text-[9px] font-black hover:bg-[#9B0A21] transition-all shadow-sm">
                    <Plus size={10} /> Upload New
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between border-t border-[#F0F4FC] pt-3">
                <div className="flex flex-wrap gap-0.5 bg-slate-100 p-0.5 rounded-lg">
                  {[
                    { id: DocumentCategory.LAB, label: 'Lab Reports', icon: FlaskConical },
                    { id: DocumentCategory.IMAGING, label: 'Imaging', icon: Activity },
                    { id: DocumentCategory.DISCHARGE, label: 'Discharge', icon: FileCheck },
                    { id: DocumentCategory.ALL, label: 'All Docs', icon: Grid3x3 },
                  ].map(cat => (
                    <button key={cat.id} type="button" onClick={() => setDocFilter(cat.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wide transition-all ${
                        docFilter === cat.id ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'
                      }`}>
                      <cat.icon size={9} />{cat.label}
                    </button>
                  ))}
                </div>
                <div className="relative shrink-0">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search files..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="pl-7 pr-3 py-1.5 text-[10px] rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-300 outline-none w-full sm:w-44 transition-all" />
                </div>
              </div>
            </div>

            {/* Document list cards */}
            {filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center bg-white rounded-xl border border-dashed border-[#DDE3F0]">
                <FileText size={28} className="text-slate-300 animate-pulse" />
                <div>
                  <p className="text-[10px] font-black text-slate-600">No documents found</p>
                  <p className="text-[8px] text-slate-400 mt-0.5">Nothing matches the selected filters.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredDocs.map(doc => {
                  const { bg, fg } = docColor(doc);
                  const isSelected = selectedDoc && getId(selectedDoc) === getId(doc);
                  return (
                    <div key={getId(doc)} className={`bg-white border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 group relative ${
                      isSelected ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-[#DDE3F0]'
                    }`}>
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ background: bg }}>
                          <DocIcon doc={doc} className="w-4 h-4" style={{ color: fg }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black text-[#0F1A3A] truncate leading-tight group-hover:text-blue-600 transition-colors" title={doc.fileName || doc.name}>{doc.fileName || doc.name || 'Document'}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            <span className="text-[7px] font-black uppercase tracking-wider bg-slate-100 text-[#4B5A7A] px-1.5 py-0.5 rounded-full border border-slate-200">{(doc.type || 'FILE').replace(/_/g, ' ')}</span>
                            <span className="text-[7px] font-bold text-slate-400 py-0.5">{fmtDate(doc.date)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {doc.notes && (
                        <p className="text-[9px] text-[#4B5A7A] line-clamp-2 italic bg-slate-50 border-l-2 border-blue-500 pl-2 py-0.5 rounded">{doc.notes}</p>
                      )}

                      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-0.5">
                        <div className="flex items-center gap-1">
                          {canEditProp && (
                            <>
                              <button onClick={() => setModal({ type: 'documents', item: doc })} className="p-1 text-slate-400 hover:text-amber-600 hover:bg-slate-50 rounded-lg transition-colors" title="Edit Metadata"><Edit3 size={11} /></button>
                              <button onClick={() => handleDelete('documents', doc)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg transition-colors" title="Delete Document"><Trash2 size={11} /></button>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectDoc(doc)}
                          className="flex items-center gap-1 bg-[#1A3C8F] hover:bg-[#0F2660] text-white text-[9px] font-black px-3 py-1.5 rounded-lg shadow-xs transition-all animate-pulse-slow"
                        >
                          <Eye size={10} /> View Report
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        </div>
      </div>

      {/* ══════════════ RIGHT PANEL — Document & Lab Report Viewer ══════════════ */}
      <div className={`flex flex-col flex-1 overflow-hidden bg-[#F4F7FB] transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50 animate-fade-in' : ''}`}>

        {selectedDoc ? (
          <>
            {/* Header when document is selected */}
            <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-xs z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow shrink-0">
                  <FileDigit size={15} className="text-white" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-slate-800 tracking-tight block truncate" title={selectedDoc.fileName || selectedDoc.name}>
                    {selectedDoc.fileName || selectedDoc.name}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 block mt-0.5">
                    {fmtDate(selectedDoc.date)} · <span className="uppercase text-[7px] font-black tracking-wider bg-slate-100 text-[#4B5A7A] px-1.5 py-0.5 rounded-full border border-slate-200">{(selectedDoc.type || 'FILE').replace(/_/g, ' ')}</span>
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                {canEditProp && (
                  <button
                    type="button"
                    onClick={openAddDocumentModal}
                    className="flex items-center gap-1 bg-[#C8102E] hover:bg-[#9B0A21] text-white rounded-lg px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all shadow-sm"
                    title="Add Document"
                  >
                    <Plus size={11} /> Add
                  </button>
                )}
                {previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-all"
                    title="Download Report"
                  >
                    <Download size={13} />
                  </a>
                )}
                {previewUrl && (
                  <button
                    onClick={() => {
                      const printWindow = window.open(previewUrl, '_blank');
                      if (printWindow) {
                        printWindow.addEventListener('load', () => {
                          printWindow.print();
                        });
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all"
                    title="Print Report"
                  >
                    <Printer size={13} />
                  </button>
                )}
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
                <button
                  onClick={() => {
                    setSelectedDoc(null);
                    setPreviewUrl(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all ml-1 border border-slate-100"
                  title="Close Document"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Document display viewport */}
            <div className="flex-1 bg-slate-200 overflow-hidden flex flex-col relative">
              {loadingUrl ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#F4F7FB]">
                  <Loader2 className="text-[#1A3C8F] animate-spin" size={28} />
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Retrieving Report...</p>
                    <p className="text-[9px] text-slate-400 mt-1">Decrypting secure file from patient history vault...</p>
                  </div>
                </div>
              ) : !previewUrl ? (
                <div className="flex-1 flex items-center justify-center p-6 bg-[#F4F7FB]">
                  <div className="max-w-xs w-full bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center flex flex-col items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100 text-amber-600 shadow-xs">
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wider">Vault Decryption Required</h3>
                      <p className="text-[9px] text-[#4B5A7A] mt-2 leading-relaxed">
                        This file is sealed inside the Health Vault. Your current browser session may need a direct signature to render it inline.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => viewSecureDocument(dispatch, patientId, getId(selectedDoc))}
                      className="w-full flex items-center justify-center gap-1.5 bg-[#1A3C8F] hover:bg-[#0F2660] text-white text-[9px] font-black py-2 rounded-lg transition-all shadow-xs"
                    >
                      <ExternalLink size={11} /> Open in Secure Window
                    </button>
                  </div>
                </div>
              ) : isImageFile(selectedDoc) ? (
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-200" style={{ scrollbarWidth: 'thin' }}>
                  <img
                    src={previewUrl}
                    alt={selectedDoc.fileName || selectedDoc.name || 'Medical Preview'}
                    className="max-w-full max-h-full object-contain rounded shadow-md border border-slate-300 bg-white"
                  />
                </div>
              ) : (
                <div className="flex-1 w-full h-full p-2 bg-slate-200">
                  <iframe
                    src={`${previewUrl}#toolbar=1&view=FitH`}
                    className="w-full h-full border border-slate-300 rounded shadow-md bg-white"
                    title={selectedDoc.fileName || selectedDoc.name || 'PDF Document'}
                  />
                </div>
              )}
            </div>

            {/* Collapsible Provider Notes */}
            {selectedDoc.notes && (
              <div className="shrink-0 bg-white border-t border-slate-200 p-3 shadow-md flex items-start gap-2.5 z-10">
                <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <FileText size={11} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black text-slate-800 uppercase tracking-wider leading-none">Clinical Provider Notes</p>
                  <p className="text-[9px] text-[#4B5A7A] mt-1.5 italic leading-relaxed">{selectedDoc.notes}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#F4F7FB] relative overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-100/30 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-100/30 rounded-full blur-3xl" />
            
            <div className="max-w-xs w-full text-center flex flex-col items-center gap-4 relative z-10">
              {/* Animated icon circle */}
              <div className="w-14 h-14 rounded-2xl bg-white border border-[#DDE3F0] flex items-center justify-center shadow-md relative group hover:scale-105 transition-transform duration-300">
                <div className="absolute inset-0 rounded-2xl bg-blue-500/5 animate-ping" />
                <FileText className="text-[#1A3C8F] animate-pulse-slow" size={24} />
              </div>
              
              <div>
                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Medical Document Workspace</h3>
                <p className="text-[9px] text-[#4B5A7A] mt-2.5 leading-relaxed">
                  Select any clinical document, lab report, imaging study, or discharge summary from the clinical dashboard on the left to preview its high-resolution PDF or image here instantly.
                </p>
              </div>

              {canEditProp && (
                <button
                  type="button"
                  onClick={openAddDocumentModal}
                  className="flex items-center justify-center gap-1.5 bg-[#C8102E] hover:bg-[#9B0A21] text-white text-[9px] font-black uppercase tracking-wider px-4 py-2 rounded-lg transition-all shadow-sm"
                >
                  <Plus size={12} /> Add Document
                </button>
              )}
              
              {/* Simple step indicators */}
              <div className="w-full border-t border-slate-200/60 pt-4 mt-1 flex flex-col gap-2">
                <div className="flex items-center gap-2.5 text-left bg-white/60 border border-slate-100 rounded-lg p-2 shadow-xs">
                  <span className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 text-[8px] font-black flex items-center justify-center shrink-0 border border-blue-100">1</span>
                  <p className="text-[8px] font-bold text-slate-600">Select <span className="font-black text-slate-800">Documents</span> tab in the clinical panel</p>
                </div>
                <div className="flex items-center gap-2.5 text-left bg-white/60 border border-slate-100 rounded-lg p-2 shadow-xs">
                  <span className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 text-[8px] font-black flex items-center justify-center shrink-0 border border-blue-100">2</span>
                  <p className="text-[8px] font-bold text-slate-600">Click <span className="font-black text-slate-800">"View Report"</span> on any record card</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
