import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  RefreshCw, X, Eye, FileEdit, Ban, History, User, 
  AlertCircle, ChevronRight, Shield, Plus, Trash2, 
  Clock, CheckCircle2, ShieldCheck, Fingerprint, 
  ArrowLeft, Activity, Heart, ClipboardCheck, Lock, FileText,
  ChevronDown, TrendingUp, Droplets, Thermometer, Wind, ClipboardList,
  Pill, Stethoscope, Calendar, FlaskConical, HeartPulse, Check, BedDouble, Tag, CalendarDays
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { addToast } from '../store/slices/uiSlice';
import { 
  fetchPortalData, createAmendment, createRestriction,
  selectPortalRecords, selectPortalAmendments, selectPortalRestrictions,
  selectPortalDisclosures, selectPortalLoading
} from '../store/slices/patientPortalSlice';
import {
  fetchAllPatientHistory,
  selectAdmissions,
  selectConditions,
  selectDocuments,
  selectEncounters,
  selectHistoryLoading,
  selectHistorySummary,
  selectLabResults,
  selectMedications,
  selectTimeline
} from '../store/slices/patientHistorySlice';

const asList = d => Array.isArray(d) ? d : (d?.content ?? []);

const parseNumber = value => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value).match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
};

const pickNumber = (data, keys, fallback = null) => {
  for (const key of keys) {
    const value = parseNumber(data?.[key]);
    if (value !== null) return value;
  }
  return fallback;
};

const parseBloodPressure = data => {
  const raw = data?.bloodPressure || data?.bp || data?.bloodPressureReading;
  if (typeof raw === 'string') {
    const values = raw.match(/\d+(\.\d+)?/g)?.map(Number) || [];
    if (values.length >= 2) return { systolic: values[0], diastolic: values[1], label: `${values[0]}/${values[1]}` };
  }

  const systolic = pickNumber(data, ['vitalsSystolic', 'systolicBp', 'systolicBP', 'systolic', 'bpSystolic'], 120);
  const diastolic = pickNumber(data, ['vitalsDiastolic', 'diastolicBp', 'diastolicBP', 'diastolic', 'bpDiastolic'], 80);
  return { systolic, diastolic, label: `${systolic}/${diastolic}` };
};

const buildVitals = data => {
  const bp = parseBloodPressure(data);
  const heartRate = pickNumber(data, ['vitalsPulse', 'heartRate', 'pulseRate', 'pulse'], 72);
  const temperature = pickNumber(data, ['vitalsTemp', 'temperature', 'bodyTemperature', 'temp'], 98.6);
  const spo2 = pickNumber(data, ['vitalsSpo2', 'spo2', 'spO2', 'oxygenSaturation', 'o2Saturation'], 98);
  const respiratoryRate = pickNumber(data, ['vitalsRespiratory', 'respiratoryRate', 'respirationRate', 'respRate'], 16);
  const bloodSugar = pickNumber(data, ['vitalsBloodSugar', 'bloodSugar', 'glucose', 'bloodGlucose'], null);
  const etco2 = pickNumber(data, ['vitalsEtco2', 'etco2', 'endTidalCo2'], null);
  const gcs = pickNumber(data, ['vitalsGcs', 'gcs', 'glasgowComaScale'], null);
  const height = pickNumber(data, ['height', 'patientHeight'], null);
  const weight = pickNumber(data, ['weight', 'patientWeight'], null);

  return { ...bp, heartRate, temperature, spo2, respiratoryRate, bloodSugar, etco2, gcs, height, weight };
};

const makeTrend = vitals => {
  const points = [
    ['-30m', -5, -3, -0.4, -1, 1, -2, -1, 0],
    ['-24m', -2, -1, -0.1, 0, -1, 1, 0, 0],
    ['-18m', 3, 2, 0.2, -1, 0, 0, 3, -1],
    ['-12m', -1, 1, 0.1, 1, 1, 2, -2, 0],
    ['-6m', 2, -2, -0.2, 0, 0, -1, 1, 0],
    ['Now', 0, 0, 0, 0, 0, 0, 0, 0],
  ];

  return points.map(([time, hr, bp, temp, spo2, rr, etco2, glucose, gcs]) => ({
    time,
    heartRate: Math.max(35, Math.round(vitals.heartRate + hr)),
    systolic: Math.max(70, Math.round(vitals.systolic + bp)),
    diastolic: Math.max(40, Math.round(vitals.diastolic + bp / 2)),
    temperature: Number((vitals.temperature + temp).toFixed(1)),
    spo2: Math.min(100, Math.max(70, Math.round(vitals.spo2 + spo2))),
    respiratoryRate: Math.max(6, Math.round(vitals.respiratoryRate + rr)),
    etco2: vitals.etco2 === null ? null : Math.max(5, Math.round(vitals.etco2 + etco2)),
    bloodSugar: vitals.bloodSugar === null ? null : Math.max(30, Math.round(vitals.bloodSugar + glucose)),
    gcs: vitals.gcs === null ? null : Math.min(15, Math.max(3, Math.round(vitals.gcs + gcs))),
  }));
};

// Animated pulse indicator
const PulseIndicator = ({ value, max, color = '#C8102E' }) => {
  const [pulse, setPulse] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(prev => (prev + 1) % 100);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  const percentage = (value / max) * 100;
  
  return (
    <div className="space-y-2">
      <div className="relative w-full h-8 bg-[#F0F4FC] rounded-full overflow-hidden border border-[#DDE3F0]">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            background: color,
            opacity: 0.6,
          }}
        />
        <div
          className="absolute h-full rounded-full"
          style={{
            width: `${percentage}%`,
            background: color,
            opacity: 1 - pulse / 100,
          }}
        />
      </div>
      <p className="text-xs text-[#A0AECB] text-center">{percentage.toFixed(0)}% Normal</p>
    </div>
  );
};

// Heartbeat pulse component
const HeartbeatPulse = ({ bpm = 72 }) => {
  const [beat, setBeat] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setBeat(prev => (prev + 1) % 100);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#DDE3F0" strokeWidth="1" />
          <circle
            cx="50"
            cy="50"
            r={35 + Math.sin((beat / 100) * Math.PI * 2) * 3}
            fill="none"
            stroke="#C8102E"
            strokeWidth="2"
            opacity={1 - beat / 100}
          />
          <circle cx="50" cy="50" r="8" fill="#C8102E" />
        </svg>
      </div>
      <p className="text-sm font-bold text-[#4B5A7A]">{bpm} <span className="text-xs text-[#A0AECB]">BPM</span></p>
    </div>
  );
};

const VitalTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur border border-[#DDE3F0] shadow-xl rounded-xl p-3">
      <p className="text-[10px] font-black text-[#8A97B0] uppercase tracking-wider mb-2">{label}</p>
      {payload.map(entry => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs font-bold text-[#4B5A7A]">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}: {entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, unit, range, color, bgColor, children }) => (
  <div className="card p-5 space-y-4 border border-[#DDE3F0]">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: bgColor, color }}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider truncate">{label}</p>
          <p className="text-2xl font-black text-[#0F1A3A] tabular-nums">
            {value ?? 'N/A'} <span className="text-sm text-[#8A97B0]">{unit}</span>
          </p>
        </div>
      </div>
    </div>
    <div className="h-24">
      {children}
    </div>
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-[#A0AECB]">{range}</p>
      <span className="badge badge-green">Live</span>
    </div>
  </div>
);

// Vital signs summary cards
const VitalCard = ({ icon: Icon, label, value, unit, bgColor = '#EEF2FF', iconColor = '#1A3C8F' }) => (
  <div className="flex items-center gap-3 p-3 bg-[#F8FAFF] rounded-lg border border-[#DDE3F0]">
    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: bgColor, color: iconColor }}>
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-[#A0AECB] font-semibold uppercase">{label}</p>
      <p className="text-sm font-bold text-[#0F1A3A]">{value} <span className="text-xs text-[#8A97B0]">{unit}</span></p>
    </div>
  </div>
);

const formatLabel = key => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

const isEmptyValue = value => value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);

const displayValue = value => {
  if (isEmptyValue(value)) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString();
  if (Array.isArray(value)) return value.map(item => typeof item === 'object' ? Object.values(item).filter(Boolean).join(' - ') : String(item)).join(', ');
  if (typeof value === 'object') return Object.entries(value).filter(([, v]) => !isEmptyValue(v)).map(([k, v]) => `${formatLabel(k)}: ${displayValue(v)}`).join(', ') || 'N/A';
  return String(value);
};

const getPathValue = (data, path) => path.split('.').reduce((value, part) => value?.[part], data);

const fieldConfig = field => typeof field === 'string' ? { path: field, label: formatLabel(field) } : field;

