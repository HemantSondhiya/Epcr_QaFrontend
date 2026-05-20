import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, ReferenceArea, Area, AreaChart, Cell,
  BarChart, Bar
} from 'recharts';
import {
  clearHistory,
  createAdmission,
  createCondition,
  createDocument,
  createEncounter,
  createLabResult,
  createMedication,
  createVital,
  deleteAdmission,
  deleteCondition,
  deleteDocument,
  deleteEncounter,
  deleteLabResult,
  deleteMedication,
  deleteVital,
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
  selectVitals,
  setCurrentPatientId,
  updateAdmission,
  updateCondition,
  updateDocument,
  updateEncounter,
  updateLabResult,
  updateMedication,
  updateVital,
} from '../store/slices/patientHistorySlice';
import { addToast } from '../store/slices/uiSlice';
import { selectUser } from '../store/slices/authSlice';
import client from '../api/client';
import {
  Activity,
  AlertCircle,
  BarChart3,
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
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
  Thermometer,
  Trash2,
  TrendingUp,
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

const viewSecureDocument = async (dispatch, patientId, documentId) => {
  if (!documentId || !patientId) return;
  try {
    const res = await client.get(
      `/api/patients/${patientId}/history/documents/${documentId}/signed-url`,
      { hideToast: true }
    );
    window.open(res.data.url, '_blank');
  } catch (error) {
    console.error('Failed to view document securely', error);
    const status = error.response?.status;
    const message = status === 404
      ? 'This document was stored on a previous server and must be re-uploaded to be accessible.'
      : (error.response?.data?.message || 'Unable to open document. Please try again or contact support.');
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

const SecureInlineImage = ({ patientId, doc, className, onError }) => {
  const [src, setSrc] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let active = true;
    const documentId = getId(doc);
    if (!patientId || !documentId) {
      if (active) setErr(true);
      return;
    }
    client.get(`/api/patients/${patientId}/history/documents/${documentId}/signed-url`, { hideToast: true })
      .then(res => { if (active) setSrc(res.data.url); })
      .catch(() => { if (active) setErr(true); });
    return () => { active = false; };
  }, [patientId, doc]);

  if (err) return <div className="w-full h-24 flex items-center justify-center text-[#A0AECB]"><FileText size={32} /></div>;
  if (!src) return <div className="w-full h-32 flex items-center justify-center text-[#A0AECB] animate-pulse bg-gray-50"><FileText size={32} className="opacity-30" /></div>;

  return (
    <img
      src={src}
      alt={doc.fileName || doc.name || 'Medical image'}
      className={className}
      onError={onError}
    />
  );
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
  <section className="bg-white border border-[#DDE3F0] rounded-[24px] shadow-sm overflow-hidden">
    <div className="flex items-center justify-between gap-3 border-b border-[#DDE3F0] px-8 py-6">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-[#E8EEF8] text-[#0F1A3A] flex items-center justify-center">
          <Icon size={20} />
        </div>
        <h2 className="text-xl font-black text-[#0F1A3A] tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
    <div className="p-8">{children}</div>
  </section>
);

const Empty = ({ children }) => (
  <div className="rounded-xl border border-dashed border-[#DDE3F0] bg-[#F8FAFF] px-4 py-8 text-center text-sm font-semibold text-[#8A97B0]">
    {children}
  </div>
);

const MetricCard = ({ icon: Icon, label, value, unit, range, color, bgColor, children }) => (
  <div className="card p-4 space-y-2 border border-[#DDE3F0] bg-white rounded-2xl shadow-sm">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: bgColor, color }}>
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-black text-[#A0AECB] uppercase tracking-wider truncate">{label}</p>
          <p className="text-lg font-black text-[#0F1A3A] tabular-nums leading-none">
            {value ?? 'N/A'} <span className="text-xs text-[#8A97B0] font-bold">{unit}</span>
          </p>
        </div>
      </div>
    </div>
    <div className="h-12">
      {children}
    </div>
    <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#F0F4FC]">
      <p className="text-[10px] font-bold text-[#A0AECB] uppercase tracking-wider">{range}</p>
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600 border border-green-100">
        <Activity size={10} /> Active
      </span>
    </div>
  </div>
);

const VitalTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-[#DDE3F0] bg-white p-3 shadow-xl">
      <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-wider mb-2">{new Date(label).toLocaleString()}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-xs font-bold text-[#4B5A7A]">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}: {entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const field = (name, label, type = 'text', options = {}) => ({ name, label, type, ...options });

const FORM_CONFIG = {
  conditions: {
    title: 'Condition',
    subtitle: 'Complete all required fields to save the condition',
    create: createCondition,
    update: updateCondition,
    defaults: { name: '', status: 'ACTIVE', severity: '', dateDiagnosed: isoToday(), dateResolved: '', notes: '', symptoms: '', findings: '', analysis: '', recommendedTreatment: '' },
    fields: [
      field('name', 'Condition Name', 'text', { required: true, placeholder: 'e.g., Hypertension, Diabetes' }),
      field('status', 'Status', 'select', { options: ['ACTIVE', 'RESOLVED', 'CHRONIC'], required: true }),
      field('severity', 'Severity Level', 'text', { placeholder: 'e.g., Mild, Moderate, Severe' }),
      field('dateDiagnosed', 'Date Diagnosed', 'date', { required: true }),
      field('dateResolved', 'Date Resolved', 'date', { placeholder: 'Leave empty if ongoing' }),
      field('symptoms', 'Symptoms', 'textarea', { placeholder: 'Reported symptoms...' }),
      field('findings', 'Clinical Findings', 'textarea', { placeholder: 'Objective findings...' }),
      field('analysis', 'Analysis / Assessment', 'textarea', { placeholder: 'Clinical analysis...' }),
      field('recommendedTreatment', 'Recommended Treatment', 'textarea', { placeholder: 'Proposed treatment plan...' }),
      field('notes', 'Additional Notes', 'textarea', { placeholder: 'Any relevant clinical information...' }),
    ],
    sections: [
      { title: 'Condition Information', fieldNames: ['name', 'status', 'severity'] },
      { title: 'Timeline', fieldNames: ['dateDiagnosed', 'dateResolved'] },
      { title: 'Clinical Notes', fieldNames: ['symptoms', 'findings', 'analysis', 'recommendedTreatment'] },
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
    defaults: { conditionId: '', testName: '', value: '', unit: '', normalRange: '', date: isoToday(), interpretation: '', notes: '' },
    fields: [
      field('testName', 'Test Name', 'text', { required: true, placeholder: 'e.g., Blood Glucose, Hemoglobin A1C' }),
      field('value', 'Result Value', 'text', { required: true, placeholder: 'e.g., 145' }),
      field('unit', 'Unit of Measurement', 'text', { placeholder: 'e.g., mg/dL, g/dL' }),
      field('normalRange', 'Normal Range', 'text', { placeholder: 'e.g., 70-100 mg/dL' }),
      field('interpretation', 'Interpretation', 'text', { placeholder: 'e.g., High, Low, Normal' }),
      field('date', 'Test Date', 'date', { required: true }),
      field('notes', 'Additional Notes', 'textarea', { placeholder: 'Any extra details regarding the lab result...' }),
      field('conditionId', 'Related Condition (Optional)', 'text', { placeholder: 'Condition ID' }),
    ],
    sections: [
      { title: 'Test Information', fieldNames: ['testName', 'date'] },
      { title: 'Results', fieldNames: ['value', 'unit', 'normalRange', 'interpretation'] },
      { title: 'Additional Details', fieldNames: ['notes', 'conditionId'] },
    ],
  },
  documents: {
    title: 'Medical Document',
    subtitle: 'Complete all required fields to save the document',
    create: createDocument,
    update: updateDocument,
    defaults: { conditionId: '', encounterId: '', admissionId: '', type: 'LAB_REPORT', documentPhase: 'PRE', fileName: '', fileUrl: '', date: isoToday(), notes: '', file: null },
    isDocument: true,
    transform: (data, isUpdate) => {
      if (!isUpdate || data.file instanceof File) {
        // → multipart PUT /history/documents/{id}  (or multipart POST for create)
        const fd = new FormData();
        if (data.file) fd.append('file', data.file);
        if (data.type) fd.append('type', data.type);
        if (data.documentPhase) fd.append('documentPhase', data.documentPhase);
        if (data.date) fd.append('date', data.date);
        if (data.conditionId) fd.append('conditionId', data.conditionId);
        if (data.encounterId) fd.append('encounterId', data.encounterId);
        if (data.admissionId) fd.append('admissionId', data.admissionId);
        if (data.notes) fd.append('notes', data.notes);
        if (data.fileName) fd.append('fileName', data.fileName);
        return fd;
      }
      // → JSON-only PUT (metadata update, no file replacement)
      const { file, ...rest } = data;
      return rest;
    },
    fields: [
      field('type', 'Document Type', 'select', { options: ['LAB_REPORT', 'DISCHARGE_SUMMARY', 'IMAGING', 'OTHER'], required: true }),
      field('documentPhase', 'Treatment Phase', 'select', { options: ['PRE', 'POST'], required: true }),
      field('date', 'Document Date', 'date', { required: true }),
      field('notes', 'Summary or Notes', 'textarea', { placeholder: 'Additional notes about this document...' }),
      field('conditionId', 'Related Condition (Optional)', 'text', { placeholder: 'Condition ID' }),
      field('encounterId', 'Related Encounter (Optional)', 'text', { placeholder: 'Encounter ID' }),
      field('admissionId', 'Related Admission (Optional)', 'text', { placeholder: 'Admission ID' }),
    ],
    sections: [
      { title: 'Document Details', fieldNames: ['type', 'documentPhase', 'date'] },
      { title: 'Notes', fieldNames: ['notes'] },
      { title: 'Linked Records', fieldNames: ['conditionId', 'encounterId', 'admissionId'] },
    ],
  },
  vitals: {
    title: 'Vital Reading',
    subtitle: 'Record patient vital signs',
    create: createVital,
    update: updateVital,
    defaults: {
      recordedAt: new Date().toISOString().slice(0, 16), systolicBP: '', diastolicBP: '', heartRate: '',
      oxygenSaturation: '', respiratoryRate: '', temperature: '', bloodGlucose: '', glasgowComaScale: '',
      gcEye: '', gcVerbal: '', gcMotor: '', painScore: '', painLocation: '', oxygenDeliveryMethod: '',
      temperatureRoute: '', hemoglobin: '', avpu: '', pupilLeft: '', pupilRight: '', skinColor: '', notes: '',
      linkedEpcrId: '', linkedEncounterId: '',
    },
    fields: [
      field('recordedAt', 'Recorded At', 'datetime-local', { required: true }),
      field('systolicBP', 'Systolic BP (mmHg)', 'number', { placeholder: '120' }),
      field('diastolicBP', 'Diastolic BP (mmHg)', 'number', { placeholder: '80' }),
      field('heartRate', 'Heart Rate (bpm)', 'number', { placeholder: '72' }),
      field('oxygenSaturation', 'SpO₂ (%)', 'number', { placeholder: '98' }),
      field('respiratoryRate', 'Respiratory Rate (/min)', 'number', { placeholder: '16' }),
      field('temperature', 'Temperature (°C)', 'number', { placeholder: '36.8' }),
      field('temperatureRoute', 'Temp Route', 'select', { options: ['ORAL', 'AXILLARY', 'RECTAL', 'TYMPANIC'] }),
      field('oxygenDeliveryMethod', 'O₂ Delivery', 'text', { placeholder: 'Room air, Nasal cannula...' }),
      field('bloodGlucose', 'Blood Glucose (mg/dL)', 'number', { placeholder: '100' }),
      field('hemoglobin', 'Hemoglobin (g/dL)', 'number', { placeholder: '14' }),
      field('glasgowComaScale', 'GCS Total (/15)', 'number', { placeholder: '15' }),
      field('gcEye', 'GCS Eye', 'number', { placeholder: '4' }),
      field('gcVerbal', 'GCS Verbal', 'number', { placeholder: '5' }),
      field('gcMotor', 'GCS Motor', 'number', { placeholder: '6' }),
      field('avpu', 'AVPU', 'select', { options: ['A', 'V', 'P', 'U'] }),
      field('painScore', 'Pain Score (/10)', 'number', { placeholder: '0' }),
      field('painLocation', 'Pain Location', 'text', { placeholder: 'Chest, Abdomen...' }),
      field('pupilLeft', 'Pupil Left', 'text', { placeholder: '3mm' }),
      field('pupilRight', 'Pupil Right', 'text', { placeholder: '3mm' }),
      field('skinColor', 'Skin Color', 'text', { placeholder: 'Normal, Pale, Cyanotic...' }),
      field('linkedEpcrId', 'Linked ePCR ID', 'text', { placeholder: 'Optional' }),
      field('linkedEncounterId', 'Linked Encounter ID', 'text', { placeholder: 'Optional' }),
      field('notes', 'Notes', 'textarea', { placeholder: 'Additional observations...' }),
    ],
    sections: [
      { title: 'Recording Info', fieldNames: ['recordedAt'] },
      { title: 'Cardiovascular', fieldNames: ['systolicBP', 'diastolicBP', 'heartRate', 'oxygenSaturation', 'respiratoryRate'] },
      { title: 'Temperature & Glucose', fieldNames: ['temperature', 'temperatureRoute', 'oxygenDeliveryMethod', 'bloodGlucose', 'hemoglobin'] },
      { title: 'Neurological', fieldNames: ['glasgowComaScale', 'gcEye', 'gcVerbal', 'gcMotor', 'avpu', 'painScore', 'painLocation'] },
      { title: 'Assessment', fieldNames: ['pupilLeft', 'pupilRight', 'skinColor'] },
      { title: 'Linked Records', fieldNames: ['linkedEpcrId', 'linkedEncounterId'] },
      { title: 'Notes', fieldNames: ['notes'] },
    ],
  },
};

/* ────────────────── Vitals: constants & helpers ────────────────── */

const VITAL_METRICS = [
  { key: 'systolicBP', label: 'Systolic BP', short: 'BP Sys', unit: 'mmHg', color: '#C8102E', lo: 90, hi: 140 },
  { key: 'diastolicBP', label: 'Diastolic BP', short: 'BP Dia', unit: 'mmHg', color: '#E8476E', lo: 60, hi: 90 },
  { key: 'heartRate', label: 'Heart Rate', short: 'HR', unit: 'bpm', color: '#7C3AED', lo: 60, hi: 100 },
  { key: 'oxygenSaturation', label: 'SpO₂', short: 'SpO₂', unit: '%', color: '#059669', lo: 95, hi: 100 },
  { key: 'respiratoryRate', label: 'Resp Rate', short: 'RR', unit: '/min', color: '#0891B2', lo: 12, hi: 20 },
  { key: 'temperature', label: 'Temperature', short: 'Temp', unit: '°C', color: '#EA580C', lo: 36.1, hi: 37.2 },
  { key: 'bloodGlucose', label: 'Blood Glucose', short: 'Glucose', unit: 'mg/dL', color: '#CA8A04', lo: 70, hi: 100 },
  { key: 'glasgowComaScale', label: 'GCS', short: 'GCS', unit: '/15', color: '#1A3C8F', lo: 14, hi: 15 },
  { key: 'painScore', label: 'Pain Score', short: 'Pain', unit: '/10', color: '#DC2626', lo: 0, hi: 3 },
];

const metricByKey = Object.fromEntries(VITAL_METRICS.map((m) => [m.key, m]));

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

const vitalPill = (value, metric) => {
  if (value == null || value === '') return null;
  const m = typeof metric === 'string' ? metricByKey[metric] : metric;
  if (!m) return null;
  const num = Number(value);
  const outOfRange = !isNaN(num) && (num < m.lo || num > m.hi);
  return (
    <span key={m.key} className={`inline-flex flex-col justify-center rounded-lg px-2.5 py-1 text-xs font-bold border ${outOfRange ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-[#F0F4FC] text-[#0F1A3A] border-[#DDE3F0]'}`}>
      <span className="text-[8px] font-black text-[#8A97B0] uppercase leading-none">{m.label}</span>
      <span className="mt-0.5 leading-none">
        {value}{m.unit ? <span className="text-[9px] text-[#A0AECB] ml-0.5 font-bold">{m.unit}</span> : null}
      </span>
    </span>
  );
};

const TIME_FILTERS = [
  { key: 'all', label: 'All' },
  { key: '24h', label: '24 h', ms: 86400000 },
  { key: '7d', label: '7 days', ms: 604800000 },
  { key: '30d', label: '30 days', ms: 2592000000 },
];

const formatChartTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}\n${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

/* ────────────────── VitalsTab component ────────────────── */

function VitalsTab({ vitals, canEdit, onAdd, onEdit, onView, onDelete }) {
  const [subTab, setSubTab] = useState('chart');
  const [timeFilter, setTimeFilter] = useState('all');
  const [primaryMetric, setPrimaryMetric] = useState('systolicBP');
  const [compareMetrics, setCompareMetrics] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  const filtered = useMemo(() => {
    let list = [...vitals];
    if (timeFilter !== 'all') {
      const cutoff = Date.now() - TIME_FILTERS.find((f) => f.key === timeFilter)?.ms;
      list = list.filter((v) => new Date(v.recordedAt || v.createdAt).getTime() >= cutoff);
    }
    return list;
  }, [vitals, timeFilter]);

  const historyList = useMemo(() => [...filtered].sort((a, b) => new Date(b.recordedAt || b.createdAt) - new Date(a.recordedAt || a.createdAt)), [filtered]);
  const chartData = useMemo(() => [...filtered].sort((a, b) => new Date(a.recordedAt || a.createdAt) - new Date(b.recordedAt || b.createdAt)).map((v) => ({
    ...v,
    time: new Date(v.recordedAt || v.createdAt).getTime(),
    label: formatChartTime(v.recordedAt || v.createdAt),
  })), [filtered]);

  const toggleCompare = useCallback((key) => {
    setCompareMetrics((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : prev.length < 3 ? [...prev, key] : prev);
  }, []);

  const activeChartMetrics = useMemo(() => {
    const keys = [primaryMetric, ...(showCompare ? compareMetrics : [])];
    return [...new Set(keys)].map((k) => metricByKey[k]).filter(Boolean);
  }, [primaryMetric, compareMetrics, showCompare]);

  const latest = chartData[chartData.length - 1] || {};

  return (
    <Section icon={Thermometer} title="Vital Signs" action={canEdit ? (
      <button type="button" onClick={onAdd} className="btn-primary px-4 py-2 text-xs"><Plus size={15} /> Add</button>
    ) : null}>
      {/* Sub-tab toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="inline-flex rounded-xl border border-[#DDE3F0] bg-white overflow-hidden">
          {[['history', 'Reading History', Clock], ['chart', 'Trend Chart', TrendingUp]].map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => setSubTab(id)} className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition ${subTab === id ? 'bg-brand-red text-white' : 'text-[#4B5A7A] hover:bg-[#F8FAFF]'}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-xl border border-[#DDE3F0] bg-white overflow-hidden">
          {TIME_FILTERS.map((f) => (
            <button key={f.key} type="button" onClick={() => setTimeFilter(f.key)} className={`px-4 py-2 text-xs font-bold transition ${timeFilter === f.key ? 'bg-[#0F1A3A] text-white' : 'text-[#4B5A7A] hover:bg-[#F8FAFF]'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty>No vital readings recorded{timeFilter !== 'all' ? ` in the selected time range` : ''}.</Empty>
      ) : (
        <div className="space-y-6">
          {/* Summary Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <MetricCard
              icon={HeartPulse} label="Heart Rate"
              value={latest.heartRate} unit="bpm"
              range="Latest Reading" color="#C8102E" bgColor="#FEE2E2"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hrGradClin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C8102E" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#C8102E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="heartRate" stroke="#C8102E" strokeWidth={2} fill="url(#hrGradClin)" dot={false} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </MetricCard>

            <MetricCard
              icon={Activity} label="Blood Pressure"
              value={latest.systolicBP ? `${latest.systolicBP}/${latest.diastolicBP}` : 'N/A'} unit="mmHg"
              range="Latest Reading" color="#1A3C8F" bgColor="#DBEAFE"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <Line type="monotone" dataKey="systolicBP" stroke="#1A3C8F" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="diastolicBP" stroke="#60A5FA" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </MetricCard>

            <MetricCard
              icon={Activity} label="SpO₂"
              value={latest.oxygenSaturation} unit="%"
              range="Latest Reading" color="#059669" bgColor="#D1FAE5"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spo2GradClin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="oxygenSaturation" stroke="#059669" strokeWidth={2} fill="url(#spo2GradClin)" dot={false} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </MetricCard>
          </div>

          <div className="border-t border-[#F0F4FC] pt-6">
            {subTab === 'history' ? (
              /* ── Reading History ── */
              <div className="space-y-3">
                {historyList.map((v) => {
                  const status = assessVitalStatus(v);
                  const ts = v.recordedAt || v.createdAt;
                  return (
                    <div key={v.id || JSON.stringify(v)} className="rounded-xl border border-[#DDE3F0] bg-white p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          {/* Time & status */}
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="text-sm font-black text-[#0F1A3A]">
                              {ts ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </span>
                            <span className="text-xs font-bold text-[#8A97B0]">{date(ts)}</span>
                            <Badge className={status.cls}>{status.label}</Badge>
                          </div>
                          {/* Primary vitals row */}
                          <div className="flex flex-wrap gap-2 mb-2">
                            {v.systolicBP != null && v.diastolicBP != null && (
                              <span className={`inline-flex flex-col justify-center rounded-lg px-2.5 py-1 text-xs font-bold border ${(v.systolicBP > 140 || v.systolicBP < 90 || v.diastolicBP > 90 || v.diastolicBP < 60) ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-[#F0F4FC] text-[#0F1A3A] border-[#DDE3F0]'}`}>
                                <span className="text-[8px] font-black text-[#8A97B0] uppercase leading-none">Blood Pressure</span>
                                <span className="mt-0.5 leading-none">
                                  {v.systolicBP}/{v.diastolicBP} <span className="text-[9px] text-[#A0AECB] ml-0.5 font-bold">mmHg</span>
                                </span>
                              </span>
                            )}
                            {vitalPill(v.heartRate, 'heartRate')}
                            {vitalPill(v.oxygenSaturation, 'oxygenSaturation')}
                            {vitalPill(v.respiratoryRate, 'respiratoryRate')}
                            {vitalPill(v.temperature, 'temperature')}
                          </div>
                          {/* Secondary vitals row */}
                          <div className="flex flex-wrap gap-2">
                            {vitalPill(v.glasgowComaScale, 'glasgowComaScale')}
                            {vitalPill(v.painScore, 'painScore')}
                            {vitalPill(v.bloodGlucose, 'bloodGlucose')}
                            {v.avpu && <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold border bg-[#F0F4FC] text-[#0F1A3A] border-[#DDE3F0]"><span className="text-[10px] font-black text-[#8A97B0]">AVPU</span> {v.avpu}</span>}
                          </div>
                          {/* Recorded by */}
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-bold text-[#A0AECB] uppercase tracking-wider">
                            {v.recordedByName && <span>👤 Recorded by {v.recordedByName}</span>}
                            {v.oxygenDeliveryMethod && <span>· {v.oxygenDeliveryMethod}</span>}
                            {v.linkedEpcrId && <span className="text-brand-blue">ePCR {v.linkedEpcrId}</span>}
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex shrink-0 gap-2">
                          <IconButton title="View Details" onClick={() => onView(v)}><Eye size={15} /></IconButton>
                          {canEdit && (
                            <>
                              <IconButton title="Edit" onClick={() => onEdit(v)}><Edit3 size={15} /></IconButton>
                              <IconButton title="Delete" onClick={() => onDelete(v)} className="hover:border-red-200 hover:text-red-600"><Trash2 size={15} /></IconButton>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── Trend Chart ── */
              <div>
                {/* Chart controls */}
                <div className="flex flex-wrap items-end gap-4 mb-5">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[9px] font-black text-[#A0AECB] uppercase tracking-widest mb-2 block">Primary Metric</label>
                    <select value={primaryMetric} onChange={(e) => setPrimaryMetric(e.target.value)} className="input py-2.5 text-sm font-bold">
                      {VITAL_METRICS.map((m) => <option key={m.key} value={m.key}>{m.label} ({m.unit})</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={() => setShowCompare(!showCompare)} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition ${showCompare ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-[#4B5A7A] border-[#DDE3F0] hover:border-brand-blue'}`}>
                    <BarChart3 size={14} /> Compare
                  </button>
                </div>

                {/* Compare selector */}
                {showCompare && (
                  <div className="mb-5 p-4 rounded-xl border border-[#DDE3F0] bg-[#F8FAFF]">
                    <p className="text-[9px] font-black text-[#A0AECB] uppercase tracking-widest mb-3">Select up to 3 metrics to compare</p>
                    <div className="flex flex-wrap gap-2">
                      {VITAL_METRICS.filter((m) => m.key !== primaryMetric).map((m) => {
                        const active = compareMetrics.includes(m.key);
                        return (
                          <button key={m.key} type="button" onClick={() => toggleCompare(m.key)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold border transition ${active ? 'text-white border-transparent' : 'bg-white text-[#4B5A7A] border-[#DDE3F0] hover:border-brand-blue'}`}
                            style={active ? { background: m.color, borderColor: m.color } : undefined}>
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} /> {m.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Chart */}
                <div className="rounded-xl border border-[#DDE3F0] bg-white p-5 shadow-sm">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          {activeChartMetrics.map((m) => (
                            <linearGradient key={`clin-grad-${m.key}`} id={`clin-grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={m.color} stopOpacity={0.25} />
                              <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#F0F4FC" />
                        <XAxis
                          dataKey="time"
                          type="number"
                          domain={['auto', 'auto']}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#8A97B0', fontWeight: 600 }}
                          tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                          minTickGap={30}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#4B5A7A', fontWeight: 700 }}
                          domain={['auto', 'auto']}
                        />
                        <RechartsTooltip content={<VitalTooltip />} />
                        <Legend
                          wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }}
                          iconType="circle"
                        />
                        {activeChartMetrics.length === 1 && activeChartMetrics[0].lo != null && (
                          <ReferenceArea
                            y1={activeChartMetrics[0].lo}
                            y2={activeChartMetrics[0].hi}
                            fill={activeChartMetrics[0].color}
                            fillOpacity={0.06}
                            stroke="none"
                          />
                        )}
                        {activeChartMetrics.map((m, i) => i === 0 ? (
                          <Area
                            key={m.key}
                            type="monotone"
                            dataKey={m.key}
                            name={m.label}
                            stroke={m.color}
                            strokeWidth={4}
                            fill={`url(#clin-grad-${m.key})`}
                            dot={{ r: 4, fill: '#fff', strokeWidth: 3, stroke: m.color }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            connectNulls
                            animationDuration={1500}
                          />
                        ) : (
                          <Line
                            key={m.key}
                            type="monotone"
                            dataKey={m.key}
                            name={m.label}
                            stroke={m.color}
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            dot={{ r: 3, fill: '#fff', strokeWidth: 2, stroke: m.color }}
                            activeDot={{ r: 5, strokeWidth: 0 }}
                            connectNulls
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend with normal ranges */}
                  <div className="mt-4 pt-3 border-t border-[#F0F4FC] flex flex-wrap gap-3">
                    {activeChartMetrics.map((m) => (
                      <span key={m.key} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#4B5A7A]">
                        <span className="w-3 h-1 rounded-full" style={{ background: m.color }} />
                        {m.label}: Normal {m.lo}–{m.hi} {m.unit}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Section>
  );
}

function HistoryModal({ type, item, patientId, initialValues = {}, onClose }) {
  const dispatch = useDispatch();
  const config = FORM_CONFIG[type];
  const conditions = useSelector(selectConditions) || [];
  const encounters = useSelector(selectEncounters) || [];
  const admissions = useSelector(selectAdmissions) || [];
  const [form, setForm] = useState(() => {
    const existing = item && config.fromExisting ? config.fromExisting(item) : item;
    return { ...config.defaults, ...initialValues, ...(existing || {}) };
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
                    <button type="button" onClick={() => viewSecureDocument(dispatch, patientId, getId(item), item.fileName || item.fileUrl)} className="text-[9px] font-black text-brand-red uppercase tracking-widest hover:underline shrink-0 flex items-center gap-1">
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
        <button type="submit" className="btn-danger justify-center">
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

const EncounterAnalytics = ({ encounters }) => {
  const trendData = useMemo(() => {
    const months = {};
    [...encounters].sort((a, b) => new Date(a.date || a.encounterDate || a.timestamp) - new Date(b.date || b.encounterDate || b.timestamp))
      .forEach(e => {
        const dateStr = e.date || e.encounterDate || e.timestamp;
        if (!dateStr) return;
        const date = new Date(dateStr);
        const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        months[key] = (months[key] || 0) + 1;
      });
    return Object.entries(months).map(([name, count]) => ({ name, count }));
  }, [encounters]);

  const typeData = useMemo(() => {
    const types = {};
    encounters.forEach(e => {
      const type = e.chiefComplaint || e.type || e.encounterType || 'Visit';
      types[type] = (types[type] || 0) + 1;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 5);
  }, [encounters]);

  if (encounters.length < 2) return null;

  return (
    <div className="card p-5 border border-[#DDE3F0] mb-6 shadow-sm bg-white rounded-[24px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-black text-[#0F1A3A] text-sm uppercase tracking-wider">Visit Trends</h3>
          <p className="text-xs text-[#8A97B0] mt-1">Frequency of clinical encounters over time</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-blue bg-purple-50 text-purple-700 border border-purple-200">Analytics</span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="encounterGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F4FC" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8A97B0' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8A97B0' }} />
              <RechartsTooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                labelStyle={{ fontWeight: '800', color: '#0F1A3A', marginBottom: '4px' }}
              />
              <Area type="monotone" dataKey="count" stroke="#7C3AED" strokeWidth={3} fillOpacity={1} fill="url(#encounterGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0F4FC" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#4B5A7A', fontWeight: '700' }} width={80} />
              <RechartsTooltip cursor={{ fill: 'transparent' }} />
              <Bar dataKey="value" fill="#A78BFA" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

function RowActions({ type, item, patientId, canEdit, onEdit, onView }) {
  const dispatch = useDispatch();
  const config = {
    conditions: deleteCondition,
    medications: deleteMedication,
    encounters: deleteEncounter,
    admissions: deleteAdmission,
    labResults: deleteLabResult,
    documents: deleteDocument,
    vitals: deleteVital,
  };

  const remove = async () => {
    if (!window.confirm(`Delete this ${FORM_CONFIG[type].title.toLowerCase()}?`)) return;
    const res = await dispatch(config[type]({ patientId, id: getId(item) }));
    if (!res.error) dispatch(addToast({ type: 'success', message: `${FORM_CONFIG[type].title} deleted` }));
  };

  return (
    <div className="flex shrink-0 items-center gap-3">
      <IconButton title="View Details" onClick={() => onView(type, item)} className="w-10 h-10 rounded-xl bg-white border border-[#DDE3F0] hover:bg-[#F8FAFF]"><Eye size={16} /></IconButton>
      {canEdit && (
        <>
          <IconButton title="Edit" onClick={() => onEdit(type, item)} className="w-10 h-10 rounded-xl bg-white border border-[#DDE3F0] hover:bg-[#F8FAFF]"><Edit3 size={16} /></IconButton>
          <IconButton title="Delete" onClick={remove} className="w-10 h-10 rounded-xl bg-white border border-[#DDE3F0] hover:text-red-600 hover:border-red-200"><Trash2 size={16} /></IconButton>
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
  const vitals = useSelector(selectVitals);
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
    vitals: vitals.length,
  }), [admissions.length, conditions, documents.length, encounters.length, labResults.length, medications.length, vitals.length]);

  const tabs = [
    ['overview', 'Overview', Activity],
    ['conditions', 'Conditions', HeartPulse],
    ['medications', 'Medications', Pill],
    ['encounters', 'Encounters', UserRound],
    ['admissions', 'Admissions', BedDouble],
    ['labResults', 'Labs', FlaskConical],
    ['vitals', 'Vitals', Thermometer],
    ['documents', 'Documents', FileText],
    ['timeline', 'Timeline', Clock],
  ];

  const addButton = (type) => canEdit ? (
    <button
      type="button"
      onClick={() => setModal({ type })}
      className="flex items-center gap-2 px-6 py-2.5 bg-[#C8102E] text-white rounded-xl text-sm font-black hover:bg-[#9B0A21] transition-all shadow-lg shadow-red-900/10"
    >
      <Plus size={18} /> Add
    </button>
  ) : null;

  const renderList = (type, items, render) => (
    items.length === 0 ? <Empty>No {FORM_CONFIG[type].title.toLowerCase()} records found.</Empty> : (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={getId(item) || JSON.stringify(item)} className="flex items-start justify-between gap-6 rounded-2xl border border-[#DDE3F0] bg-white p-6 shadow-sm hover:shadow-md transition-all">
            <div className="min-w-0 flex-1">{render(item)}</div>
            <RowActions type={type} item={item} patientId={patientId} canEdit={canEdit} onEdit={(t, i) => setModal({ type: t, item: i })} onView={(t, i) => setViewModal({ type: t, item: i })} />
          </div>
        ))}
      </div>
    )
  );

  const searchResults = useSelector(selectPatientSearchResults);
  const matchedPatient = searchResults?.find((p) => patientIdOf(p) === patientId);
  const [fetchedPatientName, setFetchedPatientName] = useState(null);

  useEffect(() => {
    if (!matchedPatient && patientId && user?.role !== 'PATIENT') {
      client.get(`/api/admin/patients/search`, { params: { query: patientId, limit: 1 }, hideToast: true })
        .then(res => {
          const pt = (res.data?.content || res.data || []).find(p => patientIdOf(p) === patientId);
          if (pt) setFetchedPatientName(patientName(pt));
        })
        .catch(() => { });
    }
  }, [patientId, matchedPatient, user?.role]);

  let displayName = 'Unknown Name';
  if (fetchedPatientName) {
    displayName = fetchedPatientName;
  } else if (user?.role === 'PATIENT') {
    displayName = patientName(user);
  } else if (matchedPatient) {
    displayName = patientName(matchedPatient);
  } else if (summary) {
    const pt = summary.patient || summary;
    const nameStr = pt.patientName || pt.name || [pt.firstName, pt.lastName].filter(Boolean).join(' ');
    if (nameStr) displayName = nameStr;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF] px-3 pt-1.5 pb-2 space-y-1.5 w-full flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header Section */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="bg-white border border-[#DDE3F0] px-2 py-1 rounded-md shadow-sm flex items-center gap-1.5">
            <Activity size={11} className="text-[#C8102E]" />
            <h1 className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wider">Medical Record</h1>
          </div>
          {patientId && (
            <div className="bg-[#E8EEF8] border border-[#DDE3F0] px-2 py-1 rounded-md shadow-sm flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-[#4B5A7A] uppercase tracking-wider">Patient</span>
              <span className="text-[10px] font-black text-brand-blue">{displayName}</span>
              <span className="text-[9px] font-bold text-[#8A97B0] border-l border-[#DDE3F0] pl-1.5 ml-0.5">ID: {patientId}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {patientId && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/epcr/new?patientId=${patientId}`)}
                className="flex items-center gap-1 px-2.5 py-1 bg-brand-blue border border-brand-blue rounded-md text-[10px] font-black text-white hover:bg-blue-700 transition-all shadow-sm"
              >
                + New ePCR
              </button>
              <button
                type="button"
                onClick={() => dispatch(fetchAllPatientHistory(patientId))}
                className="flex items-center gap-1 px-2 py-1 bg-white border border-[#DDE3F0] rounded-md text-[10px] font-black text-[#0F1A3A] hover:bg-[#F8FAFF] transition-all shadow-sm"
              >
                <RefreshCw size={10} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </>
          )}
          {canSearch && patientId && (
            <button
              type="button"
              onClick={() => { dispatch(clearHistory()); navigate('/patient-history'); }}
              className="text-[10px] font-bold text-[#8A97B0] hover:text-brand-blue transition-colors px-1.5 py-1"
            >
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
        <div className="py-10 text-center card bg-[#F8FAFF] border-dashed border-2">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-[#DDE3F0]">
            <Search className="text-brand-blue" size={20} />
          </div>
          <h3 className="text-base font-black text-[#0F1A3A] mb-1 uppercase">Identify Patient</h3>
          <p className="text-xs font-semibold text-[#8A97B0] max-w-md mx-auto">
            Use the search panel above to find a patient by name, phone, or email to view their complete clinical history.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          {/* Summary Stats Grid */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { label: 'Conditions', value: counts.activeConditions, icon: HeartPulse, color: 'text-red-500', bg: 'bg-red-50' },
              { label: 'Meds', value: counts.medications, icon: Pill, color: 'text-blue-500', bg: 'bg-blue-50' },
              { label: 'Visits', value: counts.encounters, icon: UserRound, color: 'text-purple-500', bg: 'bg-purple-50' },
              { label: 'Admissions', value: counts.admissions, icon: BedDouble, color: 'text-orange-500', bg: 'bg-orange-50' },
              { label: 'Labs', value: counts.labs, icon: FlaskConical, color: 'text-green-500', bg: 'bg-green-50' },
              { label: 'Docs', value: counts.documents, icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50' },
              { label: 'Vitals', value: counts.vitals, icon: Thermometer, color: 'text-teal-500', bg: 'bg-teal-50' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white px-2 py-1 rounded-md border border-[#DDE3F0] shadow-sm hover:shadow-md transition-all flex items-center gap-1.5">
                <div className={`w-5 h-5 ${stat.bg} ${stat.color} rounded flex items-center justify-center shrink-0`}>
                  <stat.icon size={10} />
                </div>
                <span className="text-xs font-black text-[#0F1A3A]">{stat.value}</span>
                <span className="text-[9px] font-bold text-[#A0AECB] uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Horizontal Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-0.5 p-0.5 bg-white border border-[#DDE3F0] rounded-lg shadow-sm shrink-0">
            {tabs.map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-[11px] font-bold ${tab === id
                  ? 'bg-[#C8102E] text-white shadow-sm shadow-red-900/20'
                  : 'text-[#8A97B0] hover:bg-[#F8FAFF] hover:text-[#4B5A7A]'
                  }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="min-w-0 flex-1 pr-1 -mr-1 flex flex-col min-h-0">
            {loading ? (
              <div className="py-20 text-center card bg-white rounded-2xl border border-[#DDE3F0]">
                <RefreshCw className="animate-spin w-12 h-12 mx-auto mb-4 text-brand-blue/30" />
                <p className="text-sm font-bold text-[#8A97B0]">Loading record...</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 flex-1 flex flex-col">

                {tab === 'overview' && (
                  <div className="flex flex-col gap-3 flex-1">



                    {/* ── Row 1: Conditions + Medications (compact wrapping chips) ── */}
                    <div className="grid grid-cols-2 gap-2 shrink-0">
                      {/* Conditions */}
                      <div className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm px-3 py-1.5">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-md bg-red-50 flex items-center justify-center shrink-0"><HeartPulse size={11} className="text-red-600" /></div>
                            <span className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide">Conditions</span>
                            <span className="text-[9px] font-black text-red-600 bg-red-50 px-1 rounded">{conditions.filter(c => c.status === 'ACTIVE').length} active</span>
                          </div>
                          {canEdit && <button type="button" onClick={() => setModal({ type: 'conditions' })} className="w-5 h-5 rounded-md bg-[#C8102E] text-white flex items-center justify-center shrink-0"><Plus size={9} /></button>}
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-[52px] overflow-y-auto custom-scrollbar">
                          {conditions.length === 0 ? <span className="text-[9px] text-[#A0AECB]">None on record</span> : conditions.map((c, i) => (
                            <span key={getId(c) || i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusClass(c.status)}`}>
                              <span className={`w-1 h-1 rounded-full shrink-0 ${c.status === 'ACTIVE' ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`} />
                              {c.name}{c.severity ? ` · ${c.severity}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Medications */}
                      <div className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm px-3 py-1.5">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 rounded-md bg-purple-50 flex items-center justify-center shrink-0"><Pill size={11} className="text-purple-600" /></div>
                            <span className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide">Medications</span>
                            <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-1 rounded">{medications.filter(m => !m.status || m.status === 'ACTIVE').length} active</span>
                          </div>
                          {canEdit && <button type="button" onClick={() => setModal({ type: 'medications' })} className="w-5 h-5 rounded-md bg-[#C8102E] text-white flex items-center justify-center shrink-0"><Plus size={9} /></button>}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {medications.length === 0 ? <span className="text-[9px] text-[#A0AECB]">None on record</span> : medications.map((m, i) => (
                            <span key={getId(m) || i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusClass(m.status)}`}>
                              {m.name || m.medicationName}{m.dosage ? ` ${m.dosage}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ── Incidents (Pre/Post Layout + 4 Clinical Cards per Condition) ── */}
                    {(() => {
                      const isImageFile = (doc) => {
                        const name = (doc.fileName || doc.name || '').toLowerCase();
                        return /\.(jpe?g|png|gif|webp|svg|bmp|tiff?)$/.test(name);
                      };

                      const QuickDocBox = ({ label, color, accent, docs, imgs, conditionId, phase }) => {
                        return (
                          <section className={`bg-white border ${color} rounded-lg shadow-sm overflow-hidden shrink-0`}>
                            <div className={`flex items-center justify-between border-b ${color} px-2 py-1 ${accent} shrink-0`}>
                              <div className="flex items-center gap-2">
                                <div className={`h-6 w-6 rounded-lg flex items-center justify-center ${accent}`}><FileText size={13} /></div>
                                <div>
                                  <h2 className="text-[10px] font-black text-[#0F1A3A]">{label} Documents</h2>
                                  <p className="text-[9px] font-bold text-[#A0AECB]">{docs.length + imgs.length} file{docs.length + imgs.length !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => setModal({
                                    type: 'documents',
                                    initialValues: {
                                      conditionId: conditionId || '',
                                      documentPhase: phase,
                                    },
                                  })}
                                  className="w-5 h-5 rounded-md bg-[#C8102E] text-white flex items-center justify-center shrink-0"
                                >
                                  <Plus size={9} />
                                </button>
                              )}
                            </div>
                            <div className="bg-white">
                              {docs.length === 0 && imgs.length === 0 ? (
                                <div className="p-3 text-center">
                                  <FileText className="mx-auto text-[#A0AECB] opacity-50 mb-1" size={16} />
                                  <p className="text-[9px] font-bold text-[#0F1A3A]">No {label.toLowerCase()} documents.</p>
                                </div>
                              ) : null}
                              {imgs.length > 0 && (() => {
                                const sortedImgs = [...imgs].sort((a, b) => new Date(b.date || b.uploadedAt) - new Date(a.date || a.uploadedAt));
                                return (
                                  <div className={`${sortedImgs.length > 1 ? 'flex gap-2 overflow-x-auto custom-scrollbar p-2' : 'p-2'} border-b border-[#F0F4FC]`}>
                                    {sortedImgs.map((doc) => {
                                      return (
                                        <div key={getId(doc)} className={`flex flex-col rounded-lg overflow-hidden bg-[#0A1128] border border-[#DDE3F0] shadow-sm ${sortedImgs.length > 1 ? 'min-w-[200px]' : 'w-full'}`}>
                                          <div className="relative group">
                                            <SecureInlineImage
                                              patientId={patientId}
                                              doc={doc}
                                              className="w-full h-52 object-contain"
                                              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                                            />
                                            <div className="hidden w-full h-52 items-center justify-center text-[#A0AECB] bg-[#0A1128]">
                                              <FileText size={36} />
                                            </div>
                                            <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none flex items-start justify-between gap-2">
                                              <p className="text-[10px] font-bold text-white truncate drop-shadow-md">{doc.fileName || doc.name || 'Image'}</p>
                                              <p className="text-[8px] font-black text-white shrink-0 drop-shadow-md bg-black/40 px-1.5 py-0.5 rounded-full backdrop-blur-sm uppercase">{date(doc.date || doc.uploadedAt)}</p>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => viewSecureDocument(dispatch, patientId, getId(doc))}
                                              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all"
                                              title="Open full size"
                                            >
                                              <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/95 text-[#0F1A3A] text-[10px] font-black px-3 py-1.5 rounded-full shadow-md">
                                                <ExternalLink size={12} /> View
                                              </span>
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                              {docs.length > 0 && (() => {
                                const sortedDocs = [...docs].sort((a, b) => new Date(b.date || b.uploadedAt) - new Date(a.date || a.uploadedAt));
                                return (
                                  <div className="divide-y divide-[#F0F4FC]">
                                    {sortedDocs.map(doc => (
                                      <div key={getId(doc)} className="px-3 py-2 hover:bg-[#F8FAFF] transition-colors">
                                        <div className="flex items-start gap-3">
                                          <div className="h-8 w-8 rounded-lg bg-[#F0F4FC] flex items-center justify-center shrink-0 mt-0.5">
                                            <FileText size={16} className="text-[#475569]" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                              <p className="text-sm font-bold text-[#0F1A3A] truncate">{doc.fileName || doc.name || 'Document'}</p>
                                              <button type="button" onClick={() => viewSecureDocument(dispatch, patientId, getId(doc))} className="text-[11px] font-black text-brand-blue hover:underline shrink-0 flex items-center gap-0.5">
                                                View <ExternalLink size={12} />
                                              </button>
                                            </div>
                                            <p className="text-xs font-bold text-[#A0AECB] mt-1">
                                              {(doc.type || 'FILE').replace(/_/g, ' ')} · {date(doc.date || doc.uploadedAt)}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </section>
                        );
                      };

                      const VitalsBox = ({ label, v, accentCls, borderCls }) => {
                        const st = v ? assessVitalStatus(v) : null;
                        return (
                          <section className={`bg-white border ${borderCls} rounded-lg shadow-sm overflow-hidden shrink-0`}>
                            <div className={`flex items-center justify-between border-b ${borderCls} px-2 py-1 ${accentCls}`}>
                              <div className="flex items-center gap-1.5">
                                <div className={`h-4 w-4 rounded flex items-center justify-center ${accentCls}`}><Thermometer size={10} /></div>
                                <h2 className="text-[9px] font-black text-[#0F1A3A] uppercase tracking-wide">{label} Vitals</h2>
                                {v && <span className="text-[8px] font-bold text-[#A0AECB]">{date(v.recordedAt || v.createdAt)}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                {st && <span className={`text-[8px] font-black px-1 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>}
                                {canEdit && (
                                  <button type="button" onClick={() => setModal({ type: 'vitals' })} className="w-5 h-5 rounded-md bg-[#C8102E] text-white flex items-center justify-center hover:bg-red-700 transition-colors shrink-0">
                                    <Plus size={11} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="px-2 py-1 flex flex-wrap gap-1">
                              {(() => {
                                const VITAL_KEYS = [
                                  { k: 'BP', val: v?.systolicBP ? `${v.systolicBP}/${v.diastolicBP}` : null, u: 'mmHg', w: v && (v.systolicBP > 140 || v.systolicBP < 90) },
                                  { k: 'HR', val: v?.heartRate ?? null, u: 'bpm', w: v && (v.heartRate > 100 || v.heartRate < 60) },
                                  { k: 'SpO₂', val: v?.oxygenSaturation ?? null, u: '%', w: v && v.oxygenSaturation < 95 },
                                  { k: 'Temp', val: v?.temperature ?? null, u: '°C', w: v && (v.temperature > 37.2 || v.temperature < 36.1) },
                                  { k: 'RR', val: v?.respiratoryRate ?? null, u: '/min', w: v && (v.respiratoryRate > 20 || v.respiratoryRate < 12) },
                                  { k: 'GCS', val: v?.glasgowComaScale ?? null, u: '/15', w: v && v.glasgowComaScale < 14 },
                                ];
                                return VITAL_KEYS.map(x => (
                                  <span key={x.k} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold border ${x.val != null && x.val !== '' ? (x.w ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-[#F8FAFF] border-[#DDE3F0] text-[#0F1A3A]') : 'bg-[#F8FAFF] border-[#DDE3F0] text-[#A0AECB]'}`}>
                                    <span className="text-[7px] font-black uppercase" style={{ color: 'inherit', opacity: 0.6 }}>{x.k}</span>
                                    <span className="tabular-nums font-black">{x.val != null && x.val !== '' ? x.val : 'N/A'}</span>
                                    {x.val != null && x.val !== '' && <span className="text-[7px] text-[#8A97B0]">{x.u}</span>}
                                  </span>
                                ));
                              })()}
                            </div>
                          </section>
                        );
                      };

                      const getValidTime = (dateVal) => {
                        if (!dateVal) return null;
                        if (Array.isArray(dateVal)) {
                          return new Date(dateVal[0], dateVal[1] - 1, dateVal[2], dateVal[3] || 0, dateVal[4] || 0, dateVal[5] || 0).getTime();
                        }
                        const t = new Date(dateVal).getTime();
                        return isNaN(t) ? null : t;
                      };

                      const conditionSortTime = (condition) => getValidTime(condition.createdAt || condition.updatedAt || condition.dateDiagnosed || condition.diagnosedAt);

                      const activeConditions = conditions
                        .map((condition, index) => ({ condition, index, time: conditionSortTime(condition) }))
                        .filter(({ condition }) => !condition.status || condition.status === 'ACTIVE')
                        .sort((a, b) => {
                          if (a.time !== null && b.time !== null && a.time !== b.time) return a.time - b.time;
                          if (a.time !== null && b.time === null) return -1;
                          if (a.time === null && b.time !== null) return 1;
                          return b.index - a.index;
                        })
                        .map(({ condition }) => condition);

                      const fallbackCondition = conditions.length > 0 ? conditions[0] : null;
                      const conditionsToDisplay = activeConditions.length > 0 ? activeConditions : [fallbackCondition];

                      return (
                        <>
                          <div className="flex flex-col gap-6 mt-2">
                            {/* ── Global Vitals (Fixed after Conditions & Medications) ── */}
                            {(() => {
                              const sortedV = [...vitals].sort((a, b) => new Date(a.recordedAt || a.createdAt) - new Date(b.recordedAt || b.createdAt));
                              const preVitalCond = sortedV[0] || null;
                              const postVitalCond = sortedV.length > 1 ? sortedV[sortedV.length - 1] : null;

                              return (
                                <div className="grid grid-cols-2 gap-2 shrink-0">
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-1.5 border-b-2 border-brand-blue pb-1 shrink-0">
                                      <div className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                                      <h3 className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide">Pre-Treatment Vitals</h3>
                                    </div>
                                    <VitalsBox label="Pre-Treatment" v={preVitalCond} accentCls="bg-[#EFF6FF] text-[#1A3C8F]" borderCls="border-[#DBEAFE]" />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-1.5 border-b-2 border-green-500 pb-1 shrink-0">
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                      <h3 className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide">Post-Treatment Vitals</h3>
                                    </div>
                                    <VitalsBox label="Post-Treatment" v={postVitalCond} accentCls="bg-[#F0FDF4] text-[#16A34A]" borderCls="border-[#DCFCE7]" />
                                  </div>
                                </div>
                              );
                            })()}

                            {/* ── Repeating Incident Blocks (Images -> 4 Cards) ── */}
                            {conditionsToDisplay.map((cond, idx) => {
                              // Safely assign unlinked images to the newest condition (which is now guaranteed to be the LAST one in the correctly sorted ascending array)
                              const newestCond = conditionsToDisplay[conditionsToDisplay.length - 1];
                              const newestCondId = getId(newestCond) || newestCond?._id;

                              const condId = getId(cond) || cond?._id;
                              const isNewestCond = condId === newestCondId;
                              const blockDocs = documents.filter(d => {
                                const docConditionId = d.conditionId || d.relatedConditionId;
                                return String(docConditionId || '') === String(condId || '') || (isNewestCond && !docConditionId);
                              });

                              const PRE_KEYS = ['PRE', 'CONSENT', 'XRAY', 'X-RAY', 'REFERRAL', 'INITIAL'];
                              const POST_KEYS = ['POST', 'DISCHARGE', 'FOLLOW', 'RESULT', 'REPORT', 'PRESCRIPTION'];
                              const isPre = (d) => d.documentPhase === 'PRE' || (!d.documentPhase && PRE_KEYS.some(k => String(d.type || d.category || '').toUpperCase().includes(k)));
                              const isPost = (d) => d.documentPhase === 'POST' || (!d.documentPhase && POST_KEYS.some(k => String(d.type || d.category || '').toUpperCase().includes(k)));

                              const preDocs = blockDocs.filter(isPre);
                              const postDocs = blockDocs.filter(isPost);
                              const otherDocs = blockDocs.filter(d => !isPre(d) && !isPost(d));

                              const finalPre = preDocs.length ? preDocs : otherDocs.slice(0, Math.ceil(otherDocs.length / 2));
                              const finalPost = postDocs.length ? postDocs : otherDocs.slice(Math.ceil(otherDocs.length / 2));

                              const preImagesCond = finalPre.filter(isImageFile);
                              const preDocsOnlyCond = finalPre.filter(d => !isImageFile(d));
                              const postImagesCond = finalPost.filter(isImageFile);
                              const postDocsOnlyCond = finalPost.filter(d => !isImageFile(d));

                              return (
                                <div key={condId || idx} className="flex flex-col gap-2">
                                  {/* Incident Header (Only if multiple) */}
                                  {conditionsToDisplay.length > 1 && cond && (
                                    <div className="flex items-center gap-1.5 px-1 pt-1">
                                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                      <h3 className="text-[12px] font-black text-[#0F1A3A] uppercase tracking-wide">INCIDENT: {cond.name || 'Condition'}</h3>
                                    </div>
                                  )}

                                  {/* ── 2-Column Treatment Layout: Docs Only ── */}
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    {/* PRE-TREATMENT Column */}
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-1.5 border-b-2 border-brand-blue pb-1 shrink-0">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                                        <h3 className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide">Pre-Treatment Evidence</h3>
                                      </div>
                                      {/* Pre Doc image */}
                                      {(canEdit || preImagesCond.length > 0 || preDocsOnlyCond.length > 0) && (
                                        <div className="shrink-0"><QuickDocBox label="Pre-Treatment" color="border-[#DBEAFE]" accent="bg-[#EFF6FF] text-[#1A3C8F]" docs={preDocsOnlyCond} imgs={preImagesCond} conditionId={condId} phase="PRE" /></div>
                                      )}
                                    </div>

                                    {/* POST-TREATMENT Column */}
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-1.5 border-b-2 border-green-500 pb-1 shrink-0">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        <h3 className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide">Post-Treatment Evidence</h3>
                                      </div>
                                      {/* Post Doc image */}
                                      {(canEdit || postImagesCond.length > 0 || postDocsOnlyCond.length > 0) && (
                                        <div className="shrink-0"><QuickDocBox label="Post-Treatment" color="border-[#DCFCE7]" accent="bg-[#F0FDF4] text-[#16A34A]" docs={postDocsOnlyCond} imgs={postImagesCond} conditionId={condId} phase="POST" /></div>
                                      )}
                                    </div>
                                  </div>

                                  {/* ── 4 Clinical Cards ── */}
                                  {cond && (
                                    <div className="grid grid-cols-4 gap-2 mb-2 mt-1">
                                      <div className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm p-3 flex flex-col">
                                        <div className="flex items-center gap-1.5 mb-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                          <h3 className="text-[9px] font-black text-[#0F1A3A] uppercase tracking-wide">Findings</h3>
                                        </div>
                                        <p className="text-[10px] text-[#4B5A7A] leading-snug flex-1">{cond.findings || '—'}</p>
                                      </div>
                                      <div className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm p-3 flex flex-col">
                                        <div className="flex items-center gap-1.5 mb-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                          <h3 className="text-[9px] font-black text-[#0F1A3A] uppercase tracking-wide">Symptoms</h3>
                                        </div>
                                        <p className="text-[10px] text-[#4B5A7A] leading-snug flex-1">{cond.symptoms || '—'}</p>
                                      </div>
                                      <div className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm p-3 flex flex-col">
                                        <div className="flex items-center gap-1.5 mb-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                          <h3 className="text-[9px] font-black text-[#0F1A3A] uppercase tracking-wide">Analysis</h3>
                                        </div>
                                        <p className="text-[10px] text-[#4B5A7A] leading-snug flex-1">{cond.analysis || '—'}</p>
                                      </div>
                                      <div className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm p-3 flex flex-col">
                                        <div className="flex items-center gap-1.5 mb-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                          <h3 className="text-[9px] font-black text-[#0F1A3A] uppercase tracking-wide">Recommended Treatment</h3>
                                        </div>
                                        <p className="text-[10px] text-[#4B5A7A] leading-snug flex-1">{cond.recommendedTreatment || '—'}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* ── 2-Column Treatment Layout: Bottom (Labs/Procedures) ── */}
                          <div className="grid grid-cols-2 gap-2 mt-2 flex-1">
                            {/* Lab Results */}
                            <div className="flex flex-col flex-1">
                              <section className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm overflow-hidden flex flex-col flex-1">
                                <div className="flex items-center justify-between border-b border-[#DDE3F0] px-2 py-1 shrink-0 bg-[#F8FAFF]">
                                  <div className="flex items-center gap-2">
                                    <div className="h-5 w-5 rounded-md bg-[#DBEAFE] flex items-center justify-center"><FlaskConical size={11} className="text-[#1A3C8F]" /></div>
                                    <h2 className="text-[10px] font-black text-[#0F1A3A]">Lab Results</h2>
                                  </div>
                                  {canEdit && (
                                    <button type="button" onClick={() => setModal({ type: 'labResults' })} className="w-5 h-5 rounded-md bg-[#C8102E] text-white flex items-center justify-center hover:bg-red-700 transition-colors shrink-0">
                                      <Plus size={11} />
                                    </button>
                                  )}
                                </div>
                                <div className="divide-y divide-[#F0F4FC] overflow-y-auto custom-scrollbar max-h-[150px]">
                                  {labResults.length === 0 ? <div className="p-2"><Empty>No lab results.</Empty></div> : labResults.map(lab => (
                                    <div key={getId(lab)} className="flex flex-col gap-1 px-2 py-1.5 hover:bg-[#F8FAFF] transition-colors">
                                      <div className="flex items-center justify-between">
                                        <div className="min-w-0">
                                          <p className="text-[10px] font-bold text-[#0F1A3A] truncate">{lab.testName || lab.name}</p>
                                          <p className="text-[9px] font-bold text-[#A0AECB]">{date(lab.date || lab.resultDate)}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-xs font-black text-brand-blue shrink-0 ml-1">{text(lab.value)} <span className="text-[9px] text-[#8A97B0]">{lab.unit}</span></p>
                                          {lab.interpretation && (
                                            <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${String(lab.interpretation).toUpperCase() === 'NORMAL' ? 'text-green-600' : 'text-red-500'
                                              }`}>{lab.interpretation}</p>
                                          )}
                                        </div>
                                      </div>
                                      {lab.normalRange && (
                                        <p className="text-[8px] text-[#8A97B0] font-semibold">Ref Range: {lab.normalRange}</p>
                                      )}
                                      {lab.notes && (
                                        <p className="text-[9px] text-[#4B5A7A] italic leading-tight border-l-2 border-[#DDE3F0] pl-1.5">{lab.notes}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </section>
                            </div>

                            {/* Procedures */}
                            <div className="flex flex-col flex-1">
                              <section className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm overflow-hidden flex flex-col flex-1">
                                <div className="flex items-center justify-between border-b border-[#DDE3F0] px-2 py-1 shrink-0 bg-[#F8FAFF]">
                                  <div className="flex items-center gap-2">
                                    <div className="h-5 w-5 rounded-md bg-orange-50 flex items-center justify-center"><Stethoscope size={11} className="text-orange-600" /></div>
                                    <h2 className="text-[10px] font-black text-[#0F1A3A]">Procedures &amp; Visits</h2>
                                  </div>
                                  {canEdit && (
                                    <button type="button" onClick={() => setModal({ type: 'encounters' })} className="w-5 h-5 rounded-md bg-[#C8102E] text-white flex items-center justify-center hover:bg-red-700 transition-colors shrink-0">
                                      <Plus size={11} />
                                    </button>
                                  )}
                                </div>
                                <div className="divide-y divide-[#F0F4FC] max-h-[80px] overflow-y-auto custom-scrollbar">
                                  {encounters.length === 0 ? <div className="p-2"><Empty>No visits.</Empty></div> : encounters.map(enc => (
                                    <div key={getId(enc)} className="px-2 py-1">
                                      <div className="flex items-center justify-between gap-1">
                                        <p className="text-[10px] font-bold text-[#0F1A3A] truncate">{enc.chiefComplaint || enc.type || 'Visit'}</p>
                                        {enc.outcome && <Badge className="bg-[#E8EEF8] text-brand-blue border-[#DDE3F0] text-[9px] shrink-0">{enc.outcome}</Badge>}
                                      </div>
                                      <p className="text-[9px] font-bold text-[#A0AECB]">{date(enc.date || enc.encounterDate)}</p>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            </div>
                          </div>

                          {/* ── Recent Activity (compact rows) at bottom ── */}
                          <div className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm overflow-hidden shrink-0 mt-2">
                            <div className="flex items-center gap-2 border-b border-[#DDE3F0] px-3 py-1.5">
                              <div className="h-5 w-5 rounded-md bg-[#E8EEF8] flex items-center justify-center"><Clock size={11} className="text-[#4B5A7A]" /></div>
                              <h2 className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide">Recent Activity</h2>
                              <span className="text-[9px] font-bold text-[#A0AECB]">{timeline.length} event{timeline.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="divide-y divide-[#F0F4FC] max-h-[140px] overflow-y-auto custom-scrollbar">
                              {timeline.length === 0
                                ? <p className="text-[9px] text-[#A0AECB] px-3 py-2">No activity recorded yet.</p>
                                : timeline.slice(0, 8).map((item, index) => {
                                  const st = getEventStyle(item.eventType || item.type);
                                  const Icon = st.icon;
                                  const eventDate = item.date || item.eventDate || item.timestamp;
                                  return (
                                    <button
                                      key={timelineKey(item, index)}
                                      type="button"
                                      onClick={() => setTimelineViewItem(item)}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#F8FAFF] transition-colors text-left"
                                    >
                                      <div className="h-5 w-5 rounded flex items-center justify-center shrink-0" style={{ background: st.bg, color: st.color }}>
                                        <Icon size={10} />
                                      </div>
                                      <span className="text-[9px] font-black uppercase tracking-wide shrink-0" style={{ color: st.color }}>{st.label}</span>
                                      <span className="text-[9px] font-bold text-[#0F1A3A] truncate flex-1">{item.title || ''}</span>
                                      <span className="text-[8px] font-bold text-[#A0AECB] shrink-0">{eventDate ? relativeTime(eventDate) : ''}</span>
                                    </button>
                                  );
                                })
                              }
                            </div>
                          </div>
                        </>
                      );
                    })()}

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
                  <div className="space-y-6">
                    <EncounterAnalytics encounters={encounters} />
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
                  </div>
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
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <p className="text-lg font-black text-[#0F1A3A] tracking-tight mb-1">{text(item.fileName || item.name, 'Document')}</p>
                          <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest flex items-center gap-2">
                            {text(item.type, 'Document').replace(/_/g, ' ')} <span className="text-[#DDE3F0]">•</span> {date(item.date || item.uploadedAt)}
                          </p>
                          {item.notes && <p className="mt-3 text-sm font-semibold text-[#4B5A7A] leading-relaxed max-w-2xl">{item.notes}</p>}
                          {item.symptoms && <p className="mt-2 text-sm text-[#4B5A7A]"><span className="font-bold">Symptoms:</span> {item.symptoms}</p>}
                          {item.findings && <p className="mt-2 text-sm text-[#4B5A7A]"><span className="font-bold">Findings:</span> {item.findings}</p>}
                          {item.analysis && <p className="mt-2 text-sm text-[#4B5A7A]"><span className="font-bold">Analysis:</span> {item.analysis}</p>}
                          {item.recommendedTreatment && <p className="mt-2 text-sm text-[#4B5A7A]"><span className="font-bold">Recommended Treatment:</span> {item.recommendedTreatment}</p>}
                        </div>
                        {(item.fileUrl || item.url) && (
                          <button
                            type="button"
                            onClick={() => viewSecureDocument(dispatch, patientId, getId(item), item.fileName || item.name || item.fileUrl || item.url)}
                            className="mr-6 flex items-center gap-2 text-xs font-black text-brand-blue hover:underline"
                          >
                            View <ExternalLink size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </Section>
                )}

                {tab === 'vitals' && (
                  <VitalsTab
                    vitals={vitals}
                    canEdit={canEdit}
                    onAdd={() => setModal({ type: 'vitals' })}
                    onEdit={(v) => setModal({ type: 'vitals', item: v })}
                    onView={(v) => setViewModal({ type: 'vitals', item: v })}
                    onDelete={async (v) => {
                      if (!window.confirm('Delete this vital reading?')) return;
                      const res = await dispatch(deleteVital({ patientId, id: v.id }));
                      if (!res.error) dispatch(addToast({ type: 'success', message: 'Vital reading deleted' }));
                    }}
                  />
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
              </div>
            )}
          </div>
        </div>
      )
      }

      {
        modal && patientId && (
          <HistoryModal type={modal.type} item={modal.item} patientId={patientId} initialValues={modal.initialValues} onClose={() => setModal(null)} />
        )
      }
      {
        viewModal && (
          <ViewModal type={viewModal.type} item={viewModal.item} onClose={() => setViewModal(null)} />
        )
      }
      {
        timelineViewItem && (
          <TimelineViewModal item={timelineViewItem} onClose={() => setTimelineViewItem(null)} />
        )
      }
    </div >
  );
}

export default PatientHistory;
