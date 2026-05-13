import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  clearHistory,
  createAdmission,
  createCondition,
  createDocument,
  createEncounter,
  createLabResult,
  createMedication,
  deleteAdmission,
  deleteCondition,
  deleteDocument,
  deleteEncounter,
  deleteLabResult,
  deleteMedication,
  fetchAllPatientHistory,
  searchPatients,
  selectAdmissions,
  selectConditions,
  selectCurrentPatientId,
  selectDocuments,
  selectEncounters,
  selectHistoryError,
  selectHistoryLoading,
  selectHistorySummary,
  selectLabResults,
  selectMedications,
  selectPatientSearchLoading,
  selectPatientSearchResults,
  selectTimeline,
  setCurrentPatientId,
  updateAdmission,
  updateCondition,
  updateDocument,
  updateEncounter,
  updateLabResult,
  updateMedication,
} from '../store/slices/patientHistorySlice';
import { addToast } from '../store/slices/uiSlice';
import { selectUser } from '../store/slices/authSlice';
import client from '../api/client';
import {
  Activity,
  AlertCircle,
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  FlaskConical,
  HeartPulse,
  Loader2,
  MapPin,
  Paperclip,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Stethoscope,
  Tag,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react';

const getId = (item) => item?.id || item?.conditionId || item?.medicationId || item?.encounterId || item?.admissionId || item?.labResultId || item?.documentId;
const timelineKey = (item, index) => [
  item?.eventType || item?.type || 'event',
  item?.sourceId || getId(item) || item?.title || 'unknown',
  item?.date || item?.eventDate || item?.timestamp || 'no-date',
  index,
].join(':');
const text = (value, fallback = 'Not recorded') => (value === 0 || value ? String(value) : fallback);
const date = (value) => value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not recorded';
const isoToday = () => new Date().toISOString().slice(0, 10);

const patientName = (patient) => {
  if (!patient) return 'Select a patient';
  return patient.patientName || patient.name || [patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.email || patient.phone || patient.patientId || patient.id || 'Patient';
};

const patientIdOf = (patient) => patient?.patientId || patient?.id || patient?.userId;

const getFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  return url.startsWith('/') ? url : `/${url}`;
};

const viewSecureDocument = async (patientId, documentId, fileName = '') => {
  if (!documentId || !patientId) return;
  try {
    const res = await client.get(`/api/patients/${patientId}/history/documents/${documentId}/file`, {
      responseType: 'blob',
      hideToast: true,
      withCredentials: false, // Disable credentials to allow redirection to external storage without CORS conflicts
    });

    // Explicitly set MIME type so the browser renders it (e.g., PDF) instead of forcing a download
    let mimeType = res.headers['content-type'];
    if (!mimeType || mimeType.includes('octet-stream') || mimeType.includes('multipart')) {
      const ext = String(fileName).split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg'].includes(ext)) mimeType = 'image/jpeg';
      else if (ext === 'png') mimeType = 'image/png';
      else mimeType = 'application/pdf'; // Default for most medical documents
    }

    const fileBlob = new Blob([res.data], { type: mimeType });
    const url = URL.createObjectURL(fileBlob);
    window.open(url, '_blank');
  } catch (error) {
    console.error('Failed to view document securely', error);
    const message = error.response?.data?.message || 'Unable to open document. It may have been stored on a previous server and is no longer accessible.';
    dispatch(addToast({ type: 'error', message }));
  }
};


const statusClass = (status) => {
  const key = String(status || '').toUpperCase();
  if (['ACTIVE', 'ABNORMAL', 'OPEN', 'ONGOING'].includes(key)) return 'bg-red-50 text-red-700 border-red-100';
  if (['RESOLVED', 'NORMAL', 'STOPPED', 'COMPLETED'].includes(key)) return 'bg-green-50 text-green-700 border-green-100';
  if (['CHRONIC', 'MODERATE'].includes(key)) return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-[#E8EEF8] text-brand-blue border-[#DDE3F0]';
};

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${className}`}>
    {children}
  </span>
);

const EVENT_TYPE_STYLES = {
  CONDITION_DIAGNOSED: { icon: HeartPulse, color: '#C8102E', bg: '#FEE2E2', label: 'Condition Diagnosed' },
  CONDITION_RESOLVED: { icon: Check, color: '#059669', bg: '#D1FAE5', label: 'Condition Resolved' },
  MEDICATION_STARTED: { icon: Pill, color: '#7C3AED', bg: '#F3E8FF', label: 'Medication Started' },
  MEDICATION_STOPPED: { icon: Pill, color: '#6B7280', bg: '#F3F4F6', label: 'Medication Stopped' },
  EPCR_ENCOUNTER: { icon: Stethoscope, color: '#EA580C', bg: '#FFEDD5', label: 'ePCR Encounter' },
  HOSPITAL_ADMISSION: { icon: BedDouble, color: '#0891B2', bg: '#CFFAFE', label: 'Hospital Admission' },
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

const groupTimelineByMonth = (items) => {
  const groups = [];
  let currentLabel = null;
  for (const item of items) {
    const d = item.date || item.eventDate || item.timestamp;
    const label = d ? new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown Date';
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, items: [] });
    }
    groups[groups.length - 1].items.push(item);
  }
  return groups;
};

const TimelineEvent = ({ item, index, isLast, onView }) => {
  const eventType = item.eventType || item.type || '';
  const style = getEventStyle(eventType);
  const Icon = style.icon;
  const eventDate = item.date || item.eventDate || item.timestamp;
  const title = item.title || style.label;
  const desc = item.description;
  const metadata = item.metadata || {};
  const metaEntries = Object.entries(metadata).filter(([, v]) => v && v !== '');

  return (
    <div className="relative flex gap-4">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-[19px] top-[44px] bottom-0 w-[2px]" style={{ background: `linear-gradient(to bottom, ${style.color}40, #DDE3F020)` }} />
      )}
      {/* Icon dot */}
      <div className="relative z-10 shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border-2 border-white" style={{ background: style.bg, color: style.color }}>
          <Icon size={18} />
        </div>
      </div>
      {/* Content card */}
      <div className="flex-1 min-w-0 pb-6">
        <div className="rounded-xl border border-[#DDE3F0] bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider" style={{ background: style.bg, color: style.color }}>
                  <Icon size={11} />
                  {style.label}
                </span>
                {eventDate && (
                  <span className="text-[10px] font-bold text-[#A0AECB] uppercase tracking-wider">{relativeTime(eventDate)}</span>
                )}
              </div>
              <p className="font-bold text-[#0F1A3A] text-[15px] leading-snug mt-1.5">{title}</p>
              {desc && <p className="mt-1.5 text-sm text-[#4B5A7A] leading-relaxed">{desc}</p>}
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2">
              <p className="text-xs font-bold text-[#4B5A7A]">{date(eventDate)}</p>
              {onView && (
                <button type="button" onClick={() => onView(item)} title="View Details" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#DDE3F0] bg-white text-[#8A97B0] transition hover:border-brand-blue hover:text-brand-blue hover:shadow-sm">
                  <Eye size={14} />
                </button>
              )}
            </div>
          </div>
          {/* Metadata tags */}
          {metaEntries.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#F0F4FC] flex flex-wrap gap-2">
              {metaEntries.map(([key, value]) => (
                <span key={key} className="inline-flex items-center gap-1 rounded-lg bg-[#F8FAFF] border border-[#EEF2FF] px-2.5 py-1 text-[10px] font-bold text-[#4B5A7A]">
                  <Tag size={9} className="text-[#A0AECB]" />
                  <span className="text-[#A0AECB]">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}:</span>
                  {String(value).substring(0, 40)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function TimelineViewModal({ item, onClose }) {
  const eventType = item.eventType || item.type || '';
  const style = getEventStyle(eventType);
  const Icon = style.icon;
  const eventDate = item.date || item.eventDate || item.timestamp;
  const title = item.title || style.label;
  const desc = item.description;
  const metadata = item.metadata || {};
  const metaEntries = Object.entries(metadata).filter(([, v]) => v && v !== '');

  const allFields = [
    ['Event Type', style.label],
    ['Title', title],
    ['Date', eventDate ? new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : null],
    ['Relative Time', relativeTime(eventDate)],
    ['Description', desc],
    ['Source ID', item.sourceId],
    ['Patient ID', item.patientId],
    ['Condition ID', item.conditionId],
    ...metaEntries.map(([key, value]) => [key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), String(value)]),
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#DDE3F0] bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: style.bg, color: style.color }}>
              <Icon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#0F1A3A]">Event Details</h3>
              <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider mt-0.5" style={{ background: style.bg, color: style.color }}>
                {style.label}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} title="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#DDE3F0] bg-white text-[#8A97B0] transition hover:border-brand-blue hover:text-brand-blue">
            <X size={17} />
          </button>
        </div>
        {/* Body */}
        <div className="p-6 space-y-3">
          {allFields.filter(([, v]) => v !== null && v !== undefined && v !== '').map(([label, value]) => (
            <div key={label} className="bg-[#F8FAFF] p-3 rounded-xl border border-[#DDE3F0]">
              <p className="text-[10px] font-bold text-[#A0AECB] uppercase tracking-wider mb-1">{label}</p>
              <p className="text-sm font-bold text-[#0F1A3A] whitespace-pre-wrap break-words">{String(value)}</p>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="flex justify-end border-t border-[#DDE3F0] px-6 py-4">
          <button type="button" onClick={onClose} className="btn-primary">Close</button>
        </div>
      </div>
    </div>
  );
}

const IconButton = ({ title, children, className = '', ...props }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#DDE3F0] bg-white text-[#8A97B0] transition hover:border-brand-blue hover:text-brand-blue ${className}`}
    {...props}
  >
    {children}
  </button>
);

const Section = ({ icon: Icon, title, action, children }) => (
  <section className="bg-white border border-[#DDE3F0] rounded-2xl shadow-sm overflow-hidden">
    <div className="flex items-center justify-between gap-3 border-b border-[#DDE3F0] px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#E8EEF8] text-brand-blue flex items-center justify-center">
          <Icon size={19} />
        </div>
        <h2 className="text-base font-bold text-[#0F1A3A]">{title}</h2>
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

const Empty = ({ children }) => (
  <div className="rounded-xl border border-dashed border-[#DDE3F0] bg-[#F8FAFF] px-4 py-8 text-center text-sm font-semibold text-[#8A97B0]">
    {children}
  </div>
);

const field = (name, label, type = 'text', options = {}) => ({ name, label, type, ...options });

const FORM_CONFIG = {
  conditions: {
    title: 'Condition',
    subtitle: 'Complete all required fields to save the condition',
    create: createCondition,
    update: updateCondition,
    defaults: { name: '', status: 'ACTIVE', severity: '', dateDiagnosed: isoToday(), dateResolved: '', notes: '' },
    fields: [
      field('name', 'Condition Name', 'text', { required: true, placeholder: 'e.g., Hypertension, Diabetes' }),
      field('status', 'Status', 'select', { options: ['ACTIVE', 'RESOLVED', 'CHRONIC'], required: true }),
      field('severity', 'Severity Level', 'text', { placeholder: 'e.g., Mild, Moderate, Severe' }),
      field('dateDiagnosed', 'Date Diagnosed', 'date', { required: true }),
      field('dateResolved', 'Date Resolved', 'date', { placeholder: 'Leave empty if ongoing' }),
      field('notes', 'Additional Notes', 'textarea', { placeholder: 'Any relevant clinical information...' }),
    ],
    sections: [
      { title: 'Condition Information', fieldNames: ['name', 'status', 'severity'] },
      { title: 'Timeline', fieldNames: ['dateDiagnosed', 'dateResolved'] },
      { title: 'Additional Notes', fieldNames: ['notes'] },
    ],
  },
  medications: {
    title: 'Medication',
    subtitle: 'Complete all required fields to save the medication',
    create: createMedication,
    update: updateMedication,
    defaults: { conditionId: '', name: '', dosage: '', frequency: '', status: 'ACTIVE', startDate: isoToday(), endDate: '', notes: '' },
    fields: [
      field('name', 'Medication Name', 'text', { required: true, placeholder: 'e.g., Metformin, Lisinopril' }),
      field('dosage', 'Dosage', 'text', { placeholder: 'e.g., 500mg, 2 tablets' }),
      field('frequency', 'Frequency', 'text', { placeholder: 'e.g., Twice daily, Every 8 hours' }),
      field('status', 'Status', 'select', { options: ['ACTIVE', 'STOPPED', 'COMPLETED'], required: true }),
      field('startDate', 'Start Date', 'date', { required: true }),
      field('endDate', 'End Date', 'date', { placeholder: 'Leave empty if ongoing' }),
      field('conditionId', 'Related Condition (Optional)', 'text', { placeholder: 'Condition ID this medication treats' }),
      field('notes', 'Additional Notes', 'textarea', { placeholder: 'Side effects, warnings, or special instructions...' }),
    ],
    sections: [
      { title: 'Medication Details', fieldNames: ['name', 'dosage', 'frequency', 'status'] },
      { title: 'Duration', fieldNames: ['startDate', 'endDate'] },
      { title: 'Linked Condition', fieldNames: ['conditionId'] },
      { title: 'Additional Notes', fieldNames: ['notes'] },
    ],
  },
  encounters: {
    title: 'Encounter',
    subtitle: 'Complete all required fields to save the encounter',
    create: createEncounter,
    update: updateEncounter,
    defaults: { conditionId: '', epcrRecordId: '', date: isoToday(), chiefComplaint: '', outcome: '', activeConditionIds: '', notes: '' },
    transform: (data) => ({ ...data, activeConditionIds: String(data.activeConditionIds || '').split(',').map((x) => x.trim()).filter(Boolean) }),
    fromExisting: (data) => ({ ...data, activeConditionIds: Array.isArray(data.activeConditionIds) ? data.activeConditionIds.join(', ') : data.activeConditionIds || '' }),
    fields: [
      field('date', 'Date of Encounter', 'date', { required: true }),
      field('chiefComplaint', 'Chief Complaint', 'text', { required: true, placeholder: 'e.g., Chest pain, Shortness of breath' }),
      field('outcome', 'Outcome', 'text', { placeholder: 'e.g., Discharged, Admitted, Referred' }),
      field('epcrRecordId', 'EPCR Record ID (Optional)', 'text', { placeholder: 'Emergency Patient Care Record ID' }),
      field('conditionId', 'Related Condition (Optional)', 'text', { placeholder: 'Condition ID' }),
      field('activeConditionIds', 'Active Conditions (Optional)', 'text', { placeholder: 'Comma-separated condition IDs' }),
      field('notes', 'Clinical Notes', 'textarea', { placeholder: 'Assessment, treatment provided, patient response...' }),
    ],
    sections: [
      { title: 'Encounter Details', fieldNames: ['date', 'chiefComplaint', 'outcome'] },
      { title: 'Linked Records', fieldNames: ['epcrRecordId', 'conditionId', 'activeConditionIds'] },
      { title: 'Clinical Notes', fieldNames: ['notes'] },
    ],
  },
  admissions: {
    title: 'Hospital Admission',
    subtitle: 'Complete all required fields to save the admission',
    create: createAdmission,
    update: updateAdmission,
    defaults: { conditionId: '', hospital: '', admitDate: isoToday(), dischargeDate: '', reason: '', outcome: '' },
    fields: [
      field('hospital', 'Hospital/Facility Name', 'text', { required: true, placeholder: 'e.g., General Medical Center' }),
      field('admitDate', 'Admission Date', 'date', { required: true }),
      field('dischargeDate', 'Discharge Date', 'date', { placeholder: 'Leave empty if patient still admitted' }),
      field('reason', 'Reason for Admission', 'text', { placeholder: 'e.g., Pneumonia, Surgery, Observation' }),
      field('outcome', 'Discharge Outcome', 'text', { placeholder: 'e.g., Improved, Stable, Refer to specialist' }),
      field('conditionId', 'Related Condition (Optional)', 'text', { placeholder: 'Condition ID' }),
    ],
    sections: [
      { title: 'Facility Information', fieldNames: ['hospital'] },
      { title: 'Admission Timeline', fieldNames: ['admitDate', 'dischargeDate'] },
      { title: 'Details', fieldNames: ['reason', 'outcome', 'conditionId'] },
    ],
  },
  labResults: {
    title: 'Lab Result',
    subtitle: 'Complete all required fields to save the lab result',
    create: createLabResult,
    update: updateLabResult,
    defaults: { conditionId: '', testName: '', value: '', unit: '', normalRange: '', date: isoToday(), interpretation: '' },
    fields: [
      field('testName', 'Test Name', 'text', { required: true, placeholder: 'e.g., Blood Glucose, Hemoglobin A1C' }),
      field('value', 'Result Value', 'text', { required: true, placeholder: 'e.g., 145' }),
      field('unit', 'Unit of Measurement', 'text', { placeholder: 'e.g., mg/dL, g/dL' }),
      field('normalRange', 'Normal Range', 'text', { placeholder: 'e.g., 70-100 mg/dL' }),
      field('interpretation', 'Interpretation', 'text', { placeholder: 'e.g., High, Low, Normal' }),
      field('date', 'Test Date', 'date', { required: true }),
      field('conditionId', 'Related Condition (Optional)', 'text', { placeholder: 'Condition ID' }),
    ],
    sections: [
      { title: 'Test Information', fieldNames: ['testName', 'date'] },
      { title: 'Results', fieldNames: ['value', 'unit', 'normalRange', 'interpretation'] },
      { title: 'Linked Condition', fieldNames: ['conditionId'] },
    ],
  },
  documents: {
    title: 'Medical Document',
    subtitle: 'Complete all required fields to save the document',
    create: createDocument,
    update: updateDocument,
    defaults: { conditionId: '', encounterId: '', admissionId: '', type: 'LAB_REPORT', fileName: '', fileUrl: '', date: isoToday(), notes: '', file: null },
    isDocument: true,
    transform: (data, isUpdate) => {
      if (data.file instanceof File) {
        // → multipart PUT /history/documents/{id}  (or multipart POST for create)
        const fd = new FormData();
        fd.append('file', data.file);
        if (data.type) fd.append('type', data.type);
        if (data.date) fd.append('date', data.date);
        if (data.conditionId) fd.append('conditionId', data.conditionId);
        if (data.encounterId) fd.append('encounterId', data.encounterId);
        if (data.admissionId) fd.append('admissionId', data.admissionId);
        if (data.notes) fd.append('notes', data.notes);
        if (data.fileName) fd.append('fileName', data.fileName);
        return fd;
      }
      // → JSON-only PUT (metadata update, no file replacement)
      // Only return JSON if it's an update and no file is present
      if (isUpdate) {
        const { file, ...rest } = data;
        return rest;
      }
      // For create, if file is missing, the backend will throw error anyway
      return data;
    },
    fields: [
      field('type', 'Document Type', 'select', { options: ['LAB_REPORT', 'DISCHARGE_SUMMARY', 'IMAGING', 'OTHER'], required: true }),
      field('date', 'Document Date', 'date', { required: true }),
      field('notes', 'Summary or Notes', 'textarea', { placeholder: 'Key findings, recommendations, or important details...' }),
      field('conditionId', 'Related Condition (Optional)', 'text', { placeholder: 'Condition ID' }),
      field('encounterId', 'Related Encounter (Optional)', 'text', { placeholder: 'Encounter ID' }),
      field('admissionId', 'Related Admission (Optional)', 'text', { placeholder: 'Admission ID' }),
    ],
    sections: [
      { title: 'Document Details', fieldNames: ['type', 'date'] },
      { title: 'Summary', fieldNames: ['notes'] },
      { title: 'Linked Records', fieldNames: ['conditionId', 'encounterId', 'admissionId'] },
    ],
  },
};

function HistoryModal({ type, item, patientId, onClose }) {
  const dispatch = useDispatch();
  const config = FORM_CONFIG[type];
  const conditions = useSelector(selectConditions) || [];
  const encounters = useSelector(selectEncounters) || [];
  const admissions = useSelector(selectAdmissions) || [];
  const [form, setForm] = useState(() => {
    const existing = item && config.fromExisting ? config.fromExisting(item) : item;
    return { ...config.defaults, ...(existing || {}) };
  });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = config.transform ? config.transform(form, !!item) : form;
    const action = item
      ? config.update({ patientId, id: getId(item), data: payload })
      : config.create({ patientId, data: payload });
    const res = await dispatch(action);
    setSaving(false);
    if (!res.error) {
      dispatch(addToast({ type: 'success', message: `${config.title} ${item ? 'updated' : 'created'}` }));
      onClose();
    }
  };

  const isDoc = config.isDocument;
  const [dragOver, setDragOver] = useState(false);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) setForm((prev) => ({ ...prev, file: f }));
  };

  const fieldMap = {};
  config.fields.forEach((f) => { fieldMap[f.name] = f; });

  const inputCls = 'w-full bg-slate-50 border-2 border-slate-200 px-5 py-4 text-sm text-brand-blue focus:border-brand-blue outline-none transition-all font-black uppercase';
  const inputReqCls = 'w-full bg-white border-2 border-brand-blue/30 px-5 py-4 text-sm text-brand-blue focus:border-brand-blue outline-none transition-all font-black uppercase';
  const labelCls = 'text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1';
  const labelReqCls = 'text-[9px] font-black text-brand-blue uppercase tracking-widest mb-2 block ml-1 after:content-["*"] after:ml-1 after:text-brand-red';

  const renderField = (f) => {
    const cls = f.required ? inputReqCls : inputCls;
    if (f.name === 'conditionId') return (
      <select value={form[f.name] || ''} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className={inputCls}>
        <option value="">SELECT</option>
        {conditions.map((c) => <option key={getId(c)} value={getId(c)}>{c.name} ({date(c.dateDiagnosed)})</option>)}
      </select>
    );
    if (f.name === 'encounterId') return (
      <select value={form[f.name] || ''} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className={inputCls}>
        <option value="">SELECT</option>
        {encounters.map((enc) => <option key={getId(enc)} value={getId(enc)}>{date(enc.date)} — {enc.chiefComplaint}</option>)}
      </select>
    );
    if (f.name === 'admissionId') return (
      <select value={form[f.name] || ''} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className={inputCls}>
        <option value="">SELECT</option>
        {admissions.map((adm) => <option key={getId(adm)} value={getId(adm)}>{date(adm.admitDate)} — {adm.hospital}</option>)}
      </select>
    );
    if (f.type === 'select') return (
      <select value={form[f.name] || ''} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className={f.required ? inputReqCls : inputCls}>
        <option value="">SELECT</option>
        {f.options.map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
      </select>
    );
    if (f.type === 'textarea') return (
      <textarea rows={3} value={form[f.name] || ''} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className={cls + ' resize-none'} placeholder={f.placeholder} />
    );
    return <input type={f.type} required={f.required} value={form[f.name] || ''} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className={cls} placeholder={f.placeholder} />;
  };

  const sections = config.sections || [{ title: config.title, fieldNames: config.fields.map((f) => f.name) }];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white shadow-2xl overflow-hidden">
        {/* ── Header ── */}
        <div className="shrink-0 flex items-center justify-between border-b-2 border-slate-100 bg-white px-10 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-blue flex items-center justify-center text-white">
              <Plus size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-brand-blue uppercase tracking-tighter">
                {item ? 'Edit' : 'New'} <span className="text-brand-red">{config.title}</span>
              </h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                {config.subtitle || 'Complete all required fields'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-brand-red transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-10 py-8">
          {/* Document file upload zone — shown only for document type */}
          {isDoc && (
            <div className="mb-10">
              {/* Current file banner */}
              {item && (item.fileUrl || item.fileName) && !form.file && (
                <div className="mb-4 flex items-center gap-4 border-2 border-slate-100 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-brand-blue text-white">
                    <Paperclip size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current file</p>
                    <p className="truncate text-sm font-black text-brand-blue uppercase">{item.fileName || 'Stored document'}</p>
                  </div>
                  {item.fileUrl && (
                    <button type="button" onClick={() => viewSecureDocument(patientId, getId(item), item.fileName || item.fileUrl)} className="text-[9px] font-black text-brand-red uppercase tracking-widest hover:underline shrink-0 flex items-center gap-1">
                      View <ExternalLink size={12} />
                    </button>
                  )}
                </div>
              )}

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-10 transition-colors ${dragOver ? 'border-brand-blue bg-blue-50' : form.file ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-slate-50 hover:border-brand-blue'}`}
              >
                <input
                  type="file"
                  id="doc-file-input"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={(e) => setForm((prev) => ({ ...prev, file: e.target.files[0] || null }))}
                />
                {form.file ? (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center bg-green-500 text-white">
                      <Check size={24} />
                    </div>
                    <p className="text-sm font-black text-brand-blue uppercase">{form.file.name}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{(form.file.size / 1024).toFixed(1)} KB</p>
                    <button type="button" onClick={() => setForm((prev) => ({ ...prev, file: null }))} className="text-[9px] font-black text-brand-red uppercase tracking-widest hover:underline flex items-center gap-1">
                      <X size={12} /> Remove
                    </button>
                  </>
                ) : (
                  <>
                    <div className={`flex h-12 w-12 items-center justify-center ${dragOver ? 'bg-brand-blue text-white' : 'bg-slate-200 text-slate-400'}`}>
                      <Upload size={24} />
                    </div>
                    <p className="text-sm font-black text-brand-blue uppercase">{dragOver ? 'Drop to upload' : 'Drag & drop or click to browse'}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {item ? 'Upload replacement file or leave empty for metadata only' : 'PDF, PNG, JPG, JPEG, DOC, DOCX'}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Sectioned Fields ── */}
          <div className="space-y-10">
            {sections.map((section, sIdx) => {
              const sectionFields = section.fieldNames.map((name) => fieldMap[name]).filter(Boolean);
              if (sectionFields.length === 0) return null;
              return (
                <div key={section.title}>
                  {/* Section header — red bar + uppercase title */}
                  <div className="flex items-center gap-4 pb-4 border-b-2 border-slate-100 mb-8">
                    <div className="w-1.5 h-6 bg-brand-red" />
                    <h3 className="text-xl font-black text-brand-blue uppercase tracking-tighter">{section.title}</h3>
                  </div>

                  {/* Fields grid — 2-column like ePCR */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sectionFields.map((f) => (
                      <div key={f.name} className={`space-y-2 ${f.type === 'textarea' ? 'md:col-span-2 lg:col-span-3' : ''}`}>
                        <label className={f.required ? labelReqCls : labelCls}>{f.label}</label>
                        {renderField(f)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 flex justify-between items-center border-t-2 border-slate-100 px-10 py-5 bg-white">
          <button type="button" onClick={onClose} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-2 border-slate-200 hover:border-brand-blue hover:text-brand-blue transition-all">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="bg-brand-red text-white px-10 py-4 font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-brand-blue transition-all disabled:opacity-50 shadow-xl">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {saving ? 'Saving...' : item && isDoc ? (form.file ? 'Replace & Save' : 'Save Metadata') : `Save ${config.title}`}
          </button>
        </div>
      </form>
    </div>
  );
}

function ViewModal({ type, item, onClose }) {
  const config = FORM_CONFIG[type];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#DDE3F0] bg-white px-6 py-4">
          <h3 className="text-lg font-black text-[#0F1A3A]">{config.title} Details</h3>
          <IconButton title="Close" onClick={onClose}><X size={17} /></IconButton>
        </div>
        <div className="p-6 space-y-4">
          {config.fields.map(f => {
            if (f.type === 'file') return null;
            let val = item[f.name];
            if (f.type === 'date' && val) val = new Date(val).toLocaleDateString();
            return (
              <div key={f.name} className="bg-[#F8FAFF] p-3 rounded-xl border border-[#DDE3F0]">
                <p className="text-[10px] font-bold text-[#A0AECB] uppercase tracking-wider mb-1">{f.label}</p>
                <p className="text-sm font-bold text-[#0F1A3A] whitespace-pre-wrap">{val !== undefined && val !== null && val !== '' ? String(val) : '—'}</p>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end border-t border-[#DDE3F0] px-6 py-4">
          <button type="button" onClick={onClose} className="btn-primary">Close</button>
        </div>
      </div>
    </div>
  );
}

function PatientSearchPanel({ selectedPatientId, onSelect }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const results = useSelector(selectPatientSearchResults);
  const searching = useSelector(selectPatientSearchLoading);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(20);

  const runSearch = (event) => {
    event?.preventDefault();
    dispatch(searchPatients({ query: query.trim(), limit }));
  };

  return (
    <Section icon={Search} title="Find Patient">
      <form onSubmit={runSearch} className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_120px_auto]">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0AECB]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="input pl-10 py-3 text-sm" placeholder="Search by name, phone, or email..." />
        </div>
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="input py-3 text-sm">
          {[10, 20, 50].map((n) => <option key={n} value={n}>{n} results</option>)}
        </select>
        <button type="submit" className="btn-primary justify-center">
          {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Search
        </button>
      </form>

      <div className="mt-4 overflow-hidden rounded-xl border border-[#DDE3F0]">
        {results.length === 0 ? (
          <Empty>Enter a patient name, phone number, or email to search. Select a patient to view their complete medical history.</Empty>
        ) : (
          <div className="divide-y divide-[#DDE3F0]">
            {results.map((patient) => {
              const id = patientIdOf(patient);
              const active = id === selectedPatientId;
              return (
                <button
                  type="button"
                  key={id || patient.email || patient.phone}
                  onClick={() => {
                    onSelect(id);
                    if (id) navigate(`/patient-history/${id}`);
                  }}
                  className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition ${active ? 'bg-[#E8EEF8]' : 'bg-white hover:bg-[#F8FAFF]'}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#0F1A3A]">{patientName(patient)}</p>
                    <p className="truncate text-xs font-semibold text-[#8A97B0]">{text(patient.email, '')} {patient.phone ? `- ${patient.phone}` : ''}</p>
                  </div>
                  <Badge className={active ? 'bg-white text-brand-blue border-brand-blue/20' : 'bg-[#F8FAFF] text-[#4B5A7A] border-[#DDE3F0]'}>
                    {text(id, 'No ID')}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Section>
  );
}

function RowActions({ type, item, patientId, canEdit, onEdit, onView }) {
  const dispatch = useDispatch();
  const config = {
    conditions: deleteCondition,
    medications: deleteMedication,
    encounters: deleteEncounter,
    admissions: deleteAdmission,
    labResults: deleteLabResult,
    documents: deleteDocument,
  };

  const remove = async () => {
    if (!window.confirm(`Delete this ${FORM_CONFIG[type].title.toLowerCase()}?`)) return;
    const res = await dispatch(config[type]({ patientId, id: getId(item) }));
    if (!res.error) dispatch(addToast({ type: 'success', message: `${FORM_CONFIG[type].title} deleted` }));
  };

  return (
    <div className="flex shrink-0 gap-2">
      <IconButton title="View Details" onClick={() => onView(type, item)}><Eye size={15} /></IconButton>
      {canEdit && (
        <>
          <IconButton title="Edit" onClick={() => onEdit(type, item)}><Edit3 size={15} /></IconButton>
          <IconButton title="Delete" onClick={remove} className="hover:border-red-200 hover:text-red-600"><Trash2 size={15} /></IconButton>
        </>
      )}
    </div>
  );
}

function PatientHistory() {
  const { patientId: routePatientId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const summary = useSelector(selectHistorySummary);
  const timeline = useSelector(selectTimeline);
  const conditions = useSelector(selectConditions);
  const medications = useSelector(selectMedications);
  const encounters = useSelector(selectEncounters);
  const admissions = useSelector(selectAdmissions);
  const labResults = useSelector(selectLabResults);
  const documents = useSelector(selectDocuments);
  const loading = useSelector(selectHistoryLoading);
  const error = useSelector(selectHistoryError);
  const currentPatientId = useSelector(selectCurrentPatientId);
  const [tab, setTab] = useState('overview');
  const [modal, setModal] = useState(null);
  const [viewModal, setViewModal] = useState(null);
  const [timelineViewItem, setTimelineViewItem] = useState(null);

  const patientId = routePatientId || (user?.role === 'PATIENT' ? user?.patientId || user?.id : currentPatientId);
  const canSearch = user?.role !== 'PATIENT';
  const canEdit = ['ADMIN', 'PARAMEDIC'].includes(user?.role);

  useEffect(() => {
    if (patientId) {
      dispatch(setCurrentPatientId(patientId));
      dispatch(fetchAllPatientHistory(patientId));
    }
    return () => dispatch(clearHistory());
  }, [dispatch, patientId]);

  const counts = useMemo(() => ({
    activeConditions: conditions.filter((c) => c.status === 'ACTIVE').length,
    medications: medications.length,
    encounters: encounters.length,
    labs: labResults.length,
    admissions: admissions.length,
    documents: documents.length,
  }), [admissions.length, conditions, documents.length, encounters.length, labResults.length, medications.length]);

  const tabs = [
    ['overview', 'Overview', Activity],
    ['conditions', 'Conditions', HeartPulse],
    ['medications', 'Medications', Pill],
    ['encounters', 'Encounters', UserRound],
    ['admissions', 'Admissions', BedDouble],
    ['labResults', 'Labs', FlaskConical],
    ['documents', 'Documents', FileText],
    ['timeline', 'Timeline', Clock],
  ];

  const addButton = (type) => canEdit ? (
    <button type="button" onClick={() => setModal({ type })} className="btn-primary px-4 py-2 text-xs">
      <Plus size={15} /> Add
    </button>
  ) : null;

  const renderList = (type, items, render) => (
    items.length === 0 ? <Empty>No {FORM_CONFIG[type].title.toLowerCase()} records found.</Empty> : (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={getId(item) || JSON.stringify(item)} className="flex items-start justify-between gap-4 rounded-xl border border-[#DDE3F0] bg-[#F8FAFF] p-4">
            <div className="min-w-0 flex-1">{render(item)}</div>
            <RowActions type={type} item={item} patientId={patientId} canEdit={canEdit} onEdit={(t, i) => setModal({ type: t, item: i })} onView={(t, i) => setViewModal({ type: t, item: i })} />
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label mb-1">Patient History</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A3A]">Complete Medical Record</h1>
          <p className="mt-1 text-sm font-medium text-[#8A97B0]">
            {patientId ? `Patient ID: ${patientId}` : 'Search for a patient to view their medical history.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {patientId && (
            <button type="button" onClick={() => dispatch(fetchAllPatientHistory(patientId))} className="btn-outline px-4 py-2">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          )}
          {canSearch && patientId && (
            <button type="button" onClick={() => { dispatch(clearHistory()); navigate('/patient-history'); }} className="btn-ghost">
              Change Patient
            </button>
          )}
        </div>
      </div>

      {canSearch && !routePatientId && (
        <PatientSearchPanel selectedPatientId={patientId} onSelect={(id) => dispatch(setCurrentPatientId(id))} />
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {!patientId ? (
        <Empty>👤 Select a patient to begin. Use the search above to find a patient by name, phone, or email, then view their complete medical record including conditions, medications, lab results, and documents.</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            {[
              ['Active Conditions', counts.activeConditions, HeartPulse, 'text-red-600', 'bg-red-50'],
              ['Current Meds', counts.medications, Pill, 'text-blue-600', 'bg-blue-50'],
              ['Visits', counts.encounters, UserRound, 'text-violet-600', 'bg-violet-50'],
              ['Admissions', counts.admissions, BedDouble, 'text-amber-600', 'bg-amber-50'],
              ['Lab Results', counts.labs, FlaskConical, 'text-emerald-600', 'bg-emerald-50'],
              ['Documents', counts.documents, FileText, 'text-brand-blue', 'bg-[#E8EEF8]'],
            ].map(([label, value, Icon, color, bg]) => (
              <div key={label} className="rounded-2xl border border-[#DDE3F0] bg-white p-4 shadow-sm">
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
                  <Icon size={18} className={color} />
                </div>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-[#8A97B0]">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map(([id, label, Icon]) => (
              <button key={id} type="button" onClick={() => setTab(id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === id ? 'bg-brand-blue text-white shadow-sm' : 'border border-[#DDE3F0] bg-white text-[#4B5A7A] hover:border-brand-blue hover:text-brand-blue'}`}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Section icon={Shield} title="Patient Summary">
                {(() => {
                  const activeConditions = conditions.filter(c => c.status === 'ACTIVE');
                  const resolvedConditions = conditions.filter(c => c.status === 'RESOLVED');
                  const activeMeds = medications.filter(m => !m.status || m.status === 'ACTIVE');
                  const latestLab = labResults[0];
                  const latestEncounter = encounters[0];
                  const latestAdmission = admissions[0];
                  const totalRecords = conditions.length + medications.length + encounters.length + admissions.length + labResults.length + documents.length;

                  return (
                    <div className="space-y-4">
                      {/* Top row — ID & Records */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl bg-[#F8FAFF] border border-[#DDE3F0] p-4">
                          <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-wider mb-1">Patient ID</p>
                          <p className="text-sm font-black text-[#0F1A3A] break-all">{patientId}</p>
                        </div>
                        <div className="rounded-xl bg-[#F8FAFF] border border-[#DDE3F0] p-4">
                          <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-wider mb-1">Total Records</p>
                          <p className="text-2xl font-black text-[#0F1A3A]">{totalRecords}</p>
                          <p className="text-xs text-[#8A97B0] font-semibold mt-1">Last updated {date(summary?.updatedAt || summary?.lastUpdatedAt)}</p>
                        </div>
                      </div>

                      {/* Active Conditions */}
                      <div className="rounded-xl border border-[#DDE3F0] bg-white p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center"><HeartPulse size={14} className="text-red-600" /></div>
                            <p className="text-xs font-black text-[#0F1A3A] uppercase tracking-wider">Active Conditions</p>
                          </div>
                          <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">{activeConditions.length}</span>
                        </div>
                        {activeConditions.length === 0 ? (
                          <p className="text-xs text-[#A0AECB] italic font-semibold">No active conditions — looking good!</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {activeConditions.slice(0, 6).map((c, i) => (
                              <span key={getId(c) || i} className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-100 px-2.5 py-1.5 text-xs font-bold text-red-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                {c.name || 'Unknown'}
                                {c.severity && <span className="text-red-400 text-[10px]">· {c.severity}</span>}
                              </span>
                            ))}
                            {activeConditions.length > 6 && <span className="text-xs font-bold text-[#A0AECB] self-center">+{activeConditions.length - 6} more</span>}
                          </div>
                        )}
                        {resolvedConditions.length > 0 && (
                          <p className="mt-2 text-[10px] font-bold text-green-600">{resolvedConditions.length} resolved condition{resolvedConditions.length > 1 ? 's' : ''}</p>
                        )}
                      </div>

                      {/* Current Medications */}
                      <div className="rounded-xl border border-[#DDE3F0] bg-white p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center"><Pill size={14} className="text-purple-600" /></div>
                            <p className="text-xs font-black text-[#0F1A3A] uppercase tracking-wider">Current Medications</p>
                          </div>
                          <span className="text-xs font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg">{activeMeds.length}</span>
                        </div>
                        {activeMeds.length === 0 ? (
                          <p className="text-xs text-[#A0AECB] italic font-semibold">No active medications on record.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {activeMeds.slice(0, 6).map((m, i) => (
                              <span key={getId(m) || i} className="inline-flex items-center gap-1 rounded-lg bg-purple-50 border border-purple-100 px-2.5 py-1.5 text-xs font-bold text-purple-700">
                                {m.name || m.medicationName || 'Unknown'}
                                {m.dosage && <span className="text-purple-400 text-[10px]">· {m.dosage}</span>}
                              </span>
                            ))}
                            {activeMeds.length > 6 && <span className="text-xs font-bold text-[#A0AECB] self-center">+{activeMeds.length - 6} more</span>}
                          </div>
                        )}
                      </div>

                      {/* Bottom row — Latest Lab, Encounter, Admission */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-[#DDE3F0] bg-white p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center"><FlaskConical size={12} className="text-blue-600" /></div>
                            <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-wider">Latest Lab</p>
                          </div>
                          {latestLab ? (
                            <>
                              <p className="text-sm font-bold text-[#0F1A3A] truncate">{latestLab.testName || latestLab.name}</p>
                              <p className="text-xs font-black text-brand-blue mt-0.5">{text(latestLab.value)} {latestLab.unit || ''}</p>
                              <p className="text-[10px] text-[#8A97B0] font-semibold mt-1">{date(latestLab.date)}</p>
                            </>
                          ) : (
                            <p className="text-xs text-[#A0AECB] italic font-semibold">No lab results</p>
                          )}
                        </div>
                        <div className="rounded-xl border border-[#DDE3F0] bg-white p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-md bg-orange-50 flex items-center justify-center"><UserRound size={12} className="text-orange-600" /></div>
                            <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-wider">Latest Visit</p>
                          </div>
                          {latestEncounter ? (
                            <>
                              <p className="text-sm font-bold text-[#0F1A3A] truncate">{latestEncounter.chiefComplaint || latestEncounter.type || 'Visit'}</p>
                              {latestEncounter.outcome && <Badge className="mt-1 bg-[#E8EEF8] text-brand-blue border-[#DDE3F0] text-[10px]">{latestEncounter.outcome}</Badge>}
                              <p className="text-[10px] text-[#8A97B0] font-semibold mt-1">{date(latestEncounter.date)}</p>
                            </>
                          ) : (
                            <p className="text-xs text-[#A0AECB] italic font-semibold">No encounters</p>
                          )}
                        </div>
                        <div className="rounded-xl border border-[#DDE3F0] bg-white p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center"><BedDouble size={12} className="text-amber-600" /></div>
                            <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-wider">Last Admission</p>
                          </div>
                          {latestAdmission ? (
                            <>
                              <p className="text-sm font-bold text-[#0F1A3A] truncate">{latestAdmission.hospital || 'Hospital'}</p>
                              <p className="text-xs text-[#4B5A7A] font-semibold mt-0.5">{latestAdmission.dischargeDate ? 'Discharged' : 'Currently admitted'}</p>
                              <p className="text-[10px] text-[#8A97B0] font-semibold mt-1">{date(latestAdmission.admitDate)}</p>
                            </>
                          ) : (
                            <p className="text-xs text-[#A0AECB] italic font-semibold">No admissions</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </Section>
              <Section icon={Clock} title="Recent Activity">
                {timeline.length === 0 ? <Empty>No activity recorded yet.</Empty> : (
                  <div>
                    {timeline.slice(0, 5).map((item, index) => (
                      <TimelineEvent key={timelineKey(item, index)} item={item} index={index} isLast={index === Math.min(timeline.length, 5) - 1} onView={setTimelineViewItem} />
                    ))}
                    {timeline.length > 5 && (
                      <button type="button" onClick={() => setTab('timeline')} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-brand-blue hover:underline">
                        View all {timeline.length} events <ChevronDown size={13} />
                      </button>
                    )}
                  </div>
                )}
              </Section>
            </div>
          )}

          {tab === 'conditions' && (
            <Section icon={HeartPulse} title="Medical Conditions" action={addButton('conditions')}>
              {renderList('conditions', conditions, (item) => (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-[#0F1A3A] text-base">{text(item.name)}</p>
                    <Badge className={statusClass(item.status)}>{text(item.status, 'Status')}</Badge>
                    {item.severity && <Badge className={statusClass(item.severity)}>{item.severity}</Badge>}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#8A97B0]">Diagnosed {date(item.dateDiagnosed)} {item.dateResolved ? `- Resolved ${date(item.dateResolved)}` : ''}</p>
                  {item.notes && <p className="mt-2 text-sm text-[#4B5A7A]">{item.notes}</p>}
                </>
              ))}
            </Section>
          )}

          {tab === 'medications' && (
            <Section icon={Pill} title="Current Medications" action={addButton('medications')}>
              {renderList('medications', medications, (item) => (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-[#0F1A3A] text-base">{text(item.name || item.medicationName)}</p>
                    <Badge className={statusClass(item.status)}>{text(item.status, 'ACTIVE')}</Badge>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[#4B5A7A]">{[item.dosage, item.frequency].filter(Boolean).join(' - ') || 'Dose not recorded'}</p>
                  <p className="mt-1 text-xs font-semibold text-[#8A97B0]">Started {date(item.startDate)} {item.endDate ? `- Ended ${date(item.endDate)}` : ''}</p>
                  {item.notes && <p className="mt-2 text-sm text-[#4B5A7A]">{item.notes}</p>}
                </>
              ))}
            </Section>
          )}

          {tab === 'encounters' && (
            <Section icon={UserRound} title="Patient Visits" action={addButton('encounters')}>
              {renderList('encounters', encounters, (item) => (
                <>
                  <p className="font-bold text-[#0F1A3A] text-base">{text(item.chiefComplaint || item.type || item.encounterType, 'Visit')}</p>
                  <p className="mt-1 text-xs font-semibold text-[#8A97B0]">{date(item.date || item.encounterDate)} {item.epcrRecordId ? `- EPCR ${item.epcrRecordId}` : ''}</p>
                  {item.outcome && <Badge className="mt-2 bg-[#E8EEF8] text-brand-blue border-[#DDE3F0]">{item.outcome}</Badge>}
                  {item.notes && <p className="mt-2 text-sm text-[#4B5A7A]">{item.notes}</p>}
                </>
              ))}
            </Section>
          )}

          {tab === 'admissions' && (
            <Section icon={BedDouble} title="Hospital Admissions" action={addButton('admissions')}>
              {renderList('admissions', admissions, (item) => (
                <>
                  <p className="font-bold text-[#0F1A3A] text-base">{text(item.hospital || item.facility, 'Hospital admission')}</p>
                  <p className="mt-1 text-xs font-semibold text-[#8A97B0]"><CalendarDays size={13} className="mr-1 inline" />{date(item.admitDate || item.admissionDate)} - {item.dischargeDate ? date(item.dischargeDate) : 'Ongoing'}</p>
                  {item.reason && <p className="mt-2 text-sm text-[#4B5A7A]">{item.reason}</p>}
                  {item.outcome && <Badge className="mt-2 bg-[#E8EEF8] text-brand-blue border-[#DDE3F0]">{item.outcome}</Badge>}
                </>
              ))}
            </Section>
          )}

          {tab === 'labResults' && (
            <Section icon={FlaskConical} title="Laboratory Results" action={addButton('labResults')}>
              {renderList('labResults', labResults, (item) => (
                <>
                  <p className="font-bold text-[#0F1A3A] text-base">{text(item.testName || item.name)}</p>
                  <p className="mt-1 text-sm font-black text-brand-blue">{text(item.value || item.result)} <span className="text-xs font-semibold text-[#8A97B0]">{item.unit}</span></p>
                  <p className="mt-1 text-xs font-semibold text-[#8A97B0]">{date(item.date || item.resultDate)} {item.normalRange ? `- Normal ${item.normalRange}` : ''}</p>
                  {item.interpretation && <Badge className={`mt-2 ${statusClass(item.interpretation)}`}>{item.interpretation}</Badge>}
                </>
              ))}
            </Section>
          )}

          {tab === 'documents' && (
            <Section icon={FileText} title="Medical Documents" action={addButton('documents')}>
              {renderList('documents', documents, (item) => (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#0F1A3A] text-base">{text(item.fileName || item.name, 'Document')}</p>
                    <p className="mt-1 text-xs font-semibold text-[#8A97B0]">{text(item.type, 'Document')} - {date(item.date || item.uploadedAt)}</p>
                    {item.notes && <p className="mt-2 text-sm text-[#4B5A7A]">{item.notes}</p>}
                  </div>
                  {(item.fileUrl || item.url) && (
                    <button type="button" onClick={() => viewSecureDocument(patientId, getId(item), item.fileName || item.name || item.fileUrl || item.url)} className="inline-flex items-center gap-1 text-xs font-black text-brand-blue hover:underline">
                      View <ExternalLink size={13} />
                    </button>
                  )}
                </div>
              ))}
            </Section>
          )}

          {tab === 'timeline' && (
            <Section icon={Clock} title="Complete Medical Timeline">
              {timeline.length === 0 ? <Empty>No medical events recorded yet.</Empty> : (
                <div>
                  {/* Event type legend */}
                  <div className="mb-6 flex flex-wrap gap-2">
                    {Object.entries(EVENT_TYPE_STYLES).map(([key, s]) => {
                      const LIcon = s.icon;
                      return (
                        <span key={key} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border" style={{ background: s.bg, color: s.color, borderColor: `${s.color}30` }}>
                          <LIcon size={11} />
                          {s.label}
                        </span>
                      );
                    })}
                  </div>
                  {/* Summary stats bar */}
                  <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      ['Total Events', timeline.length, Activity, '#1A3C8F', '#DBEAFE'],
                      ['Conditions', timeline.filter(e => String(e.eventType || e.type || '').toUpperCase().includes('CONDITION')).length, HeartPulse, '#C8102E', '#FEE2E2'],
                      ['Medications', timeline.filter(e => String(e.eventType || e.type || '').toUpperCase().includes('MEDICATION')).length, Pill, '#7C3AED', '#F3E8FF'],
                      ['Labs & Docs', timeline.filter(e => { const t = String(e.eventType || e.type || '').toUpperCase(); return t.includes('LAB') || t.includes('DOCUMENT'); }).length, FlaskConical, '#059669', '#D1FAE5'],
                    ].map(([label, count, SIcon, color, bg]) => (
                      <div key={label} className="rounded-xl border border-[#DDE3F0] bg-white p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg, color }}>
                          <SIcon size={16} />
                        </div>
                        <div>
                          <p className="text-lg font-black leading-none" style={{ color }}>{count}</p>
                          <p className="text-[10px] font-bold text-[#A0AECB] uppercase tracking-wider mt-0.5">{label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Grouped timeline */}
                  {groupTimelineByMonth(timeline).map((group) => (
                    <div key={group.label} className="mb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-[#DDE3F0]" />
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0F4FC] border border-[#DDE3F0] px-4 py-1.5 text-xs font-black text-[#4B5A7A] uppercase tracking-wider">
                          <CalendarDays size={12} />
                          {group.label}
                        </span>
                        <div className="h-px flex-1 bg-[#DDE3F0]" />
                      </div>
                      {group.items.map((item, index) => (
                        <TimelineEvent key={timelineKey(item, index)} item={item} index={index} isLast={index === group.items.length - 1} onView={setTimelineViewItem} />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}
        </>
      )}

      {modal && patientId && (
        <HistoryModal type={modal.type} item={modal.item} patientId={patientId} onClose={() => setModal(null)} />
      )}
      {viewModal && (
        <ViewModal type={viewModal.type} item={viewModal.item} onClose={() => setViewModal(null)} />
      )}
      {timelineViewItem && (
        <TimelineViewModal item={timelineViewItem} onClose={() => setTimelineViewItem(null)} />
      )}
    </div>
  );
}

export default PatientHistory;