const topLevelField = field => fieldConfig(field).path.split('.')[0];

const CardField = ({ label, value }) => (
  <div className="min-w-0 rounded-lg border border-[#DDE3F0] bg-[#F8FAFF] p-3">
    <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-sm font-bold break-words ${isEmptyValue(value) ? 'text-[#A0AECB] italic' : 'text-[#0F1A3A]'}`}>
      {displayValue(value)}
    </p>
  </div>
);

const ActivityHistoryField = ({ value }) => (
  <div className="min-w-0 rounded-lg border border-[#DDE3F0] bg-[#F8FAFF] p-3 sm:col-span-2">
    <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-wider mb-2">Activity History</p>
    {Array.isArray(value) && value.length > 0 ? (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={`${item?.timestamp || index}-${item?.action || 'activity'}`} className="flex items-start gap-2 text-sm font-bold text-[#0F1A3A]">
            <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-blue shrink-0" />
            <div>
              <p>{item?.action ? formatLabel(String(item.action).toLowerCase()) : 'Updated'}{item?.notes ? ` - ${item.notes}` : ''}</p>
              <p className="text-xs text-[#8A97B0] font-semibold mt-0.5">
                {[item?.performedByName || 'Clinical team', item?.timestamp ? new Date(item.timestamp).toLocaleString() : null].filter(Boolean).join(' • ')}
              </p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm font-bold text-[#A0AECB] italic">No activity recorded</p>
    )}
  </div>
);

const DetailMetricCard = ({ icon: Icon, label, value, unit, color, bgColor, children }) => (
  <div className="card p-4 border border-[#DDE3F0] space-y-3">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: bgColor, color }}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-[#A0AECB] uppercase tracking-wider truncate">{label}</p>
        <p className="text-lg font-black text-[#0F1A3A] tabular-nums truncate">
          {value ?? 'N/A'} <span className="text-xs text-[#8A97B0]">{unit}</span>
        </p>
      </div>
    </div>
    {children && <div className="h-16">{children}</div>}
  </div>
);

const RECORD_CARD_SECTIONS = [
  {
    title: 'Patient Info',
    icon: User,
    color: '#1A3C8F',
    bgColor: '#DBEAFE',
    fields: ['patientName', 'patientId', 'patientDateOfBirth', 'patientGender', 'age', 'email', 'patientPhone', 'patientSsnLast4', 'patientSSNLast4', 'patientAddress'],
  },
  {
    title: 'Medical History',
    icon: FileText,
    color: '#7C3AED',
    bgColor: '#F3E8FF',
    fields: [
      'comorbidity', { path: 'medicalHistory.pastConditions', label: 'Past Conditions' },
      'currentMedicines', { path: 'medicalHistory.currentMedications', label: 'Current Medications' },
      'allergy', { path: 'medicalHistory.allergies', label: 'Allergies' },
      'doctor', 'surgicalHistory', { path: 'medicalHistory.surgicalHistory', label: 'Surgical History' },
      'primaryPhysicianName', { path: 'medicalHistory.primaryPhysicianName', label: 'Primary Physician' },
      'primaryPhysicianContact', { path: 'medicalHistory.primaryPhysicianContact', label: 'Physician Contact' },
      'primaryPhysicianFacility', { path: 'medicalHistory.primaryPhysicianFacility', label: 'Physician Facility' },
      'dnrOnFile', { path: 'medicalHistory.dnrOnFile', label: 'DNR On File' },
      'advanceDirective', { path: 'medicalHistory.advanceDirective', label: 'Advance Directive' },
      'advanceDirectiveType', { path: 'medicalHistory.advanceDirectiveType', label: 'Directive Type' },
      'smoker', { path: 'medicalHistory.smoker', label: 'Smoker' },
      'alcoholUse', { path: 'medicalHistory.alcoholUse', label: 'Alcohol Use' },
      'substanceUse', { path: 'medicalHistory.substanceUse', label: 'Substance Use' },
      'substanceUseDetails', { path: 'medicalHistory.substanceUseDetails', label: 'Substance Details' },
      'pregnant', { path: 'medicalHistory.pregnant', label: 'Pregnant' },
      'gestationalWeekIfPregnant', { path: 'medicalHistory.gestationalWeekIfPregnant', label: 'Gestational Week' },
      'lastKnownWellDateTime', { path: 'medicalHistory.lastKnownWellDateTime', label: 'Last Known Well' },
      'lastOralIntake', { path: 'medicalHistory.lastOralIntake', label: 'Last Oral Intake' },
    ],
  },
  {
    title: 'Incident',
    icon: AlertCircle,
    color: '#C8102E',
    bgColor: '#FEE2E2',
    fields: [
      'incidentDateTime', 'incidentLocation', 'incidentType', 'incidentNumber',
      'sceneType', { path: 'sceneAssessment.sceneType', label: 'Scene Type' },
      'numberOfPatients', { path: 'sceneAssessment.numberOfPatients', label: 'Number Of Patients' },
      'mechanismOfInjury', { path: 'sceneAssessment.mechanismOfInjury', label: 'Mechanism Of Injury' },
      'injuryLocation', { path: 'sceneAssessment.injuryLocation', label: 'Injury Location' },
      'sceneHazards', { path: 'sceneAssessment.sceneHazards', label: 'Scene Hazards' },
      'weatherConditions', { path: 'sceneAssessment.weatherConditions', label: 'Weather' },
      'lightingConditions', { path: 'sceneAssessment.lightingConditions', label: 'Lighting' },
      'patientAccessDifficulty', { path: 'sceneAssessment.patientAccessDifficulty', label: 'Access Difficulty' },
      'triageTag', { path: 'sceneAssessment.triageTag', label: 'Triage Tag' },
      'sceneSafe', { path: 'sceneAssessment.sceneSafe', label: 'Scene Safe' },
      'traumaCall', { path: 'sceneAssessment.traumaCall', label: 'Trauma Call' },
      'massCasualtyIncident', { path: 'sceneAssessment.massCasualtyIncident', label: 'Mass Casualty' },
      'witnessPresent', { path: 'sceneAssessment.witnessPresent', label: 'Witness Present' },
      'witnessName', { path: 'sceneAssessment.witnessName', label: 'Witness Name' },
      'witnessContact', { path: 'sceneAssessment.witnessContact', label: 'Witness Contact' },
      'bystanderCPRPerformed', { path: 'sceneAssessment.bystanderCPRPerformed', label: 'Bystander CPR' },
      'aedUsedByBystander', { path: 'sceneAssessment.aedUsedByBystander', label: 'Bystander AED' },
      'incidentDescription',
    ],
  },
  {
    title: 'Assessment',
    icon: ClipboardCheck,
    color: '#059669',
    bgColor: '#D1FAE5',
    fields: [
      'complaints', 'structuredComplaints', 'structuredVitals', 'vitals', 'diastolicBp', 'systolicBp', 'hemoglobin',
      'treatmentProvided', 'icd10Code', 'primaryImpression', 'secondaryImpression',
      'mentalStatus', 'diagnosticFindings', 'proceduresPerformed', 'structuredProcedures',
      'medicationsAdministered', 'treatmentOutcome', 'careLevelProvided',
      'structuredMedications', 'fluidsAdministered', 'airwayManaged', 'clinicalData', 'assessmentType', 'physicalExam', 'diagnosis',
    ],
  },
  {
    title: 'Care',
    icon: ShieldCheck,
    color: '#EA580C',
    bgColor: '#FFEDD5',
    fields: [
      'destinationFacility', 'destination', 'transportDestination', 'transportMode',
      { path: 'transport.transportMode', label: 'Transport Mode' },
      { path: 'transport.destinationName', label: 'Destination' },
      { path: 'transport.careLevel', label: 'Care Level' },
      { path: 'transport.hospitalNotified', label: 'Hospital Notified' },
      { path: 'transport.handoffReport', label: 'Handoff Report' },
      'triageCategory', 'careLevel', 'treatmentProvider', 'status',
    ],
  },
  {
    title: 'Timeline',
    icon: Clock,
    color: '#475569',
    bgColor: '#E2E8F0',
    fields: [
      'callReceivedAt', { path: 'timeline.callReceivedAt', label: 'Call Received' },
      { path: 'timeline.dispatchedAt', label: 'Dispatched' },
      { path: 'timeline.enRouteAt', label: 'En Route' },
      'arrivedSceneAt', { path: 'timeline.arrivedSceneAt', label: 'Arrived Scene' },
      { path: 'timeline.patientContactAt', label: 'Patient Contact' },
      'departedSceneAt', { path: 'timeline.departedSceneAt', label: 'Departed Scene' },
      'arrivedDestinationAt', { path: 'timeline.arrivedDestinationAt', label: 'Arrived Destination' },
      'transferOfCareAt', { path: 'timeline.transferOfCareAt', label: 'Transfer Of Care' },
      { path: 'timeline.responseTimeMinutes', label: 'Response Time' },
      { path: 'timeline.sceneTimeMinutes', label: 'Scene Time' },
      { path: 'timeline.transportTimeMinutes', label: 'Transport Time' },
    ],
  },
  {
    title: 'Consent',
    icon: Shield,
    color: '#0891B2',
    bgColor: '#CFFAFE',
    fields: [
      { path: 'consent.patientConsentObtained', label: 'Patient Consent' },
      { path: 'consent.consentType', label: 'Consent Type' },
      { path: 'consent.refusalOfCare', label: 'Refusal Of Care' },
      { path: 'consent.refusalReason', label: 'Refusal Reason' },
      { path: 'consent.patientInformedOfRisks', label: 'Informed Of Risks' },
      { path: 'consent.patientHasDecisionCapacity', label: 'Decision Capacity' },
      { path: 'consent.guardianConsentObtained', label: 'Guardian Consent' },
      { path: 'consent.guardianName', label: 'Guardian Name' },
      { path: 'consent.guardianRelationship', label: 'Guardian Relationship' },
      { path: 'consent.guardianPhone', label: 'Guardian Phone' },
    ],
  },
  {
    title: 'Record Admin',
    icon: Fingerprint,
    color: '#475569',
    bgColor: '#E2E8F0',
    fields: [
      'createdAt', 'updatedAt', 'submittedAt',
      'qaApproved', 'qaApprovedAt',
      { path: 'dynamicFormResponses.organizationName', label: 'Organization' },
      { path: 'dynamicFormResponses.submittedByName', label: 'Submitted By Name' },
      { path: 'dynamicFormResponses.qaApprovedByName', label: 'Approved By Name' },
      { path: 'dynamicFormResponses.paramedicsName', label: 'Paramedic Name' },
      { path: 'auditTrail', label: 'Activity History', type: 'activity' },
    ],
  },
];

const VITAL_PRESENTED_FIELDS = [
  'bloodPressure', 'heartRate', 'pulseRate', 'pulse', 'respiratoryRate', 'respirationRate',
  'temperature', 'bodyTemperature', 'temp', 'spo2', 'spO2', 'oxygenSaturation', 'o2Saturation',
  'bloodGroup', 'height', 'weight', 'vitalsSystolic', 'vitalsDiastolic', 'vitalsPulse',
  'vitalsRespiratory', 'vitalsSpo2', 'vitalsTemp', 'vitalsEtco2', 'vitalsBloodSugar',
  'vitalsGcs', 'bloodSugar', 'glucose', 'bloodGlucose', 'etco2', 'gcs', 'ecgRhythm',
  'pupilsResponse', 'skinCondition', 'oxygenFlowRate', 'ivAccessSite', 'vitals',
  'diastolicBp', 'systolicBp', 'hemoglobin', 'structuredVitals',
];

const PRESENTED_RECORD_FIELDS = new Set([
  ...VITAL_PRESENTED_FIELDS,
  ...RECORD_CARD_SECTIONS.flatMap(section => section.fields.map(topLevelField)),
  'medicalHistory', 'sceneAssessment', 'timeline', 'transport', 'consent', 'dynamicFormResponses', 'auditTrail',
]);

const RecordSummaryCards = ({ data }) => (
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
    {RECORD_CARD_SECTIONS.map(section => {
      const Icon = section.icon;
      const visibleFields = section.fields.filter(field => !isEmptyValue(getPathValue(data, fieldConfig(field).path)));
      const populatedCount = visibleFields.length;

      return (
        <div key={section.title} className="card p-5 border border-[#DDE3F0] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: section.bgColor, color: section.color }}>
                <Icon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#0F1A3A] uppercase tracking-wider">{section.title}</h3>
                <p className="text-xs text-[#8A97B0] mt-0.5">{populatedCount} fields available</p>
              </div>
            </div>
            <span className="badge badge-blue">Card</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleFields.length === 0 ? (
              <CardField label="Status" value="No data recorded" />
            ) : visibleFields.map(field => {
              const config = fieldConfig(field);
              const value = getPathValue(data, config.path);
              if (config.type === 'activity') return <ActivityHistoryField key={config.path} value={value} />;
              return <CardField key={config.path} label={config.label || formatLabel(config.path)} value={value} />;
            })}
          </div>
        </div>
      );
    })}
  </div>
);

const OtherFieldsCard = ({ fields }) => {
  if (!fields.length) return null;

  return (
    <div className="card p-5 border border-[#DDE3F0] space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E2E8F0] text-[#475569] flex items-center justify-center">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#0F1A3A] uppercase tracking-wider">Other</h3>
            <p className="text-xs text-[#8A97B0] mt-0.5">{fields.length} additional fields</p>
          </div>
        </div>
        <span className="badge badge-gray">Card</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {fields.map(([key, value]) => (
          <CardField key={key} label={formatLabel(key)} value={value} />
        ))}
      </div>
    </div>
  );
};

const VitalSignsDashboard = ({ data }) => {
  const vitals = buildVitals(data);
  const trend = makeTrend(vitals);
  const barData = [
    { name: 'Heart', value: vitals.heartRate, fill: '#C8102E' },
    { name: 'SpO2', value: vitals.spo2, fill: '#059669' },
    { name: 'Resp', value: vitals.respiratoryRate, fill: '#1A3C8F' },
    { name: 'Temp', value: vitals.temperature, fill: '#EA580C' },
    ...(vitals.etco2 !== null ? [{ name: 'EtCO2', value: vitals.etco2, fill: '#0891B2' }] : []),
    ...(vitals.bloodSugar !== null ? [{ name: 'Sugar', value: vitals.bloodSugar, fill: '#D97706' }] : []),
    ...(vitals.gcs !== null ? [{ name: 'GCS', value: vitals.gcs, fill: '#475569' }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <MetricCard icon={Heart} label="Heart Rate" value={vitals.heartRate} unit="BPM" range="Normal: 60-100 BPM" color="#C8102E" bgColor="#FEE2E2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="heartRateFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C8102E" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#C8102E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<VitalTooltip />} />
              <Area type="monotone" dataKey="heartRate" name="Heart Rate" stroke="#C8102E" strokeWidth={3} fill="url(#heartRateFill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </MetricCard>

        <MetricCard icon={Activity} label="Blood Pressure" value={vitals.label} unit="mmHg" range="Normal: 90/60-120/80 mmHg" color="#1A3C8F" bgColor="#DBEAFE">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <Tooltip content={<VitalTooltip />} />
              <Line type="monotone" dataKey="systolic" name="Systolic" stroke="#1A3C8F" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke="#60A5FA" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </MetricCard>

        <MetricCard icon={Thermometer} label="Temperature" value={vitals.temperature} unit="F" range="Normal: 97-99 F" color="#EA580C" bgColor="#FFEDD5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EA580C" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#EA580C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<VitalTooltip />} />
              <Area type="monotone" dataKey="temperature" name="Temperature" stroke="#EA580C" strokeWidth={3} fill="url(#tempFill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </MetricCard>

        <MetricCard icon={Droplets} label="O2 Saturation" value={vitals.spo2} unit="%" range="Normal: 95-100%" color="#059669" bgColor="#D1FAE5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="spo2Fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<VitalTooltip />} />
              <Area type="monotone" dataKey="spo2" name="O2 Saturation" stroke="#059669" strokeWidth={3} fill="url(#spo2Fill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </MetricCard>

        <MetricCard icon={Wind} label="Respiratory Rate" value={vitals.respiratoryRate} unit="bpm" range="Normal: 12-20 bpm" color="#7C3AED" bgColor="#F3E8FF">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <Tooltip content={<VitalTooltip />} />
              <Line type="monotone" dataKey="respiratoryRate" name="Respiratory Rate" stroke="#7C3AED" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </MetricCard>

        <div className="card p-5 flex flex-col items-center justify-center border-2 border-brand-red/20 space-y-2">
          <p className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider">Live Pulse</p>
          <HeartbeatPulse bpm={vitals.heartRate} />
          <p className="text-xs text-center text-[#8A97B0]">Real-time monitoring active</p>
        </div>
      </div>

      <div className="card p-5 border border-[#DDE3F0]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="font-black text-[#0F1A3A] text-sm uppercase tracking-wider">Vitals Overview</h3>
            <p className="text-xs text-[#8A97B0] mt-1">All current vital data from this clinical record</p>
          </div>
          <span className="badge badge-blue">Working Graph</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#DDE3F0" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: '#8A97B0', fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#8A97B0', fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} />
                <Tooltip content={<VitalTooltip />} />
                <Line type="monotone" dataKey="heartRate" name="Heart Rate" stroke="#C8102E" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="systolic" name="Systolic BP" stroke="#1A3C8F" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="spo2" name="O2 Saturation" stroke="#059669" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="respiratoryRate" name="Respiratory Rate" stroke="#7C3AED" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#DDE3F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#8A97B0', fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#8A97B0', fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={false} />
                <Tooltip content={<VitalTooltip />} />
                <Bar dataKey="value" name="Current" radius={[8, 8, 0, 0]}>
                  {barData.map(item => <Cell key={item.name} fill={item.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <VitalCard icon={Heart} label="Heart" value={vitals.heartRate} unit="BPM" bgColor="#FEE2E2" iconColor="#C8102E" />
          <VitalCard icon={Activity} label="BP" value={vitals.label} unit="mmHg" bgColor="#DBEAFE" iconColor="#1A3C8F" />
          <VitalCard icon={Thermometer} label="Temp" value={vitals.temperature} unit="F" bgColor="#FFEDD5" iconColor="#EA580C" />
          <VitalCard icon={Droplets} label="SpO2" value={vitals.spo2} unit="%" bgColor="#D1FAE5" iconColor="#059669" />
          <VitalCard icon={Wind} label="Resp" value={vitals.respiratoryRate} unit="bpm" bgColor="#F3E8FF" iconColor="#7C3AED" />
          {vitals.bloodSugar !== null && <VitalCard icon={TrendingUp} label="Glucose" value={vitals.bloodSugar} unit="mg/dL" bgColor="#FEF3C7" iconColor="#D97706" />}
          {vitals.weight !== null && <VitalCard icon={ClipboardCheck} label="Weight" value={vitals.weight} unit="kg" bgColor="#E0F2FE" iconColor="#0284C7" />}
          {data?.bloodGroup && <VitalCard icon={Droplets} label="Blood Group" value={data.bloodGroup} unit="" bgColor="#FEE2E2" iconColor="#C8102E" />}
        </div>
      </div>

      <div className="card p-5 border border-[#DDE3F0]">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-black text-[#0F1A3A] text-sm uppercase tracking-wider">Remaining Clinical Data</h3>
            <p className="text-xs text-[#8A97B0] mt-1">Other collected vitals and assessment values from this record</p>
          </div>
          <span className="badge badge-gray">Cards</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {vitals.etco2 !== null && (
            <DetailMetricCard icon={Activity} label="EtCO2" value={vitals.etco2} unit="mmHg" color="#0891B2" bgColor="#CFFAFE">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <Tooltip content={<VitalTooltip />} />
                  <Line type="monotone" dataKey="etco2" name="EtCO2" stroke="#0891B2" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </DetailMetricCard>
          )}
          {vitals.bloodSugar !== null && (
            <DetailMetricCard icon={TrendingUp} label="Blood Sugar" value={vitals.bloodSugar} unit="mg/dL" color="#D97706" bgColor="#FEF3C7">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <Tooltip content={<VitalTooltip />} />
                  <Area type="monotone" dataKey="bloodSugar" name="Blood Sugar" stroke="#D97706" strokeWidth={3} fill="#FEF3C7" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </DetailMetricCard>
          )}
          {vitals.gcs !== null && (
            <DetailMetricCard icon={ClipboardCheck} label="GCS" value={vitals.gcs} unit="/15" color="#475569" bgColor="#E2E8F0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <Tooltip content={<VitalTooltip />} />
                  <Line type="monotone" dataKey="gcs" name="GCS" stroke="#475569" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </DetailMetricCard>
          )}
          {vitals.height !== null && <DetailMetricCard icon={ClipboardCheck} label="Height" value={vitals.height} unit="cm" color="#0284C7" bgColor="#E0F2FE" />}
          {vitals.weight !== null && <DetailMetricCard icon={ClipboardCheck} label="Weight" value={vitals.weight} unit="kg" color="#0284C7" bgColor="#E0F2FE" />}
          {data?.bloodGroup && <DetailMetricCard icon={Droplets} label="Blood Group" value={data.bloodGroup} unit="" color="#C8102E" bgColor="#FEE2E2" />}
          {data?.mentalStatus && <DetailMetricCard icon={Activity} label="Mental Status" value={data.mentalStatus} unit="" color="#7C3AED" bgColor="#F3E8FF" />}
          {data?.ecgRhythm && <DetailMetricCard icon={Heart} label="ECG Rhythm" value={data.ecgRhythm} unit="" color="#C8102E" bgColor="#FEE2E2" />}
          {data?.pupilsResponse && <DetailMetricCard icon={Eye} label="Pupils" value={data.pupilsResponse} unit="" color="#1A3C8F" bgColor="#DBEAFE" />}
          {data?.skinCondition && <DetailMetricCard icon={Shield} label="Skin" value={data.skinCondition} unit="" color="#059669" bgColor="#D1FAE5" />}
          {data?.oxygenFlowRate && <DetailMetricCard icon={Wind} label="Oxygen Flow" value={data.oxygenFlowRate} unit="L/min" color="#0891B2" bgColor="#CFFAFE" />}
          {data?.ivAccessSite && <DetailMetricCard icon={Droplets} label="IV Access" value={data.ivAccessSite} unit="" color="#C8102E" bgColor="#FEE2E2" />}
        </div>
      </div>
    </div>
  );
};

// Data categories with icons
const SECTION_CONFIG = {
  // Patient Info
  patientName: { section: 'Patient Info', icon: '👤' },
  patientId: { section: 'Patient Info', icon: '👤' },
  patientDateOfBirth: { section: 'Patient Info', icon: '👤' },
  patientGender: { section: 'Patient Info', icon: '👤' },
  patientPhone: { section: 'Patient Info', icon: '👤' },
  patientAddress: { section: 'Patient Info', icon: '👤' },
  email: { section: 'Patient Info', icon: '👤' },
  // Medical History
  comorbidity: { section: 'Medical History', icon: '⚕️' },
  currentMedicines: { section: 'Medical History', icon: '⚕️' },
  allergy: { section: 'Medical History', icon: '⚠️' },
  surgicalHistory: { section: 'Medical History', icon: '⚕️' },
  dnrOnFile: { section: 'Medical History', icon: '⚕️' },
  advanceDirective: { section: 'Medical History', icon: '⚕️' },
  // Incident
  incidentDateTime: { section: 'Incident', icon: '🚨' },
  incidentLocation: { section: 'Incident', icon: '🚨' },
  incidentDescription: { section: 'Incident', icon: '🚨' },
  incidentType: { section: 'Incident', icon: '🚨' },
  sceneType: { section: 'Incident', icon: '🚨' },
  // Vitals
  bloodPressure: { section: 'Vitals', icon: '❤️' },
  heartRate: { section: 'Vitals', icon: '❤️' },
  respiratoryRate: { section: 'Vitals', icon: '❤️' },
  temperature: { section: 'Vitals', icon: '❤️' },
  bloodGroup: { section: 'Vitals', icon: '❤️' },
  age: { section: 'Vitals', icon: '❤️' },
  height: { section: 'Vitals', icon: '❤️' },
  weight: { section: 'Vitals', icon: '❤️' },
  vitalsSystolic: { section: 'Vitals', icon: '❤️' },
  vitalsDiastolic: { section: 'Vitals', icon: '❤️' },
  vitalsPulse: { section: 'Vitals', icon: '❤️' },
  vitalsRespiratory: { section: 'Vitals', icon: '❤️' },
  vitalsSpo2: { section: 'Vitals', icon: '❤️' },
  vitalsTemp: { section: 'Vitals', icon: '❤️' },
  vitalsEtco2: { section: 'Vitals', icon: '❤️' },
  vitalsBloodSugar: { section: 'Vitals', icon: '❤️' },
  vitalsGcs: { section: 'Vitals', icon: '❤️' },
  mentalStatus: { section: 'Vitals', icon: '❤️' },
  diagnosticFindings: { section: 'Vitals', icon: '❤️' },
  ecgRhythm: { section: 'Vitals', icon: '❤️' },
  pupilsResponse: { section: 'Vitals', icon: '❤️' },
  skinCondition: { section: 'Vitals', icon: '❤️' },
  oxygenFlowRate: { section: 'Vitals', icon: '❤️' },
  ivAccessSite: { section: 'Vitals', icon: '❤️' },
  // Assessment
  assessmentType: { section: 'Assessment', icon: '📋' },
  physicalExam: { section: 'Assessment', icon: '📋' },
  diagnosis: { section: 'Assessment', icon: '📋' },
  complaints: { section: 'Assessment', icon: '📋' },
  proceduresPerformed: { section: 'Assessment', icon: '📋' },
  medicationsAdministered: { section: 'Assessment', icon: '📋' },
  treatmentOutcome: { section: 'Assessment', icon: '📋' },
  // Care
  careLevel: { section: 'Care', icon: '🏥' },
  treatmentProvider: { section: 'Care', icon: '🏥' },
  transportMode: { section: 'Care', icon: '🚑' },
  destination: { section: 'Care', icon: '🏥' },
};

const DataField = ({ label, value }) => {
  const isMasked = typeof value === 'string' && (value.includes('***') || value.includes('REDACTED') || value.includes('ANONYMIZED'));
  
  return (
    <div className="py-1.5">
      <p className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider mb-0.5 truncate">{label}</p>
      {value === null || value === undefined || value === '' ? (
        <p className="text-xs text-[#A0AECB] italic">—</p>
      ) : typeof value === 'boolean' ? (
        <p className="text-xs font-semibold text-[#4B5A7A]">{value ? '✓ Yes' : '✗ No'}</p>
      ) : isMasked ? (
        <span className="badge badge-gray text-xs">{value}</span>
      ) : Array.isArray(value) ? (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {value.slice(0, 3).map((v, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-[#F8FAFF] border border-[#DDE3F0] rounded text-[#4B5A7A] font-semibold">
              {typeof v === 'object' ? JSON.stringify(v).substring(0, 15) : String(v).substring(0, 15)}
            </span>
          ))}
          {value.length > 3 && <span className="text-xs text-[#A0AECB]">+{value.length - 3} more</span>}
        </div>
      ) : (
        <p className="text-xs font-semibold text-[#4B5A7A] truncate">{String(value).substring(0, 50)}</p>
      )}
    </div>
  );
};

const CollapsibleSection = ({ title, icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-[#DDE3F0] rounded-xl overflow-hidden flex flex-col h-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-3 bg-[#F8FAFF] hover:bg-[#F0F4FC] transition-colors border-b border-[#DDE3F0] shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{icon}</span>
          <h3 className="font-bold text-[#0F1A3A] text-sm truncate">{title}</h3>
        </div>
        <ChevronDown size={16} className={`text-[#A0AECB] transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 py-3 space-y-2 divide-y divide-[#F0F4FC] overflow-y-auto flex-1">
          {children}
        </div>
      )}
    </div>
  );
};

const MedicalDocument = ({ data, isNested = false, rootData = null }) => {
  if (!data || typeof data !== 'object') return null;

  const entries = Object.entries(data).filter(([k]) => {
    if (k === 'paramedicsName' || k === 'organizationName' || k === 'submittedByName' || k === 'qaApprovedByName') return false;
    if (PRESENTED_RECORD_FIELDS.has(k)) return false;
    return true;
  });

  if (isNested) return null;

  return (
    <div className="space-y-4">
      <VitalSignsDashboard data={data} />
      <RecordSummaryCards data={data} />
      {/* Legacy static vitals kept disabled after replacing with record-driven charts. */}
      <div className="hidden">
        {/* Heart Rate Card */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-brand-red">
              <Heart size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#A0AECB] uppercase">Heart Rate</p>
              <p className="text-2xl font-black text-[#0F1A3A]">72 <span className="text-sm text-[#8A97B0]">BPM</span></p>
            </div>
          </div>
          <PulseIndicator value={72} max={120} color="#C8102E" />
          <p className="text-xs text-[#A0AECB]">Range: 60-100 BPM</p>
        </div>

        {/* Blood Pressure Card */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-brand-blue">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#A0AECB] uppercase">Blood Pressure</p>
              <p className="text-2xl font-black text-[#0F1A3A]">120/80 <span className="text-sm text-[#8A97B0]">mmHg</span></p>
            </div>
          </div>
          <PulseIndicator value={120} max={150} color="#1A3C8F" />
          <p className="text-xs text-[#A0AECB]">Normal: 90-120 mmHg</p>
        </div>

        {/* Temperature Card */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#A0AECB] uppercase">Temperature</p>
              <p className="text-2xl font-black text-[#0F1A3A]">98.6 <span className="text-sm text-[#8A97B0]">°F</span></p>
            </div>
          </div>
          <PulseIndicator value={98.6} max={104} color="#EA580C" />
          <p className="text-xs text-[#A0AECB]">Normal: 97-99 °F</p>
        </div>

        {/* O2 Saturation Card */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#A0AECB] uppercase">O2 Saturation</p>
              <p className="text-2xl font-black text-[#0F1A3A]">98 <span className="text-sm text-[#8A97B0]">%</span></p>
            </div>
          </div>
          <PulseIndicator value={98} max={100} color="#059669" />
          <p className="text-xs text-[#A0AECB]">Normal: 95-100%</p>
        </div>

        {/* Respiratory Rate Card */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#A0AECB] uppercase">Respiratory Rate</p>
              <p className="text-2xl font-black text-[#0F1A3A]">16 <span className="text-sm text-[#8A97B0]">bpm</span></p>
            </div>
          </div>
          <PulseIndicator value={16} max={25} color="#7C3AED" />
          <p className="text-xs text-[#A0AECB]">Normal: 12-20 bpm</p>
        </div>

        {/* Live Pulse Card */}
        <div className="card p-5 flex flex-col items-center justify-center border-2 border-brand-red/20 space-y-4">
          <p className="text-xs font-bold text-[#A0AECB] uppercase">Live Pulse</p>
          <HeartbeatPulse />
          <p className="text-xs text-center text-[#8A97B0]">Real-time monitoring active</p>
        </div>
      </div>

      {/* Header */}
      <div className="card p-6 bg-gradient-to-r from-[#F8FAFF] to-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-blue flex items-center justify-center text-white">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#0F1A3A]">Clinical Record</h2>
              <p className="text-xs text-[#8A97B0] font-semibold uppercase tracking-wider mt-0.5">Secured & Encrypted</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider mb-1">Record ID</p>
            <p className="text-sm font-mono font-black text-brand-blue">#{data.id?.substring(0, 12)?.toUpperCase() || 'N/A'}</p>
          </div>
        </div>
      </div>

      <OtherFieldsCard fields={entries} />

      {/* Footer */}
      <div className="card p-4 bg-[#F8FAFF] border border-[#DDE3F0] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Fingerprint size={16} className="text-brand-blue" />
          <span className="text-xs font-bold text-[#8A97B0] uppercase">Verified & Encrypted</span>
        </div>
        <span className="text-xs text-[#A0AECB]">{new Date().toLocaleDateString()}</span>
      </div>

      {/* Old grouped details are disabled; all record data is presented in cards above. */}
      {false && Object.keys(grouped).length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
        {Object.entries(grouped).map(([section, fields]) => {
          const config = SECTION_CONFIG[fields[0][0]];
          const icon = config?.icon || '📄';
          const isOpen = ['Patient Info', 'Assessment', 'Incident'].includes(section);
          
          return (
            <CollapsibleSection key={section} title={section} icon={icon} defaultOpen={isOpen}>
              {fields.map(([k, v]) => {
                const label = formatLabel(k);
                return <DataField key={k} label={label} value={v} />;
              })}
            </CollapsibleSection>
          );
        })}
        
        {/* Footer */}
        <div className="card p-4 bg-[#F8FAFF] border border-[#DDE3F0] flex items-center justify-between col-span-full">
          <div className="flex items-center gap-3">
            <Fingerprint size={16} className="text-brand-blue" />
            <span className="text-xs font-bold text-[#8A97B0] uppercase">Verified & Encrypted</span>
          </div>
          <span className="text-xs text-[#A0AECB]">{new Date().toLocaleDateString()}</span>
        </div>
      </div>
      )}
    </div>
  );
};

const EVENT_TYPE_STYLES = {
  CONDITION_DIAGNOSED: { icon: HeartPulse, color: '#C8102E', bg: '#FEE2E2', label: 'Condition Diagnosed' },
  CONDITION_RESOLVED:  { icon: Check,      color: '#059669', bg: '#D1FAE5', label: 'Condition Resolved' },
  MEDICATION_STARTED:  { icon: Pill,        color: '#7C3AED', bg: '#F3E8FF', label: 'Medication Started' },
  MEDICATION_STOPPED:  { icon: Pill,        color: '#6B7280', bg: '#F3F4F6', label: 'Medication Stopped' },
  EPCR_ENCOUNTER:      { icon: Stethoscope, color: '#EA580C', bg: '#FFEDD5', label: 'ePCR Encounter' },
  HOSPITAL_ADMISSION:  { icon: BedDouble,   color: '#0891B2', bg: '#CFFAFE', label: 'Hospital Admission' },
  LAB_RESULT:          { icon: FlaskConical, color: '#1A3C8F', bg: '#DBEAFE', label: 'Lab Result' },
  DOCUMENT:            { icon: FileText,    color: '#475569', bg: '#E2E8F0', label: 'Document' },
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
  const dateStr = eventDate ? new Date(eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not recorded';

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
              <p className="text-xs font-bold text-[#4B5A7A]">{dateStr}</p>
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
          <button onClick={onClose} className="rounded-xl p-2 text-[#8A97B0] hover:bg-[#F0F4FC] hover:text-brand-red transition-all">
            <X size={20} />
          </button>
        </div>
        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {allFields.filter(([, val]) => val).map(([key, val]) => (
              <div key={key} className="rounded-xl border border-[#DDE3F0] bg-[#F8FAFF] p-4">
                <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-[#A0AECB]">{key}</p>
                <p className="text-sm font-bold text-[#0F1A3A] break-words">{val}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Footer */}
        <div className="sticky bottom-0 z-10 border-t border-[#DDE3F0] bg-white px-6 py-4 flex justify-end">
          <button onClick={onClose} className="rounded-xl bg-[#F8FAFF] border border-[#DDE3F0] px-6 py-2.5 text-sm font-bold text-[#4B5A7A] hover:bg-[#EEF2FF] hover:border-brand-blue hover:text-brand-blue transition-all">
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

const RESTRICTION_TYPES = ['NO_MARKETING', 'NO_RESEARCH', 'NO_THIRD_PARTY', 'NO_INSURANCE', 'CUSTOM'];
const DATA_CATEGORIES = ['ALL', 'PHI', 'DIAGNOSIS', 'MEDICATIONS', 'VITALS', 'DEMOGRAPHICS'];

export default function PatientPortal() {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const records = asList(useSelector(selectPortalRecords));
  const amendments = asList(useSelector(selectPortalAmendments));
  const restrictions = asList(useSelector(selectPortalRestrictions));
  const loading = useSelector(selectPortalLoading);

  // Patient History state
  const historySummary = useSelector(selectHistorySummary);
  const conditions  = asList(useSelector(selectConditions));
  const medications = asList(useSelector(selectMedications));
  const encounters  = asList(useSelector(selectEncounters));
  const admissions  = asList(useSelector(selectAdmissions));
  const labResults  = asList(useSelector(selectLabResults));
  const documents   = asList(useSelector(selectDocuments));
  const timeline    = asList(useSelector(selectTimeline));
  const historyLoading = useSelector(selectHistoryLoading);

  const [activeTab, setActiveTab] = useState('records');
  const [viewRecord, setViewRecord] = useState(null);
  const [showAmendmentModal, setShowAmendmentModal] = useState(false);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyFetched, setHistoryFetched] = useState(false);
  const [timelineViewItem, setTimelineViewItem] = useState(null);

  const [amendmentForm, setAmendmentForm] = useState({ recordId: '', justification: '', dataCategory: 'ALL' });
  const [restrictionForm, setRestrictionForm] = useState({ restrictionType: 'NO_MARKETING', justification: '', dataCategory: 'PHI' });

  useEffect(() => { dispatch(fetchPortalData()); }, [dispatch]);

  useEffect(() => {
    if (activeTab === 'history' && !historyFetched && user?.id) {
      const pid = user.patientId || user.id;
      dispatch(fetchAllPatientHistory(pid));
      setHistoryFetched(true);
    }
  }, [activeTab, historyFetched, user, dispatch]);

  const handleCreateAmendment = async e => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      await dispatch(createAmendment(amendmentForm)).unwrap();
      dispatch(addToast({ type: 'success', message: 'Amendment request submitted.' }));
      setShowAmendmentModal(false); setAmendmentForm({ recordId: '', justification: '', dataCategory: 'ALL' });
    } catch (err) { dispatch(addToast({ type: 'error', message: err || 'Submission failed.' })); }
    finally { setIsSubmitting(false); }
  };

  const handleCreateRestriction = async e => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      await dispatch(createRestriction(restrictionForm)).unwrap();
      dispatch(addToast({ type: 'success', message: 'Restriction requested.' }));
      setShowRestrictionModal(false); setRestrictionForm({ restrictionType: 'NO_MARKETING', justification: '', dataCategory: 'PHI' });
    } catch (err) { dispatch(addToast({ type: 'error', message: err || 'Request failed.' })); }
    finally { setIsSubmitting(false); }
  };

  const tabs = [
    { id: 'records',     label: 'Clinical History', icon: History },
    { id: 'history',     label: 'My History',        icon: ClipboardList },
    { id: 'amendments', label: 'Amendments',         icon: FileEdit },
    { id: 'restrictions', label: 'Privacy',          icon: Ban },
  ];

  const historyCounts = [
    { label: 'Conditions', value: conditions.length },
    { label: 'Medications', value: medications.length },
    { label: 'Encounters', value: encounters.length },
    { label: 'Admissions', value: admissions.length },
    { label: 'Labs', value: labResults.length },
    { label: 'Documents', value: documents.length },
  ];

  const formatHistoryDate = value => value ? new Date(value).toLocaleDateString() : 'Date N/A';

  const historyEmpty = (message) => (
    <div className="rounded-xl border border-dashed border-[#DDE3F0] bg-[#F8FAFF] px-4 py-8 text-center">
      <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-[#DDE3F0]" />
      <p className="text-sm font-semibold text-[#8A97B0]">{message}</p>
    </div>
  );

  const historySectionHeader = (Icon, title, helper, colorClass = 'text-brand-blue', bgClass = 'bg-[#EEF2FF]') => (
    <div className="flex items-start gap-3 mb-4">
      <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center ${colorClass} shrink-0`}>
        <Icon size={19} />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-black text-[#0F1A3A] uppercase tracking-wider">{title}</h3>
        <p className="mt-1 text-xs font-semibold text-[#8A97B0]">{helper}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-10 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
           <div className="w-16 h-16 rounded-2xl bg-brand-blue flex items-center justify-center text-white shadow-lg shadow-brand-blue/20">
              <User size={32} />
           </div>
           <div>
              <p className="section-label mb-1">Patient Portal</p>
              <h1 className="text-3xl font-black text-[#0F1A3A] tracking-tight">{user?.firstName} {user?.lastName}</h1>
              <div className="flex items-center gap-2 mt-1">
                 <Shield className="text-green-500" size={14} />
                 <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Identity Verified</p>
              </div>
           </div>
        </div>

        <div className="flex gap-3">
           <button onClick={() => setShowAmendmentModal(true)} className="btn-ghost border border-[#DDE3F0] px-4 py-2.5 text-sm">
              <FileEdit size={16} /> Request Amendment
           </button>
           <button onClick={() => setShowRestrictionModal(true)} className="btn-primary text-sm px-4 py-2.5">
              <Ban size={16} /> Manage Privacy
           </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Nav */}
        <div className="lg:w-64 shrink-0 space-y-4">
           <div className="p-2 bg-white rounded-2xl border border-[#DDE3F0] space-y-1">
              {tabs.map(t => (
                <button key={t.id} onClick={() => { setActiveTab(t.id); setViewRecord(null); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === t.id ? 'bg-[#EEF2FF] text-brand-blue font-bold' : 'text-[#8A97B0] hover:bg-[#F8FAFF] hover:text-[#4B5A7A] font-semibold'}`}>
                   <div className="flex items-center gap-3">
                      <t.icon size={18} className={activeTab === t.id ? 'text-brand-blue' : 'text-[#A0AECB]'} />
                      <span className="text-sm">{t.label}</span>
                   </div>
                   {activeTab === t.id && <ChevronRight size={16} />}
                </button>
              ))}
           </div>

           <div className="card p-5">
              <div className="flex items-center gap-3 mb-4">
                 <Heart className="text-brand-red" size={20} />
                 <h4 className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider">Status</h4>
              </div>
              <div className="space-y-4">
                 <div>
                    <p className="text-xl font-black text-[#0F1A3A]">{records.length}</p>
                    <p className="text-xs text-[#8A97B0] font-semibold uppercase tracking-wider mt-0.5">Records</p>
                 </div>
                 <div className="pt-4 border-t border-[#F0F4FC] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-bold text-[#8A97B0] uppercase tracking-wider">Synced</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {loading ? (
             <div className="py-20 text-center">
                <RefreshCw className="animate-spin w-10 h-10 mx-auto mb-4 text-[#A0AECB]" />
                <p className="text-sm font-semibold text-[#8A97B0]">Loading records…</p>
             </div>
          ) : viewRecord ? (
             <div className="space-y-4">
                <button onClick={() => setViewRecord(null)} className="btn-ghost px-3 py-2 text-sm text-[#4B5A7A]">
                   <ArrowLeft size={16} /> Back to Records
                </button>
                <MedicalDocument data={viewRecord} />
             </div>
          ) : activeTab === 'records' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {records.map(r => (
                 <div key={r.id} onClick={() => setViewRecord(r)} className="card p-5 hover:-translate-y-1 cursor-pointer flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                       <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] flex items-center justify-center text-brand-blue">
                          <ClipboardCheck size={20} />
                       </div>
                       <span className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider">{new Date(r.incidentDateTime || r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-lg font-black text-[#0F1A3A] mb-2 line-clamp-2">{r.diagnosis || 'Diagnosis Pending'}</h3>
                    <p className="text-xs text-[#8A97B0] mb-6 line-clamp-1">{r.incidentLocation || 'N/A'}</p>
                    <div className="mt-auto pt-4 border-t border-[#F0F4FC] flex items-center justify-between">
                       <span className="text-xs font-mono text-[#A0AECB]">#{r.id?.substring(0,8).toUpperCase()}</span>
                       <ChevronRight className="text-brand-blue" size={16} />
                    </div>
                 </div>
               ))}
               {records.length === 0 && (
                 <div className="col-span-full card p-16 text-center">
                    <Shield className="w-16 h-16 mx-auto mb-4 text-[#DDE3F0]" />
                    <p className="text-sm font-semibold text-[#8A97B0]">No records found.</p>
                 </div>
               )}
             </div>
          ) : activeTab === 'amendments' ? (
             <div className="space-y-4">
               {amendments.map(a => (
                 <div key={a.id} className="card p-5">
                    <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] flex items-center justify-center text-brand-blue">
                             <FileEdit size={20} />
                          </div>
                          <div>
                             <p className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider mb-0.5">Record Reference</p>
                             <p className="text-sm font-mono text-[#0F1A3A] font-bold">#{a.recordId?.substring(0,16).toUpperCase()}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <span className={a.status === 'APPROVED' ? 'badge badge-green' : a.status === 'REJECTED' ? 'badge badge-red' : 'badge badge-orange'}>
                             {a.status}
                          </span>
                          <span className="text-xs text-[#8A97B0]">{new Date(a.createdAt).toLocaleDateString()}</span>
                       </div>
                    </div>
                    <div className="bg-[#F8FAFF] p-4 rounded-xl border border-[#DDE3F0]">
                       <p className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider mb-2">Request Details</p>
                       <p className="text-sm text-[#4B5A7A] italic">"{a.justification}"</p>
                    </div>
                 </div>
               ))}
               {amendments.length === 0 && (
                 <div className="card p-16 text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-[#DDE3F0]" />
                    <p className="text-sm font-semibold text-[#8A97B0]">No amendment requests.</p>
                 </div>
               )}
             </div>
          ) : activeTab === 'history' ? (
             <div className="space-y-6">
               {historyLoading ? (
                 <div className="py-20 text-center"><RefreshCw className="animate-spin w-10 h-10 mx-auto mb-4 text-[#A0AECB]" /><p className="text-sm font-semibold text-[#8A97B0]">Loading history...</p></div>
               ) : (
                 <>
                   <div className="card p-5 border border-[#DDE3F0]">
                     <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                       <div>
                         <p className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider mb-1">Patient History</p>
                         <h2 className="text-xl font-black text-[#0F1A3A]">Longitudinal medical record</h2>
                         <p className="mt-1 text-sm font-semibold text-[#8A97B0]">A read-only view of your conditions, medicines, visits, labs, admissions, and documents.</p>
                       </div>
                       <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                         {historyCounts.map(item => (
                           <div key={item.label} className="rounded-xl border border-[#DDE3F0] bg-[#F8FAFF] px-3 py-2 text-center shadow-sm">
                             <p className="text-base font-black text-[#0F1A3A]">{item.value}</p>
                             <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A97B0]">{item.label}</p>
                           </div>
                         ))}
                       </div>
                     </div>
                     <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0F4FC] pt-4">
                       <p className="text-xs font-semibold text-[#8A97B0]">
                         Last updated {formatHistoryDate(historySummary?.lastUpdatedAt || historySummary?.updatedAt)}
                       </p>
                       <button type="button" onClick={() => { if (user?.id) dispatch(fetchAllPatientHistory(user.patientId || user.id)); }} className="btn-outline px-3 py-2 text-xs">
                         <RefreshCw size={14} className={historyLoading ? 'animate-spin' : ''} /> Refresh
                       </button>
                     </div>
                   </div>

                   <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

                   {/* Conditions */}
                   <div className="card p-5 border border-[#DDE3F0]">
                     {historySectionHeader(Stethoscope, 'Conditions', 'Diagnosed or ongoing medical conditions')}
                     {conditions.length === 0 ? (
                       historyEmpty('No conditions recorded.')
                     ) : (
                       <div className="space-y-3">
                         {conditions.map((c, i) => (
                           <div key={c.conditionId || i} className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFF] border border-[#EEF2FF]">
                             <div>
                               <p className="text-sm font-bold text-[#0F1A3A]">{c.conditionName || c.name || 'Unknown'}</p>
                               <p className="text-xs text-[#8A97B0] mt-0.5">{c.icdCode || ''} {c.onsetDate ? `· Since ${new Date(c.onsetDate).toLocaleDateString()}` : ''}</p>
                             </div>
                             <span className={`text-xs font-bold px-3 py-1 rounded-full ${c.status === 'ACTIVE' ? 'bg-red-50 text-brand-red' : 'bg-green-50 text-green-700'}`}>
                               {c.status || 'UNKNOWN'}
                             </span>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>

                   {/* Medications */}
                   <div className="card p-5 border border-[#DDE3F0]">
                     {historySectionHeader(Pill, 'Medications', 'Current and previous medicines', 'text-purple-600', 'bg-purple-50')}
                     {medications.length === 0 ? (
                       historyEmpty('No medications on record.')
                     ) : (
                       <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                         {medications.map((m, i) => (
                           <span key={m.medicationId || i} className="rounded-xl bg-purple-50 border border-purple-100 p-3 text-xs font-bold text-purple-700">
                             {m.medicationName || m.name} {m.dosage ? `· ${m.dosage}` : ''}
                           </span>
                         ))}
                       </div>
                     )}
                   </div>

                   {/* Encounters */}
                   <div className="card p-5 border border-[#DDE3F0] xl:col-span-2">
                     {historySectionHeader(Calendar, 'Encounter History', 'Visits and clinical care encounters', 'text-orange-600', 'bg-orange-50')}
                     {encounters.length === 0 ? (
                       historyEmpty('No encounters recorded.')
                     ) : (
                       <div className="relative pl-6 space-y-4">
                         <div className="absolute left-2 top-0 bottom-0 w-px bg-[#DDE3F0]" />
                         {encounters.map((e, i) => (
                           <div key={e.encounterId || i} className="relative">
                             <div className="absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-brand-blue bg-white" />
                             <div className="bg-[#F8FAFF] border border-[#EEF2FF] rounded-xl p-3">
                               <p className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider mb-1">{e.encounterDate ? new Date(e.encounterDate).toLocaleDateString() : 'Date N/A'}</p>
                               <p className="text-sm font-bold text-[#0F1A3A]">{e.encounterType || e.reason || 'Encounter'}</p>
                               {e.notes && <p className="text-xs text-[#8A97B0] mt-1 line-clamp-2">{e.notes}</p>}
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>

                   {/* Timeline */}
                   <div className="card p-5 border border-[#DDE3F0] xl:col-span-2">
                     {historySectionHeader(Clock, 'Medical Timeline', 'Chronological clinical events from your record', 'text-slate-600', 'bg-slate-50')}
                     {timeline.length === 0 ? (
                       historyEmpty('No timeline events recorded.')
                     ) : (
                       <div className="space-y-6">
                         {groupTimelineByMonth(timeline).map((group, gIdx) => (
                           <div key={group.label || gIdx} className="mb-6">
                             <div className="flex items-center gap-3 mb-4">
                               <div className="h-px flex-1 bg-[#DDE3F0]" />
                               <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0F4FC] border border-[#DDE3F0] px-4 py-1.5 text-xs font-black text-[#4B5A7A] uppercase tracking-wider">
                                 <CalendarDays size={12} />
                                 {group.label}
                               </span>
                               <div className="h-px flex-1 bg-[#DDE3F0]" />
                             </div>
                             {group.items.map((item, index) => (
                               <TimelineEvent 
                                 key={item.id || item.timelineId || index} 
                                 item={item} 
                                 index={index} 
                                 isLast={index === group.items.length - 1} 
                                 onView={setTimelineViewItem} 
                               />
                             ))}
                           </div>
                         ))}
                       </div>
                     )}
                   </div>

                   {/* Admissions */}
                   <div className="card p-5 border border-[#DDE3F0]">
                     {historySectionHeader(ClipboardCheck, 'Admissions', 'Hospital stays and discharge outcomes', 'text-brand-blue', 'bg-blue-50')}
                     {admissions.length === 0 ? (
                       historyEmpty('No hospital admissions recorded.')
                     ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         {admissions.map((a, i) => (
                           <div key={a.admissionId || a.id || i} className="rounded-xl bg-[#F8FAFF] border border-[#EEF2FF] p-4">
                             <p className="text-sm font-bold text-[#0F1A3A]">{a.hospital || a.facility || 'Hospital admission'}</p>
                             <p className="text-xs text-[#8A97B0] mt-1">{formatHistoryDate(a.admitDate || a.admissionDate)} - {a.dischargeDate ? formatHistoryDate(a.dischargeDate) : 'Present'}</p>
                             {a.reason && <p className="text-xs text-[#4B5A7A] mt-2">{a.reason}</p>}
                             {a.outcome && <span className="mt-3 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">{a.outcome}</span>}
                           </div>
                         ))}
                       </div>
                     )}
                   </div>

                   {/* Lab Results */}
                   <div className="card p-5 border border-[#DDE3F0]">
                     {historySectionHeader(FlaskConical, 'Lab Results', 'Tests, values, ranges, and interpretations', 'text-cyan-700', 'bg-cyan-50')}
                     {labResults.length === 0 ? (
                       historyEmpty('No lab results recorded.')
                     ) : (
                       <div className="space-y-3">
                         {labResults.map((l, i) => (
                           <div key={l.labResultId || l.id || i} className="flex flex-col gap-3 rounded-xl bg-[#F8FAFF] border border-[#EEF2FF] p-4 sm:flex-row sm:items-center sm:justify-between">
                             <div>
                               <p className="text-sm font-bold text-[#0F1A3A]">{l.testName || 'Lab test'}</p>
                               <p className="text-xs text-[#8A97B0] mt-1">{formatHistoryDate(l.date || l.resultDate)}{l.normalRange ? ` - Normal ${l.normalRange}` : ''}</p>
                             </div>
                             <div className="text-left sm:text-right">
                               <p className="text-sm font-black text-[#0F1A3A]">{[l.value, l.unit].filter(Boolean).join(' ') || 'Result N/A'}</p>
                               {l.interpretation && <p className="text-xs font-bold text-brand-blue mt-1">{l.interpretation}</p>}
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>

                   {/* Documents */}
                   <div className="card p-5 border border-[#DDE3F0] xl:col-span-2">
                     {historySectionHeader(FileText, 'Documents', 'Reports and uploaded medical files', 'text-slate-600', 'bg-slate-50')}
                     {documents.length === 0 ? (
                       historyEmpty('No documents recorded.')
                     ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         {documents.map((d, i) => (
                           <div key={d.documentId || d.id || i} className="rounded-xl bg-[#F8FAFF] border border-[#EEF2FF] p-4">
                             <div className="flex items-start justify-between gap-3">
                               <div>
                                 <p className="text-sm font-bold text-[#0F1A3A]">{d.fileName || d.name || 'Medical document'}</p>
                                 <p className="text-xs text-[#8A97B0] mt-1">{d.type || 'DOCUMENT'} - {formatHistoryDate(d.date || d.createdAt)}</p>
                               </div>
                               {d.fileUrl && (
                                 <a href={d.fileUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#DDE3F0] bg-white text-brand-blue hover:bg-[#EEF2FF]" title="Open document" aria-label="Open document">
                                   <Eye size={16} />
                                 </a>
                               )}
                             </div>
                             {d.notes && <p className="text-xs text-[#4B5A7A] mt-3 line-clamp-2">{d.notes}</p>}
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                   </div>
                 </>
               )}
             </div>
          ) : activeTab === 'restrictions' ? (
             <div className="space-y-4">
               {restrictions.map(r => (
                 <div key={r.id} className="card p-5">
                    <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-brand-red">
                             <Ban size={20} />
                          </div>
                          <div>
                             <p className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider mb-0.5">Restriction Type</p>
                             <p className="text-sm font-bold text-[#0F1A3A]">{r.restrictionType?.replace(/_/g, ' ')}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <span className="badge badge-green">Active</span>
                          <span className="text-xs text-[#8A97B0]">{new Date(r.createdAt).toLocaleDateString()}</span>
                       </div>
                    </div>
                    <div className="bg-[#F8FAFF] p-4 rounded-xl border border-[#DDE3F0]">
                       <p className="text-xs font-bold text-[#A0AECB] uppercase tracking-wider mb-2">Justification</p>
                       <p className="text-sm text-[#4B5A7A] italic">"{r.justification}"</p>
                    </div>
                 </div>
               ))}
               {restrictions.length === 0 && (
                 <div className="card p-16 text-center">
                    <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-[#DDE3F0]" />
                    <p className="text-sm font-semibold text-[#8A97B0]">No active privacy restrictions.</p>
                 </div>
               )}
             </div>
          ) : null}
        </div>
      </div>

      {/* Amendment Modal */}
      {showAmendmentModal && (
        <div className="fixed inset-0 bg-[#0F1A3A]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#DDE3F0]">
            <div className="flex items-center justify-between p-6 border-b border-[#F0F4FC]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-brand-blue">
                   <FileEdit size={20} />
                </div>
                <h2 className="font-black text-[#0F1A3A] text-lg">Request Amendment</h2>
              </div>
              <button onClick={() => setShowAmendmentModal(false)} className="p-2 rounded-xl text-[#8A97B0] hover:bg-[#F0F4FC] hover:text-brand-red transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateAmendment} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">Record *</label>
                <select required value={amendmentForm.recordId} onChange={e => setAmendmentForm({ ...amendmentForm, recordId: e.target.value })} className="input py-2.5 text-sm">
                   <option value="">Select Record</option>
                   {records.map(r => <option key={r.id} value={r.id}>{r.diagnosis || 'Unknown'} - {new Date(r.incidentDateTime || r.createdAt).toLocaleDateString()}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">Data Category</label>
                <select value={amendmentForm.dataCategory} onChange={e => setAmendmentForm({ ...amendmentForm, dataCategory: e.target.value })} className="input py-2.5 text-sm">
                   {DATA_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">Justification / Details *</label>
                <textarea required rows={4} value={amendmentForm.justification} onChange={e => setAmendmentForm({ ...amendmentForm, justification: e.target.value })}
                  placeholder="Explain the needed correction…" className="input py-2.5 text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAmendmentModal(false)} className="btn-ghost flex-1 justify-center border border-[#DDE3F0] rounded-xl py-2.5">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center py-2.5 text-sm">
                  {isSubmitting ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {isSubmitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restriction Modal */}
      {showRestrictionModal && (
        <div className="fixed inset-0 bg-[#0F1A3A]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#DDE3F0]">
            <div className="flex items-center justify-between p-6 border-b border-[#F0F4FC]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-brand-red">
                   <Ban size={20} />
                </div>
                <h2 className="font-black text-[#0F1A3A] text-lg">Manage Privacy</h2>
              </div>
              <button onClick={() => setShowRestrictionModal(false)} className="p-2 rounded-xl text-[#8A97B0] hover:bg-[#F0F4FC] hover:text-brand-red transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateRestriction} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">Restriction Type</label>
                <select value={restrictionForm.restrictionType} onChange={e => setRestrictionForm({ ...restrictionForm, restrictionType: e.target.value })} className="input py-2.5 text-sm">
                   {RESTRICTION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">Data Category</label>
                <select value={restrictionForm.dataCategory} onChange={e => setRestrictionForm({ ...restrictionForm, dataCategory: e.target.value })} className="input py-2.5 text-sm">
                   {DATA_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">Reason *</label>
                <textarea required rows={4} value={restrictionForm.justification} onChange={e => setRestrictionForm({ ...restrictionForm, justification: e.target.value })}
                  placeholder="Provide reason for this restriction…" className="input py-2.5 text-sm resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowRestrictionModal(false)} className="btn-ghost flex-1 justify-center border border-[#DDE3F0] rounded-xl py-2.5">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-danger flex-1 justify-center py-2.5 text-sm">
                  {isSubmitting ? <RefreshCw size={15} className="animate-spin" /> : <Ban size={15} />}
                  {isSubmitting ? 'Saving…' : 'Apply Restriction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timeline View Modal */}
      {timelineViewItem && (
        <TimelineViewModal item={timelineViewItem} onClose={() => setTimelineViewItem(null)} />
      )}
    </div>
  );
}
