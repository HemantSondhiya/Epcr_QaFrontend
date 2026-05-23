import { useState, useEffect } from 'react';
import {
   ArrowLeft, ArrowRight, Save, ChevronRight, User, Activity, FilePlus2,
   CheckCircle2, Layers, AlertTriangle, Pill, ClipboardList,
   FlaskConical, Clock, Shield, Zap, Heart, Thermometer,
   Stethoscope, Syringe, Building, ChevronLeft, Fingerprint, Lock,
   RefreshCw, Search, Check
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import { createRecord, updateRecord } from '../store/slices/epcrSlice';
import { fetchAllPatientHistory } from '../store/slices/patientHistorySlice';
import { fetchWorkflows, selectWorkflows } from '../store/slices/workflowSlice';
import DynamicFormRenderer from '../components/forms/DynamicFormRenderer';
import client from '../api/client';

const INCIDENT_TYPES = ['GENERAL', 'TRAUMA', 'CARDIOLOGY', 'RESPIRATORY', 'NEUROLOGY', 'OBSTETRIC', 'PEDIATRIC', 'BEHAVIORAL', 'DENTIST', 'ONCOLOGY', 'RADIOLOGY'];
const TRANSPORT_MODES = ['ALS', 'BLS', 'CRITICAL_CARE', 'AIR', 'WATER', 'WHEELCHAIR', 'WALK_IN'];
const CARE_LEVELS = ['ALS', 'BLS', 'CCT', 'SCT', 'MFR', 'EMT', 'PARAMEDIC'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const TRIAGE_TAGS = ['RED', 'YELLOW', 'GREEN', 'BLACK'];

const inputCls = 'w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-800 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all';
const inputReqCls = 'w-full bg-white border border-brand-blue/40 rounded-lg px-4 py-3 text-sm text-slate-800 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all';
const labelCls = 'text-xs font-semibold text-slate-600 mb-1.5 block';
const labelReqCls = 'text-xs font-semibold text-slate-800 mb-1.5 block after:content-["*"] after:ml-1 after:text-brand-red';

const CreateRecord = () => {
   const navigate = useNavigate();
   const [searchParams] = useSearchParams();
   const recordId = searchParams.get('id');
   const prefilledPatientId = searchParams.get('patientId');
   const dispatch = useDispatch();
   const user = useSelector(selectUser);
   const [currentStep, setCurrentStep] = useState(1);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [error, setError] = useState('');
   const [fieldErrors, setFieldErrors] = useState({});
   const [idempotencyKey, setIdempotencyKey] = useState(() => {
      return self.crypto?.randomUUID ? self.crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36));
   });

   const workflows = useSelector(selectWorkflows);
   const [selectedWorkflow, setSelectedWorkflow] = useState(null);
   const [dynamicFormResponses, setDynamicFormResponses] = useState({});

   const [patientMode, setPatientMode] = useState(prefilledPatientId ? 'existing' : 'new');
   const [searchPhone, setSearchPhone] = useState('');
   const [searchResults, setSearchResults] = useState([]);
   const [isSearching, setIsSearching] = useState(false);

   const [formData, setFormData] = useState({
      // Patient
      patientId: prefilledPatientId || '',
      patientName: '',
      patientDateOfBirth: '',
      patientGender: '',
      patientPhone: '',
      patientAddress: '',
      patientSSNLast4: '',
      email: '',
      age: '',
      height: '',
      weight: '',
      bloodGroup: '',
      // Medical History (Nested)
      medicalHistory: {
         pastConditions: [],
         currentMedications: [],
         allergies: [],
         surgicalHistory: [],
         comorbidity: '',
         currentMedicines: '',
         allergy: '',
         doctor: '',
         surgicalHistoryString: '',
         dnrOnFile: false,
         advanceDirective: false,
         advanceDirectiveType: '',
         primaryPhysicianName: '',
         primaryPhysicianContact: '',
         primaryPhysicianFacility: '',
         smoker: false,
         alcoholUse: false,
         substanceUse: false,
         substanceUseDetails: '',
         pregnant: false,
         gestationalWeekIfPregnant: null,
         lastKnownWellDateTime: null,
         lastOralIntake: null,
         notes: [],
      },
      // Incident
      incidentDateTime: '',
      incidentLocation: '',
      incidentDescription: '',
      incidentType: '',
      incidentNumber: '',
      // Scene Assessment (Nested)
      sceneAssessment: {
         sceneType: '',
         sceneSafe: true,
         sceneHazards: '',
         traumaCall: false,
         mechanismOfInjury: '',
         injuryLocation: '',
         numberOfPatients: 1,
         massCasualtyIncident: false,
         triageTag: '',
         weatherConditions: '',
         lightingConditions: '',
         witnessPresent: false,
         witnessName: '',
         witnessContact: '',
         bystanderCPRPerformed: false,
         aedUsedByBystander: false,
         patientAccessDifficulty: '',
         geoLocation: {
            latitude: null,
            longitude: null,
            altitude: null,
            geohash: ''
         }
      },
      // Timeline (Nested)
      timeline: {
         callReceivedAt: null,
         dispatchedAt: null,
         enRouteAt: null,
         arrivedSceneAt: null,
         patientContactAt: null,
         departedSceneAt: null,
         arrivedDestinationAt: null,
         transferOfCareAt: null,
         unitAvailableAt: null,
      },
      // Vitals & Clinical
      systolicBp: '',
      diastolicBp: '',
      pulseRate: '',
      respirationRate: '',
      spo2: '',
      temperature: '',
      bloodSugar: '',
      hemoglobin: '',
      heartRate: '',
      glasgowComaScale: '',
      mentalStatus: '',
      primaryImpression: '',
      secondaryImpression: '',
      diagnosis: '',
      treatmentProvided: '',
      treatmentPlan: '',
      dietAdvice: [],
      notes: [],
      // Complaints
      complaints: [],
      structuredComplaints: [],
      // Arrays
      crew: [],
      vitals: [],
      structuredVitals: [],
      medicationsAdministered: [],
      proceduresPerformed: [],
      structuredMedications: [],
      structuredProcedures: [],
      // Transport (Nested)
      transport: {
         transportMode: '',
         transportReason: '',
         refusalOfTransportReason: '',
         destinationFacilityId: '',
         destinationName: '',
         destinationAddress: '',
         destinationType: 'HOSPITAL',
         destinationGeoLocation: {
            latitude: null,
            longitude: null,
            altitude: null,
            geohash: ''
         },
         receivingPhysicianName: '',
         receivingNurseName: '',
         handoffReport: '',
         hospitalNotified: false,
         hospitalNotifiedAt: null,
         patientConditionOnDeparture: 'STABLE',
         patientConditionOnArrival: 'STABLE',
         careLevel: 'STABLE',
         continuedCPRDuringTransport: false,
         aedUsedDuringTransport: false
      },
      // Consent (Nested)
      consent: {
         patientConsentObtained: true,
         consentType: 'VERBAL',
         refusalOfCare: false,
         refusalReason: '',
         refusalWitnessed: false,
         witnessName: '',
         witnessContact: '',
         patientInformedOfRisks: true,
         patientHasDecisionCapacity: true,
         capacityAssessmentNotes: '',
         guardianConsentObtained: false,
         guardianName: '',
         guardianRelationship: '',
         guardianPhone: '',
         patientSignatureAttachmentId: '',
         guardianSignatureAttachmentId: '',
         crewSignatureAttachmentId: '',
      },
      // Meta
      status: 'PENDING',
      paramedicsId: user?.id || '',
      organizationId: user?.organizationId || '',
   });

   useEffect(() => {
      dispatch(fetchWorkflows());
   }, [dispatch]);

   useEffect(() => {
      const fetchRecord = async () => {
         if (!recordId) return;
         try {
            const { data } = await client.get(`/api/epcr/records/${recordId}`);
            setFormData(prev => ({
               ...prev,
               ...data,
               medicalHistory: { ...prev.medicalHistory, ...(data.medicalHistory || {}) },
               sceneAssessment: { ...prev.sceneAssessment, ...(data.sceneAssessment || {}) },
               timeline: { ...prev.timeline, ...(data.timeline || {}) },
               transport: { ...prev.transport, ...(data.transport || {}) },
               consent: { ...prev.consent, ...(data.consent || {}) },
               complaints: data.complaints?.length ? data.complaints.join('\n') : '',
               vitals: data.vitals?.length ? data.vitals.join('\n') : '',
               proceduresPerformed: data.proceduresPerformed?.length ? data.proceduresPerformed.join('\n') : '',
               medicationsAdministered: data.medicationsAdministered?.length ? data.medicationsAdministered.join('\n') : '',
               dietAdvice: Array.isArray(data.dietAdvice) ? data.dietAdvice : [],
               notes: Array.isArray(data.notes) ? data.notes : [],
            }));
            if (data.dynamicFormResponses) {
               setDynamicFormResponses(data.dynamicFormResponses);
            }
         } catch (err) {
            dispatch(addToast({ type: 'error', message: 'Failed to load record details' }));
         }
      };
      fetchRecord();
   }, [recordId, dispatch]);

   const handlePatientSearch = async () => {
      if (!searchPhone) return;
      setIsSearching(true);
      try {
         const { data } = await client.get("/api/admin/patients/search", { params: { phone: searchPhone } });
         setSearchResults(Array.isArray(data) ? data : (data.content || []));
         if ((!data || data.length === 0) && !data.content?.length) {
            dispatch(addToast({ type: 'info', message: 'No patient found with that phone number.' }));
         }
      } catch (err) {
         dispatch(addToast({ type: 'error', message: 'Failed to search patients.' }));
      } finally {
         setIsSearching(false);
      }
   };

   const selectExistingPatient = (pat) => {
      const patMh = pat.medicalHistory || {};
      setFormData(prev => ({
         ...prev,
         patientId: pat.patientId || pat.id,
         patientName: pat.patientName ?? pat.displayName ?? pat.name ?? `${pat.firstName || ''} ${pat.lastName || ''}`.trim(),
         patientDateOfBirth: pat.patientDateOfBirth ?? pat.dateOfBirth ?? pat.dob ?? '',
         patientGender: pat.patientGender ?? pat.gender ?? '',
         patientPhone: pat.patientPhone ?? pat.phone ?? pat.phoneNumber ?? searchPhone,
         email: pat.patientEmail ?? pat.email ?? '',
         age: pat.patientAge ?? pat.age ?? '',
         bloodGroup: pat.patientBloodGroup ?? pat.bloodGroup ?? '',
         height: pat.patientHeight ?? pat.height ?? '',
         weight: pat.patientWeight ?? pat.weight ?? '',
         patientAddress: pat.patientAddress ?? pat.address ?? '',
         patientSSNLast4: pat.patientSSNLast4 ?? pat.ssnLast4 ?? '',
         spo2: pat.patientSpo2 ?? pat.spo2 ?? '',
         respirationRate: pat.patientRespirationRate ?? pat.respirationRate ?? '',
         bloodSugar: pat.patientBloodSugar ?? pat.bloodSugar ?? '',
         heartRate: pat.patientHeartRate ?? pat.heartRate ?? '',
         diastolicBp: pat.patientDiastolicBp ?? pat.diastolicBp ?? '',
         systolicBp: pat.patientSystolicBp ?? pat.systolicBp ?? '',
         pulseRate: pat.patientPulseRate ?? pat.pulseRate ?? '',
         temperature: pat.patientTemperature ?? pat.temperature ?? pat.temperaturehemoglobin ?? '',
         hemoglobin: pat.patientHemoglobin ?? pat.hemoglobin ?? '',
         medicalHistory: {
            ...prev.medicalHistory,
            ...patMh,
            comorbidity: pat.patientComorbidity ?? pat.comorbidity ?? patMh.comorbidity ?? prev.medicalHistory.comorbidity ?? '',
            allergy: pat.patientAllergy ?? pat.allergy ?? patMh.allergy ?? prev.medicalHistory.allergy ?? '',
            doctor: pat.patientDoctor ?? pat.doctor ?? patMh.doctor ?? prev.medicalHistory.doctor ?? '',
            currentMedicines: pat.patientCurrentMedicines ?? pat.currentMedicines ?? patMh.currentMedicines ?? prev.medicalHistory.currentMedicines ?? '',
            notes: Array.isArray(patMh.notes) ? patMh.notes : prev.medicalHistory.notes,
         }
      }));
      setSearchResults([]);
      dispatch(addToast({ type: 'success', message: 'Patient linked successfully.' }));
   };

   const handleUnlinkPatient = () => {
      setFormData(prev => ({
         ...prev,
         patientId: '',
         patientName: '',
         patientDateOfBirth: '',
         patientGender: '',
         patientPhone: '',
         email: '',
         age: '',
         bloodGroup: '',
         height: '',
         weight: '',
         patientAddress: '',
         patientSSNLast4: '',
         spo2: '',
         respirationRate: '',
         bloodSugar: '',
         heartRate: '',
         diastolicBp: '',
         systolicBp: '',
         pulseRate: '',
         temperature: '',
         hemoglobin: '',
         medicalHistory: {
            ...prev.medicalHistory,
            pastConditions: [],
            currentMedications: [],
            allergies: [],
            surgicalHistory: [],
            comorbidity: '',
            currentMedicines: '',
            allergy: '',
            doctor: '',
            surgicalHistoryString: '',
            dnrOnFile: false,
            advanceDirective: false,
            advanceDirectiveType: '',
            primaryPhysicianName: '',
            primaryPhysicianContact: '',
            primaryPhysicianFacility: '',
            smoker: false,
            alcoholUse: false,
            substanceUse: false,
            substanceUseDetails: '',
            pregnant: false,
            gestationalWeekIfPregnant: null,
            lastKnownWellDateTime: null,
            lastOralIntake: null,
            notes: [],
         }
      }));
      setSearchPhone('');
   };

   const updateField = (path, value) => {
      setFormData(prev => {
         const newFormData = { ...prev };
         const keys = path.split('.');
         let last = newFormData;
         for (let i = 0; i < keys.length - 1; i++) {
            last[keys[i]] = { ...last[keys[i]] };
            last = last[keys[i]];
         }
         last[keys[keys.length - 1]] = value;
         return newFormData;
      });

      if (fieldErrors[path]) {
         const newErrors = { ...fieldErrors };
         delete newErrors[path];
         setFieldErrors(newErrors);
      }
   };

   const validateStep = (step) => {
      const errors = {};
      if (step === 1) {
         if (!formData.patientId) {
            if (!formData.patientName) errors.patientName = 'Name Required';
            if (!formData.patientDateOfBirth) errors.patientDateOfBirth = 'DOB Required';
            if (!formData.patientGender) errors.patientGender = 'Gender Required';
         }
      }
      if (step === 2) {
         if (!formData.incidentDateTime) errors.incidentDateTime = 'Timestamp Required';
         if (!formData.incidentLocation) errors.incidentLocation = 'Location Required';
         if (!formData.incidentType) errors.incidentType = 'Classification Required';
      }
      if (step === 4) {
         if (!formData.transport.destinationName) errors['transport.destinationName'] = 'Target Required';
         if (!formData.transport.transportMode) errors['transport.transportMode'] = 'Mode Required';
      }

      setFieldErrors(errors);
      return Object.keys(errors).length === 0;
   };

   const handleNext = () => {
      if (validateStep(currentStep)) {
         setCurrentStep(s => s + 1);
         window.scrollTo(0, 0);
      } else {
         dispatch(addToast({ type: 'error', message: 'Please fulfill all required parameters.' }));
      }
   };

   const handleWorkflowChange = (wfId) => {
      const wf = workflows.find(w => w.id === wfId);
      setSelectedWorkflow(wf);
   };

   const buildApiPayload = (data, dynamicData) => {
      const toArr = (v) => {
         if (Array.isArray(v)) return v.filter(x => x !== null && x !== undefined && x !== '');
         if (typeof v === 'string' && v.trim()) return [v.trim()];
         return [];
      };
      const toIso = (v) => {
         if (!v) return null;
         const s = String(v).trim();
         return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) ? `${s}:00` : (s || null);
      };
      const cv = (v) => (v === '' || v === null || v === undefined) ? null : (typeof v === 'string' ? v.trim() || null : v);
      const toNum = (v) => (v !== '' && v !== null && v !== undefined) ? (Number(v) || null) : null;

      const mh = data.medicalHistory || {};
      const { comorbidity = '', currentMedicines = '', allergy = '', doctor = '',
         surgicalHistoryString = '', pastConditions = [], currentMedications = [],
         allergies = [], surgicalHistory = [], dnrOnFile, advanceDirective,
         advanceDirectiveType, primaryPhysicianName, primaryPhysicianContact,
         primaryPhysicianFacility, smoker, alcoholUse, substanceUse, substanceUseDetails,
         pregnant, gestationalWeekIfPregnant, lastKnownWellDateTime, lastOralIntake } = mh;

      const sa = data.sceneAssessment || {};
      const tl = data.timeline || {};
      const tr = data.transport || {};
      const cn = data.consent || {};
      const clinicalVitals = {
         treatmentPhase: 'PRE',
         vitalPhase: 'PRE',
         recordedAt: toIso(data.incidentDateTime) || new Date().toISOString(),
         systolicBP: toNum(data.systolicBp),
         diastolicBP: toNum(data.diastolicBp),
         heartRate: toNum(data.heartRate) || toNum(data.pulseRate),
         pulseRate: toNum(data.pulseRate),
         respiratoryRate: toNum(data.respirationRate),
         oxygenSaturation: toNum(data.spo2),
         temperature: toNum(data.temperature),
         bloodGlucose: toNum(data.bloodSugar),
         hemoglobin: toNum(data.hemoglobin),
         glasgowComaScale: toNum(data.glasgowComaScale),
         mentalStatus: cv(data.mentalStatus) || '',
      };
      const hasClinicalVitals = Object.entries(clinicalVitals).some(([key, value]) => !['treatmentPhase', 'vitalPhase', 'recordedAt'].includes(key) && value !== null && value !== '');

      return {
         patientId: cv(data.patientId) || '',
         patientName: cv(data.patientName) || '',
         patientDateOfBirth: data.patientDateOfBirth || null,
         patientGender: cv(data.patientGender) || '',
         patientPhone: data.patientPhone ? String(data.patientPhone).replace(/[^\d+]/g, '') : '',
         patientAddress: cv(data.patientAddress) || '',
         patientSSNLast4: data.patientSSNLast4 || '',
         email: cv(data.email) || '',
         age: toNum(data.age),
         height: toNum(data.height),
         weight: toNum(data.weight),
         bloodGroup: cv(data.bloodGroup) || '',
         // Top-level legacy fields
         comorbidity: cv(comorbidity) || '',
         allergy: cv(allergy) || '',
         doctor: cv(doctor) || '',
         currentMedicines: cv(currentMedicines) || '',
         // Vitals
         systolicBp: toNum(data.systolicBp),
         diastolicBp: toNum(data.diastolicBp),
         pulseRate: toNum(data.pulseRate),
         heartRate: toNum(data.heartRate),
         respirationRate: toNum(data.respirationRate),
         spo2: toNum(data.spo2),
         temperature: toNum(data.temperature),
         bloodSugar: toNum(data.bloodSugar),
         hemoglobin: toNum(data.hemoglobin),
         // Patient-history friendly aliases
         systolicBP: clinicalVitals.systolicBP,
         diastolicBP: clinicalVitals.diastolicBP,
         respiratoryRate: clinicalVitals.respiratoryRate,
         oxygenSaturation: clinicalVitals.oxygenSaturation,
         bloodGlucose: clinicalVitals.bloodGlucose,
         glasgowComaScale: clinicalVitals.glasgowComaScale,
         // Clinical
         primaryImpression: cv(data.primaryImpression) || '',
         secondaryImpression: cv(data.secondaryImpression) || '',
         diagnosis: cv(data.diagnosis) || '',
         treatmentProvided: cv(data.treatmentProvided) || '',
         treatmentPlan: cv(data.treatmentPlan) || '',
         mentalStatus: cv(data.mentalStatus) || '',
         ecgRhythm: cv(data.ecgRhythm) || '',
         pupilsResponse: cv(data.pupilsResponse) || '',
         skinCondition: cv(data.skinCondition) || '',
         airwayManaged: data.airwayManaged ?? false,
         diagnosticFindings: cv(data.diagnosticFindings) || '',
         // Incident
         incidentDateTime: toIso(data.incidentDateTime),
         incidentLocation: cv(data.incidentLocation) || '',
         incidentDescription: cv(data.incidentDescription) || '',
         incidentType: cv(data.incidentType) || '',
         // Arrays (textarea → array)
         complaints: toArr(data.complaints),
         vitals: toArr(data.vitals),
         medicationsAdministered: toArr(data.medicationsAdministered),
         proceduresPerformed: toArr(data.proceduresPerformed),
         crew: data.crew || [],
         structuredComplaints: (data.structuredComplaints || []).map(sc => ({
            ...sc,
            onsetTime: toIso(sc.onsetTime),
            severity: toNum(sc.severity)
         })),
         structuredVitals: data.structuredVitals?.length ? data.structuredVitals.map(sv => ({
            ...sv,
            recordedAt: toIso(sv.recordedAt),
            heartRate: toNum(sv.heartRate),
            systolicBP: toNum(sv.systolicBP),
            diastolicBP: toNum(sv.diastolicBP),
            respiratoryRate: toNum(sv.respiratoryRate),
            oxygenSaturation: toNum(sv.oxygenSaturation),
            temperature: toNum(sv.temperature),
            glasgowComaScale: toNum(sv.glasgowComaScale),
            gcEye: toNum(sv.gcEye),
            gcVerbal: toNum(sv.gcVerbal),
            gcMotor: toNum(sv.gcMotor),
            painScore: toNum(sv.painScore),
            bloodGlucose: toNum(sv.bloodGlucose)
         })) : (hasClinicalVitals ? [clinicalVitals] : []),
         structuredMedications: (data.structuredMedications || []).map(sm => ({
            ...sm,
            dosage: toNum(sm.dosage),
            administrationAttempts: toNum(sm.administrationAttempts),
            administeredAt: toIso(sm.administeredAt)
         })),
         structuredProcedures: (data.structuredProcedures || []).map(sp => ({
            ...sp,
            attempts: toNum(sp.attempts),
            performedAt: toIso(sp.performedAt)
         })),
         // Transport-derived top-level
         transportMode: cv(tr.transportMode) || '',
         transportDestination: cv(tr.destinationName) || '',
         careLevel: cv(tr.careLevel) || '',
         // Nested: medicalHistory (API-clean, no frontend-only fields)
         medicalHistory: {
            pastConditions: pastConditions.length ? pastConditions : (comorbidity ? [comorbidity] : []),
            currentMedications: currentMedications.length ? currentMedications : (currentMedicines ? [currentMedicines] : []),
            allergies: allergies.length ? allergies : (allergy ? [allergy] : []),
            surgicalHistory: surgicalHistory.length ? surgicalHistory : (surgicalHistoryString ? [surgicalHistoryString] : []),
            dnrOnFile: dnrOnFile ?? false,
            advanceDirective: advanceDirective ?? false,
            advanceDirectiveType: cv(advanceDirectiveType) || '',
            primaryPhysicianName: cv(primaryPhysicianName) || '',
            primaryPhysicianContact: primaryPhysicianContact || '',
            primaryPhysicianFacility: cv(primaryPhysicianFacility) || '',
            smoker: smoker ?? false,
            alcoholUse: alcoholUse ?? false,
            substanceUse: substanceUse ?? false,
            substanceUseDetails: cv(substanceUseDetails) || '',
            pregnant: pregnant ?? false,
            gestationalWeekIfPregnant: gestationalWeekIfPregnant ? Number(gestationalWeekIfPregnant) : null,
            lastKnownWellDateTime: toIso(lastKnownWellDateTime),
            lastOralIntake: toIso(lastOralIntake),
            notes: toArr(mh.notes),
         },
         // Nested: sceneAssessment
         sceneAssessment: {
            sceneType: cv(sa.sceneType) || '',
            sceneSafe: sa.sceneSafe ?? true,
            sceneHazards: cv(sa.sceneHazards) || '',
            traumaCall: sa.traumaCall ?? false,
            mechanismOfInjury: cv(sa.mechanismOfInjury) || '',
            injuryLocation: cv(sa.injuryLocation) || '',
            numberOfPatients: toNum(sa.numberOfPatients) || 1,
            massCasualtyIncident: sa.massCasualtyIncident ?? false,
            triageTag: cv(sa.triageTag) || '',
            weatherConditions: cv(sa.weatherConditions) || '',
            lightingConditions: cv(sa.lightingConditions) || '',
            witnessPresent: sa.witnessPresent ?? false,
            witnessName: cv(sa.witnessName) || '',
            witnessContact: sa.witnessContact || '',
            bystanderCPRPerformed: sa.bystanderCPRPerformed ?? false,
            aedUsedByBystander: sa.aedUsedByBystander ?? false,
            patientAccessDifficulty: cv(sa.patientAccessDifficulty) || '',
            geoLocation: (sa.geoLocation?.latitude || sa.geoLocation?.longitude) ? {
               latitude: toNum(sa.geoLocation.latitude),
               longitude: toNum(sa.geoLocation.longitude),
               altitude: toNum(sa.geoLocation.altitude),
               geohash: cv(sa.geoLocation.geohash) || ''
            } : null,
         },
         // Nested: timeline
         timeline: {
            callReceivedAt: toIso(tl.callReceivedAt),
            dispatchedAt: toIso(tl.dispatchedAt),
            enRouteAt: toIso(tl.enRouteAt),
            arrivedSceneAt: toIso(tl.arrivedSceneAt),
            patientContactAt: toIso(tl.patientContactAt),
            departedSceneAt: toIso(tl.departedSceneAt),
            arrivedDestinationAt: toIso(tl.arrivedDestinationAt),
            transferOfCareAt: toIso(tl.transferOfCareAt),
            unitAvailableAt: toIso(tl.unitAvailableAt),
         },
         // Nested: transport
         transport: {
            transportMode: cv(tr.transportMode) || '',
            transportReason: cv(tr.transportReason) || '',
            refusalOfTransportReason: cv(tr.refusalOfTransportReason) || '',
            destinationFacilityId: cv(tr.destinationFacilityId) || '',
            destinationName: cv(tr.destinationName) || '',
            destinationAddress: cv(tr.destinationAddress) || '',
            destinationType: cv(tr.destinationType) || 'HOSPITAL',
            destinationGeoLocation: (tr.destinationGeoLocation?.latitude || tr.destinationGeoLocation?.longitude) ? {
               latitude: toNum(tr.destinationGeoLocation.latitude),
               longitude: toNum(tr.destinationGeoLocation.longitude),
               altitude: toNum(tr.destinationGeoLocation.altitude),
               geohash: cv(tr.destinationGeoLocation.geohash) || ''
            } : null,
            receivingPhysicianName: cv(tr.receivingPhysicianName) || '',
            receivingNurseName: cv(tr.receivingNurseName) || '',
            handoffReport: cv(tr.handoffReport) || '',
            hospitalNotified: tr.hospitalNotified ?? false,
            hospitalNotifiedAt: toIso(tr.hospitalNotifiedAt),
            patientConditionOnDeparture: cv(tr.patientConditionOnDeparture) || 'STABLE',
            patientConditionOnArrival: cv(tr.patientConditionOnArrival) || 'STABLE',
            careLevel: cv(tr.careLevel) || 'STABLE',
            continuedCPRDuringTransport: tr.continuedCPRDuringTransport ?? false,
            aedUsedDuringTransport: tr.aedUsedDuringTransport ?? false,
         },
         // Nested: consent
         consent: {
            patientConsentObtained: cn.patientConsentObtained ?? true,
            consentType: cn.consentType || 'VERBAL',
            refusalOfCare: cn.refusalOfCare ?? false,
            refusalReason: cv(cn.refusalReason) || '',
            refusalWitnessed: cn.refusalWitnessed ?? false,
            witnessName: cv(cn.witnessName) || '',
            witnessContact: cv(cn.witnessContact) || '',
            patientInformedOfRisks: cn.patientInformedOfRisks ?? true,
            patientHasDecisionCapacity: cn.patientHasDecisionCapacity ?? true,
            capacityAssessmentNotes: cv(cn.capacityAssessmentNotes) || '',
            guardianConsentObtained: cn.guardianConsentObtained ?? false,
            guardianName: cv(cn.guardianName) || '',
            guardianRelationship: cv(cn.guardianRelationship) || '',
            guardianPhone: cv(cn.guardianPhone) || '',
            patientSignatureAttachmentId: cv(cn.patientSignatureAttachmentId) || '',
            guardianSignatureAttachmentId: cv(cn.guardianSignatureAttachmentId) || '',
            crewSignatureAttachmentId: cv(cn.crewSignatureAttachmentId) || '',
         },
         // Meta
         paramedicsId: data.paramedicsId || '',
         organizationId: data.organizationId || '',
         status: data.status || 'PENDING',
         dietAdvice: toArr(data.dietAdvice),
         notes: toArr(data.notes),
         clinicalData: {
            vitals: hasClinicalVitals ? [clinicalVitals] : [],
            assessment: {
               diagnosis: cv(data.diagnosis) || '',
               primaryImpression: cv(data.primaryImpression) || '',
               secondaryImpression: cv(data.secondaryImpression) || '',
               treatmentProvided: cv(data.treatmentProvided) || '',
               treatmentPlan: cv(data.treatmentPlan) || '',
               mentalStatus: cv(data.mentalStatus) || '',
               ecgRhythm: cv(data.ecgRhythm) || '',
               pupilsResponse: cv(data.pupilsResponse) || '',
               skinCondition: cv(data.skinCondition) || '',
               airwayManaged: data.airwayManaged ?? false,
               diagnosticFindings: cv(data.diagnosticFindings) || '',
            },
            complaints: toArr(data.complaints),
            medicationsAdministered: toArr(data.medicationsAdministered),
            proceduresPerformed: toArr(data.proceduresPerformed),
            dietAdvice: toArr(data.dietAdvice),
            notes: toArr(data.notes),
            medicalHistoryNotes: toArr(mh.notes),
         },
         dynamicFormResponses: dynamicData || {},
      };
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      if (!validateStep(currentStep)) {
         dispatch(addToast({ type: 'error', message: 'Parameters incomplete for current sector.' }));
         return;
      }

      setIsSubmitting(true);
      setError('');
      setFieldErrors({});

      try {
         const payload = buildApiPayload(formData, dynamicFormResponses);
         if (selectedWorkflow?.id) payload.workflowId = selectedWorkflow.id;
         if (import.meta.env.DEV) console.log('[EPCR] Submitting payload:', JSON.stringify(payload, null, 2));
         
         let created;
         if (recordId) {
            created = await dispatch(updateRecord({ id: recordId, data: payload })).unwrap();
         } else {
            created = await dispatch(createRecord({ data: payload, idempotencyKey })).unwrap();
            // Clear / regenerate the key on success
            setIdempotencyKey(self.crypto?.randomUUID ? self.crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36)));
         }
         
         const generatedId = created?.incidentNumber || created?.patientId || created?.id;
         dispatch(addToast({ type: 'success', message: generatedId ? `Record ${recordId ? 'Updated' : 'Saved'}: ${generatedId}` : `Record ${recordId ? 'Updated' : 'Saved'}` }));
         
         const finalPatientId = formData.patientId || created?.patientId || created?.patient?.id;
         if (finalPatientId) {
            await dispatch(fetchAllPatientHistory(finalPatientId));
            navigate(`/patient-history/${finalPatientId}`);
         } else {
            navigate('/epcr');
         }
      } catch (err) {
         const msg = typeof err === 'string' ? err : (err?.message || 'Transmission Interrupted');
         setError(msg);
         dispatch(addToast({ type: 'error', message: msg || 'Protocol transmission failed.' }));
      } finally {
         setIsSubmitting(false);
      }
   };

   const StepIndicator = ({ step, label, icon }) => (
      <div className={`flex flex-col items-center gap-3 transition-all duration-300 relative group ${currentStep === step ? 'scale-105' : 'opacity-50 hover:opacity-100'}`}>
         <div className={`w-12 h-12 flex items-center justify-center rounded-full border-2 transition-all ${currentStep === step ? 'bg-brand-blue border-brand-blue text-white shadow-md' : 'bg-white border-slate-300 text-slate-400'}`}>
            {icon}
            {currentStep > step && <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full text-white p-0.5"><CheckCircle2 size={16} /></div>}
         </div>
         <span className={`text-xs font-bold text-center ${currentStep === step ? 'text-brand-blue' : 'text-slate-500'}`}>{label}</span>
      </div>
   );

   return (
      <div className="max-w-7xl mx-auto pb-24 space-y-12">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
               <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-brand-blue mb-6 transition-colors font-medium text-sm">
                  <ArrowLeft size={16} />
                  <span>Back to Records</span>
               </button>
               <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue">
                     <FilePlus2 size={28} />
                  </div>
                  <div>
                     <h1 className="text-3xl font-bold text-slate-800 leading-none">
                        {recordId ? 'Update' : 'New'} <span className="text-brand-blue">ePCR Record</span>
                     </h1>
                     <p className="text-sm font-medium text-slate-500 mt-2">Electronic Patient Care Reporting</p>
                  </div>
               </div>
            </div>
            <button onClick={handleSubmit} disabled={isSubmitting} className="bg-brand-blue text-white px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md">
               {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
               <span>{isSubmitting ? 'Saving...' : (recordId ? 'Update Record' : 'Save Record')}</span>
            </button>
         </div>

         {/* Workflow Selector */}
         <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">CLINICAL WORKFLOW</div>
            <div className="flex-1 flex flex-wrap gap-3">
               {workflows.map(wf => (
                  <button key={wf.id} onClick={() => handleWorkflowChange(wf.id)} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border-2 transition-all ${selectedWorkflow?.id === wf.id ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-slate-400 border-slate-100 hover:border-brand-blue hover:text-brand-blue'}`}>
                     {wf.name}
                  </button>
               ))}
            </div>
         </div>

         {/* Step Indicators */}
         <div className="flex justify-between max-w-2xl mx-auto px-10 border-b-2 border-slate-100 pb-8">
            <StepIndicator step={1} label="Subject" icon={<User size={24} />} />
            <StepIndicator step={2} label="Incident" icon={<Activity size={24} />} />
            <StepIndicator step={3} label="Clinical" icon={<Thermometer size={24} />} />
            <StepIndicator step={4} label="Disposition" icon={<ArrowRight size={24} />} />
         </div>

         <div className="brochure-card p-12 md:p-20 relative">
            <form onSubmit={handleSubmit} className="space-y-12">
               {error && (
                  <div className="p-6 bg-brand-red text-white font-black uppercase tracking-widest flex items-center gap-4">
                     <AlertTriangle size={24} /> {error}
                  </div>
               )}

               {/* ── STEP 1: SUBJECT ── */}
               {currentStep === 1 && (
                  <div className="space-y-12">

                     {!recordId && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                           <div className="flex items-center gap-4 mb-4">
                              <button type="button" onClick={() => setPatientMode('new')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${patientMode === 'new' ? 'bg-brand-blue text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>New Patient</button>
                              <button type="button" onClick={() => setPatientMode('existing')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${patientMode === 'existing' ? 'bg-brand-blue text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}>Existing Patient</button>
                           </div>

                           {patientMode === 'existing' && !formData.patientId && (
                              <div className="flex gap-2 items-end">
                                 <div className="flex-1 space-y-1.5">
                                    <label className={labelCls}>Search by Phone Number</label>
                                    <div className="relative">
                                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                       <input type="text" value={searchPhone} onChange={e => setSearchPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handlePatientSearch())} placeholder="e.g. 555-1234" className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none" />
                                    </div>
                                 </div>
                                 <button type="button" onClick={handlePatientSearch} disabled={isSearching} className="bg-brand-blue text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 h-[38px] flex items-center justify-center min-w-[100px]">
                                    {isSearching ? <RefreshCw className="animate-spin" size={16} /> : 'Search'}
                                 </button>
                              </div>
                           )}

                           {searchResults.length > 0 && (
                              <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                 <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500 uppercase">Search Results</div>
                                 {searchResults.map(pat => (
                                    <div key={pat.id || pat.patientId} className="px-4 py-3 border-b border-slate-100 last:border-0 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                       <div>
                                          <p className="text-sm font-bold text-slate-800">{pat.name || `${pat.firstName || ''} ${pat.lastName || ''}`.trim()}</p>
                                          <p className="text-xs text-slate-500">ID: {pat.patientId || pat.id} | DOB: {pat.dateOfBirth || pat.dob || 'N/A'}</p>
                                       </div>
                                       <button type="button" onClick={() => selectExistingPatient(pat)} className="text-brand-blue bg-blue-50 px-3 py-1.5 rounded text-xs font-bold hover:bg-brand-blue hover:text-white transition-all">Select</button>
                                    </div>
                                 ))}
                              </div>
                           )}

                           {patientMode === 'existing' && formData.patientId && (
                              <div className="mt-4 flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                                 <div className="flex items-center gap-2">
                                    <CheckCircle2 className="text-emerald-500" size={18} />
                                    <div>
                                       <p className="text-sm font-bold text-emerald-800">Linked to Existing Patient</p>
                                       <p className="text-xs text-emerald-600 font-medium">{formData.patientName} (ID: {formData.patientId})</p>
                                    </div>
                                 </div>
                                 <button type="button" onClick={handleUnlinkPatient} className="text-xs font-bold text-brand-red hover:underline">Unlink</button>
                              </div>
                           )}
                        </div>
                     )}

                     {/* Basic Info */}
                     <SectionTitle title="Patient Information" />
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Field label="Patient Name" field="patientName" value={formData.patientName} update={updateField} error={fieldErrors.patientName} required={patientMode === 'new'} disabled={patientMode === 'existing' && !!formData.patientId} />
                        <Field label="Patient ID" field="patientId" value={formData.patientId} update={updateField} disabled placeholder="Auto-generated on save" />
                        <Field label="Date of Birth" field="patientDateOfBirth" value={formData.patientDateOfBirth} update={updateField} type="date" error={fieldErrors.patientDateOfBirth} required={patientMode === 'new'} disabled={patientMode === 'existing' && !!formData.patientId} />
                        <div className="space-y-1.5">
                           <label className={fieldErrors.patientGender ? 'text-xs font-semibold text-brand-red mb-1.5 block' : (patientMode === 'new' ? labelReqCls : labelCls)}>Gender</label>
                           <select value={formData.patientGender} onChange={e => updateField('patientGender', e.target.value)} disabled={patientMode === 'existing' && !!formData.patientId} className={fieldErrors.patientGender ? 'w-full bg-white border border-brand-red rounded-lg px-4 py-3 text-sm text-brand-red focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all' : (patientMode === 'new' ? inputReqCls : inputCls)}>
                              <option value="">Select Gender</option>
                              <option value="MALE">Male</option>
                              <option value="FEMALE">Female</option>
                              <option value="OTHER">Other</option>
                           </select>
                           {fieldErrors.patientGender && <p className="text-xs font-medium text-brand-red mt-1">{fieldErrors.patientGender}</p>}
                        </div>
                        <Field label="Age" field="age" value={formData.age} update={updateField} type="number" />
                        <Field label="Email Address" field="email" value={formData.email} update={updateField} type="email" />
                        <Field label="Phone Number" field="patientPhone" value={formData.patientPhone} update={updateField} />
                        <Field label="SSN Last 4" field="patientSSNLast4" value={formData.patientSSNLast4} update={updateField} maxLength={4} />
                        <div className="space-y-1.5">
                           <label className={labelCls}>Blood Group</label>
                           <select value={formData.bloodGroup} onChange={e => updateField('bloodGroup', e.target.value)} className={inputCls}>
                              <option value="">Select Blood Group</option>
                              {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                           </select>
                        </div>
                        <Field label="Height (cm)" field="height" value={formData.height} update={updateField} type="number" />
                        <Field label="Weight (kg)" field="weight" value={formData.weight} update={updateField} type="number" />
                     </div>
                     <div className="space-y-1.5 mt-6">
                        <label className={labelCls}>Address</label>
                        <textarea rows={2} value={formData.patientAddress} onChange={e => updateField('patientAddress', e.target.value)} disabled={patientMode === 'existing' && !!formData.patientId} className={inputCls + ' resize-none'} />
                     </div>

                     {/* Medical History */}
                     <SectionTitle title="Medical History" />
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Field label="Comorbidity" field="medicalHistory.comorbidity" value={formData.medicalHistory.comorbidity} update={updateField} />
                        <Field label="Current Medicines" field="medicalHistory.currentMedicines" value={formData.medicalHistory.currentMedicines} update={updateField} />
                        <Field label="Allergy" field="medicalHistory.allergy" value={formData.medicalHistory.allergy} update={updateField} />
                        <Field label="Assigned Doctor" field="medicalHistory.doctor" value={formData.medicalHistory.doctor} update={updateField} />
                        <Field label="Surgical History" field="medicalHistory.surgicalHistoryString" value={formData.medicalHistory.surgicalHistoryString} update={updateField} />
                        <Field label="Primary Physician" field="medicalHistory.primaryPhysicianName" value={formData.medicalHistory.primaryPhysicianName} update={updateField} />
                        <Field label="Physician Contact" field="medicalHistory.primaryPhysicianContact" value={formData.medicalHistory.primaryPhysicianContact} update={updateField} />
                        <Field label="Physician Facility" field="medicalHistory.primaryPhysicianFacility" value={formData.medicalHistory.primaryPhysicianFacility} update={updateField} />
                        <Field label="Advance Directive Type" field="medicalHistory.advanceDirectiveType" value={formData.medicalHistory.advanceDirectiveType} update={updateField} />
                     </div>

                     {/* Pregnancy */}
                     {formData.patientGender === 'FEMALE' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                           <ToggleField label="Pregnant" field="medicalHistory.pregnant" value={formData.medicalHistory.pregnant} update={updateField} />
                           {formData.medicalHistory.pregnant && (
                              <Field label="Gestational Week" field="medicalHistory.gestationalWeekIfPregnant" value={formData.medicalHistory.gestationalWeekIfPregnant} update={updateField} type="number" />
                           )}
                        </div>
                     )}

                     {/* Substance Use */}
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <ToggleField label="DNR On File" field="medicalHistory.dnrOnFile" value={formData.medicalHistory.dnrOnFile} update={updateField} />
                        <ToggleField label="Advance Directive" field="medicalHistory.advanceDirective" value={formData.medicalHistory.advanceDirective} update={updateField} />
                        <ToggleField label="Smoker" field="medicalHistory.smoker" value={formData.medicalHistory.smoker} update={updateField} />
                        <ToggleField label="Alcohol Use" field="medicalHistory.alcoholUse" value={formData.medicalHistory.alcoholUse} update={updateField} />
                        <ToggleField label="Substance Use" field="medicalHistory.substanceUse" value={formData.medicalHistory.substanceUse} update={updateField} />
                     </div>
                     {formData.medicalHistory.substanceUse && (
                        <Field label="Substance Use Details" field="medicalHistory.substanceUseDetails" value={formData.medicalHistory.substanceUseDetails} update={updateField} />
                     )}

                     {/* Last Known */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <Field label="Last Known Well" field="medicalHistory.lastKnownWellDateTime" value={formData.medicalHistory.lastKnownWellDateTime} update={updateField} type="datetime-local" />
                        <Field label="Last Oral Intake" field="medicalHistory.lastOralIntake" value={formData.medicalHistory.lastOralIntake} update={updateField} type="datetime-local" />
                     </div>
                     <BulletListField
                        label="Medical History Notes"
                        addLabel="Add note"
                        values={formData.medicalHistory.notes}
                        onChange={(next) => updateField('medicalHistory.notes', next)}
                        placeholder="Known diabetic"
                     />
                  </div>
               )}

               {/* ── STEP 2: INCIDENT ── */}
               {currentStep === 2 && (
                  <div className="space-y-12">

                     <SectionTitle title="Incident Details" />
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Field label="Incident Timestamp" field="incidentDateTime" value={formData.incidentDateTime} update={updateField} type="datetime-local" error={fieldErrors.incidentDateTime} required />
                        <Field label="Incident Location" field="incidentLocation" value={formData.incidentLocation} update={updateField} error={fieldErrors.incidentLocation} required />
                        <div className="space-y-1.5">
                           <label className={fieldErrors.incidentType ? 'text-xs font-semibold text-brand-red mb-1.5 block' : labelReqCls}>Incident Type</label>
                           <select value={formData.incidentType} onChange={e => updateField('incidentType', e.target.value)} className={fieldErrors.incidentType ? 'w-full bg-white border border-brand-red rounded-lg px-4 py-3 text-sm text-brand-red focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all' : inputReqCls}>
                              <option value="">Select Type</option>
                              {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                           </select>
                           {fieldErrors.incidentType && <p className="text-xs font-medium text-brand-red mt-1">{fieldErrors.incidentType}</p>}
                        </div>
                        <Field label="Incident Number" field="incidentNumber" value={formData.incidentNumber} update={updateField} disabled placeholder="Auto-generated on save" />
                        <Field label="Scene Type" field="sceneAssessment.sceneType" value={formData.sceneAssessment.sceneType} update={updateField} />
                        <Field label="Number of Patients" field="sceneAssessment.numberOfPatients" value={formData.sceneAssessment.numberOfPatients} update={updateField} type="number" />
                        <Field label="Mechanism of Injury" field="sceneAssessment.mechanismOfInjury" value={formData.sceneAssessment.mechanismOfInjury} update={updateField} />
                        <Field label="Injury Location" field="sceneAssessment.injuryLocation" value={formData.sceneAssessment.injuryLocation} update={updateField} />
                        <Field label="Scene Hazards" field="sceneAssessment.sceneHazards" value={formData.sceneAssessment.sceneHazards} update={updateField} />
                        <Field label="Weather Conditions" field="sceneAssessment.weatherConditions" value={formData.sceneAssessment.weatherConditions} update={updateField} />
                        <Field label="Lighting Conditions" field="sceneAssessment.lightingConditions" value={formData.sceneAssessment.lightingConditions} update={updateField} />
                        <Field label="Patient Access Difficulty" field="sceneAssessment.patientAccessDifficulty" value={formData.sceneAssessment.patientAccessDifficulty} update={updateField} />
                        <div className="space-y-1.5">
                           <label className={labelCls}>Triage Tag</label>
                           <select value={formData.sceneAssessment.triageTag} onChange={e => updateField('sceneAssessment.triageTag', e.target.value)} className={inputCls}>
                              <option value="">Select Triage Tag</option>
                              {TRIAGE_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                           </select>
                        </div>
                        <Field label="Latitude" field="sceneAssessment.geoLocation.latitude" value={formData.sceneAssessment.geoLocation?.latitude || ''} update={updateField} type="number" />
                        <Field label="Longitude" field="sceneAssessment.geoLocation.longitude" value={formData.sceneAssessment.geoLocation?.longitude || ''} update={updateField} type="number" />
                        <Field label="Altitude" field="sceneAssessment.geoLocation.altitude" value={formData.sceneAssessment.geoLocation?.altitude || ''} update={updateField} type="number" />
                        <Field label="Geohash" field="sceneAssessment.geoLocation.geohash" value={formData.sceneAssessment.geoLocation?.geohash || ''} update={updateField} />
                     </div>

                     {/* Scene Toggles */}
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                        <ToggleField label="Scene Safe" field="sceneAssessment.sceneSafe" value={formData.sceneAssessment.sceneSafe} update={updateField} />
                        <ToggleField label="Trauma Call" field="sceneAssessment.traumaCall" value={formData.sceneAssessment.traumaCall} update={updateField} />
                        <ToggleField label="Mass Casualty" field="sceneAssessment.massCasualtyIncident" value={formData.sceneAssessment.massCasualtyIncident} update={updateField} />
                        <ToggleField label="Witness Present" field="sceneAssessment.witnessPresent" value={formData.sceneAssessment.witnessPresent} update={updateField} />
                        <ToggleField label="Bystander CPR" field="sceneAssessment.bystanderCPRPerformed" value={formData.sceneAssessment.bystanderCPRPerformed} update={updateField} />
                        <ToggleField label="AED By Bystander" field="sceneAssessment.aedUsedByBystander" value={formData.sceneAssessment.aedUsedByBystander} update={updateField} />
                     </div>

                     {/* Witness Info */}
                     {formData.sceneAssessment.witnessPresent && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                           <Field label="Witness Name" field="sceneAssessment.witnessName" value={formData.sceneAssessment.witnessName} update={updateField} />
                           <Field label="Witness Contact" field="sceneAssessment.witnessContact" value={formData.sceneAssessment.witnessContact} update={updateField} />
                        </div>
                     )}

                     {/* Narrative */}
                     <div className="space-y-1.5 mt-6">
                        <label className={labelCls}>Narrative Description</label>
                        <textarea rows={4} value={formData.incidentDescription} onChange={e => updateField('incidentDescription', e.target.value)} className={inputCls + ' resize-none'} />
                     </div>

                     {/* Timeline */}
                     <SectionTitle title="Response Timeline" />
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Field label="Call Received At" field="timeline.callReceivedAt" value={formData.timeline.callReceivedAt} update={updateField} type="datetime-local" />
                        <Field label="Dispatched At" field="timeline.dispatchedAt" value={formData.timeline.dispatchedAt} update={updateField} type="datetime-local" />
                        <Field label="En Route At" field="timeline.enRouteAt" value={formData.timeline.enRouteAt} update={updateField} type="datetime-local" />
                        <Field label="Arrived Scene At" field="timeline.arrivedSceneAt" value={formData.timeline.arrivedSceneAt} update={updateField} type="datetime-local" />
                        <Field label="Patient Contact At" field="timeline.patientContactAt" value={formData.timeline.patientContactAt} update={updateField} type="datetime-local" />
                        <Field label="Departed Scene At" field="timeline.departedSceneAt" value={formData.timeline.departedSceneAt} update={updateField} type="datetime-local" />
                        <Field label="Arrived Destination At" field="timeline.arrivedDestinationAt" value={formData.timeline.arrivedDestinationAt} update={updateField} type="datetime-local" />
                        <Field label="Transfer of Care At" field="timeline.transferOfCareAt" value={formData.timeline.transferOfCareAt} update={updateField} type="datetime-local" />
                        <Field label="Unit Available At" field="timeline.unitAvailableAt" value={formData.timeline.unitAvailableAt} update={updateField} type="datetime-local" />
                     </div>

                     {/* Complaints */}
                     <SectionTitle title="Chief Complaints" />
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                           <label className={labelCls}>Narrative Complaints (Legacy)</label>
                           <textarea rows={6} value={formData.complaints} onChange={e => updateField('complaints', e.target.value)} className={inputCls + ' resize-none'} placeholder="Enter complaints narrative..." />
                        </div>
                        <StructuredComplaintsListField
                           values={formData.structuredComplaints}
                           onChange={(next) => updateField('structuredComplaints', next)}
                        />
                     </div>
                  </div>
               )}

               {/* ── STEP 3: CLINICAL ── */}
               {currentStep === 3 && (
                  <div className="space-y-12">
                     <SectionTitle title="Clinical Vitals" />
                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
                        <Field label="BP Systolic" field="systolicBp" value={formData.systolicBp} update={updateField} type="number" />
                        <Field label="BP Diastolic" field="diastolicBp" value={formData.diastolicBp} update={updateField} type="number" />
                        <Field label="Pulse (BPM)" field="pulseRate" value={formData.pulseRate} update={updateField} type="number" />
                        <Field label="Resp (RR)" field="respirationRate" value={formData.respirationRate} update={updateField} type="number" />
                        <Field label="SpO2 (%)" field="spo2" value={formData.spo2} update={updateField} type="number" />
                        <Field label="Temp (°C)" field="temperature" value={formData.temperature} update={updateField} type="number" />
                        <Field label="Blood Sugar" field="bloodSugar" value={formData.bloodSugar} update={updateField} type="number" />
                        <Field label="GCS" field="glasgowComaScale" value={formData.glasgowComaScale} update={updateField} type="number" />
                        <Field label="Hemoglobin (g/dL)" field="hemoglobin" value={formData.hemoglobin} update={updateField} type="number" />
                     </div>
                     <StructuredVitalsListField
                        values={formData.structuredVitals}
                        onChange={(next) => updateField('structuredVitals', next)}
                     />

                     {/* Clinical Assessment */}
                     <SectionTitle title="Clinical Assessment" />
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Field label="Mental Status" field="mentalStatus" value={formData.mentalStatus} update={updateField} />
                        <Field label="ECG Rhythm" field="ecgRhythm" value={formData.ecgRhythm} update={updateField} />
                        <Field label="Pupils Response" field="pupilsResponse" value={formData.pupilsResponse} update={updateField} />
                        <Field label="Skin Condition" field="skinCondition" value={formData.skinCondition} update={updateField} />
                        <Field label="Primary Impression" field="primaryImpression" value={formData.primaryImpression} update={updateField} />
                        <Field label="Secondary Impression" field="secondaryImpression" value={formData.secondaryImpression} update={updateField} />
                        <Field label="Diagnosis" field="diagnosis" value={formData.diagnosis} update={updateField} />
                        <Field label="Treatment Provided" field="treatmentProvided" value={formData.treatmentProvided} update={updateField} />
                        <Field label="Treatment Plan" field="treatmentPlan" value={formData.treatmentPlan} update={updateField} />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ToggleField label="Airway Managed" field="airwayManaged" value={formData.airwayManaged} update={updateField} />
                     </div>

                     <div className="space-y-1.5 mt-6">
                        <label className={labelCls}>Diagnostic Findings</label>
                        <textarea rows={3} value={formData.diagnosticFindings} onChange={e => updateField('diagnosticFindings', e.target.value)} className={inputCls + ' resize-none'} />
                     </div>
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        <div className="space-y-1.5">
                           <label className={labelCls}>Procedures Performed (Legacy)</label>
                           <textarea rows={6} value={formData.proceduresPerformed} onChange={e => updateField('proceduresPerformed', e.target.value)} className={inputCls + ' resize-none'} placeholder="Enter procedures narrative..." />
                        </div>
                        <StructuredProceduresListField
                           values={formData.structuredProcedures}
                           onChange={(next) => updateField('structuredProcedures', next)}
                        />
                     </div>
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        <div className="space-y-1.5">
                           <label className={labelCls}>Medications Administered (Legacy)</label>
                           <textarea rows={6} value={formData.medicationsAdministered} onChange={e => updateField('medicationsAdministered', e.target.value)} className={inputCls + ' resize-none'} placeholder="Enter medications narrative..." />
                        </div>
                        <StructuredMedicationsListField
                           values={formData.structuredMedications}
                           onChange={(next) => updateField('structuredMedications', next)}
                        />
                     </div>
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <BulletListField
                           label="EPCR Notes"
                           addLabel="Add note"
                           values={formData.notes}
                           onChange={(next) => updateField('notes', next)}
                           placeholder="Patient stable on arrival"
                        />
                        <BulletListField
                           label="Diet Advice"
                           addLabel="Add diet advice"
                           values={formData.dietAdvice}
                           onChange={(next) => updateField('dietAdvice', next)}
                           placeholder="Low salt diet"
                        />
                     </div>

                     {/* Dynamic Workflow */}
                     {selectedWorkflow && (
                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-6">
                           <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                              <Layers size={18} className="text-brand-blue" /> Workflow: {selectedWorkflow.name}
                           </h3>
                           <DynamicFormRenderer
                              schema={selectedWorkflow.schema || { fields: [] }}
                              onSubmit={() => { }}
                              onCancel={() => { }}
                              hideActions={true}
                              onChange={(data) => setDynamicFormResponses(data)}
                              initialData={dynamicFormResponses}
                              errors={fieldErrors}
                           />
                        </div>
                     )}
                  </div>
               )}

               {/* ── STEP 4: DISPOSITION ── */}
               {currentStep === 4 && (
                  <div className="space-y-12">
                     <SectionTitle title="Disposition & Transport" />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field label="Destination Facility" field="transport.destinationName" value={formData.transport.destinationName} update={updateField} error={fieldErrors['transport.destinationName']} required />
                        <div className="space-y-1.5">
                           <label className={fieldErrors['transport.transportMode'] ? 'text-xs font-semibold text-brand-red mb-1.5 block' : labelReqCls}>Transport Mode</label>
                           <select value={formData.transport.transportMode} onChange={e => updateField('transport.transportMode', e.target.value)} required className={fieldErrors['transport.transportMode'] ? 'w-full bg-white border border-brand-red rounded-lg px-4 py-3 text-sm text-brand-red focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all' : inputReqCls}>
                              <option value="">Select Transport Mode</option>
                              {TRANSPORT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                           </select>
                           {fieldErrors['transport.transportMode'] && <p className="text-xs font-medium text-brand-red mt-1">{fieldErrors['transport.transportMode']}</p>}
                        </div>
                        <div className="space-y-1.5">
                           <label className={labelCls}>Care Level</label>
                           <select value={formData.transport.careLevel} onChange={e => updateField('transport.careLevel', e.target.value)} className={inputCls}>
                              <option value="">Select Care Level</option>
                              <option value="BASIC">Basic</option>
                              <option value="STABLE">Stable</option>
                              <option value="URGENT">Urgent</option>
                              <option value="CRITICAL">Critical</option>
                           </select>
                        </div>
                        <div className="space-y-1.5">
                           <label className={labelCls}>Record Status</label>
                           <select value={formData.status} onChange={e => updateField('status', e.target.value)} className={inputCls}>
                              <option value="PENDING">Pending</option>
                              <option value="ACTIVE">Active</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="CANCELLED">Cancelled</option>
                           </select>
                        </div>
                        <Field label="Transport Reason" field="transport.transportReason" value={formData.transport.transportReason} update={updateField} />
                        <Field label="Refusal of Transport Reason" field="transport.refusalOfTransportReason" value={formData.transport.refusalOfTransportReason} update={updateField} />
                        <Field label="Destination Facility ID" field="transport.destinationFacilityId" value={formData.transport.destinationFacilityId} update={updateField} />
                        <Field label="Destination Address" field="transport.destinationAddress" value={formData.transport.destinationAddress} update={updateField} />
                        <div className="space-y-1.5">
                           <label className={labelCls}>Destination Type</label>
                           <select value={formData.transport.destinationType} onChange={e => updateField('transport.destinationType', e.target.value)} className={inputCls}>
                              <option value="HOSPITAL">Hospital</option>
                              <option value="CLINIC">Clinic</option>
                              <option value="NURSING_HOME">Nursing Home</option>
                              <option value="RESIDENCE">Residence</option>
                              <option value="OTHER">Other</option>
                           </select>
                        </div>
                        <Field label="Receiving Physician Name" field="transport.receivingPhysicianName" value={formData.transport.receivingPhysicianName} update={updateField} />
                        <Field label="Receiving Nurse Name" field="transport.receivingNurseName" value={formData.transport.receivingNurseName} update={updateField} />
                        <div className="space-y-1.5">
                           <label className={labelCls}>Patient Condition on Departure</label>
                           <select value={formData.transport.patientConditionOnDeparture} onChange={e => updateField('transport.patientConditionOnDeparture', e.target.value)} className={inputCls}>
                              <option value="STABLE">Stable</option>
                              <option value="URGENT">Urgent</option>
                              <option value="CRITICAL">Critical</option>
                           </select>
                        </div>
                        <Field label="Hospital Notified At" field="transport.hospitalNotifiedAt" value={formData.transport.hospitalNotifiedAt} update={updateField} type="datetime-local" />
                        <ToggleField label="Hospital Notified" field="transport.hospitalNotified" value={formData.transport.hospitalNotified} update={updateField} />
                        <ToggleField label="Continued CPR During Transport" field="transport.continuedCPRDuringTransport" value={formData.transport.continuedCPRDuringTransport} update={updateField} />
                        <ToggleField label="AED Used During Transport" field="transport.aedUsedDuringTransport" value={formData.transport.aedUsedDuringTransport} update={updateField} />

                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                           <div className="md:col-span-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Destination Geo-Coordinates</div>
                           <Field label="Destination Latitude" field="transport.destinationGeoLocation.latitude" value={formData.transport.destinationGeoLocation?.latitude || ''} update={updateField} type="number" />
                           <Field label="Destination Longitude" field="transport.destinationGeoLocation.longitude" value={formData.transport.destinationGeoLocation?.longitude || ''} update={updateField} type="number" />
                           <Field label="Destination Altitude" field="transport.destinationGeoLocation.altitude" value={formData.transport.destinationGeoLocation?.altitude || ''} update={updateField} type="number" />
                           <Field label="Destination Geohash" field="transport.destinationGeoLocation.geohash" value={formData.transport.destinationGeoLocation?.geohash || ''} update={updateField} />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                           <label className={labelCls}>Handoff Report</label>
                           <textarea rows={3} value={formData.transport.handoffReport} onChange={e => updateField('transport.handoffReport', e.target.value)} className={inputCls + ' resize-none'} placeholder="Handoff report details..." />
                        </div>

                        <div className="space-y-1.5 md:col-span-2 mt-6">
                           <label className={labelReqCls}>Patient Condition on Arrival</label>
                           <div className="flex gap-3">
                              {[
                                 { id: 'RED', label: 'CRITICAL', color: 'bg-brand-red', hover: 'hover:bg-brand-red/10 hover:border-brand-red' },
                                 { id: 'YELLOW', label: 'URGENT', color: 'bg-amber-500', hover: 'hover:bg-amber-500/10 hover:border-amber-500' },
                                 { id: 'GREEN', label: 'STABLE', color: 'bg-emerald-600', hover: 'hover:bg-emerald-600/10 hover:border-emerald-600' },
                              ].map(t => (
                                 <button key={t.id} type="button" onClick={() => updateField('transport.patientConditionOnArrival', t.id === 'RED' ? 'CRITICAL' : (t.id === 'YELLOW' ? 'URGENT' : 'STABLE'))} className={`flex-1 py-3 rounded-lg text-sm font-semibold border transition-all ${formData.transport.patientConditionOnArrival === (t.id === 'RED' ? 'CRITICAL' : (t.id === 'YELLOW' ? 'URGENT' : 'STABLE')) ? `${t.color} text-white border-transparent shadow-md` : `bg-white text-slate-600 border-slate-300 ${t.hover}`}`}>
                                    {t.label}
                                 </button>
                              ))}
                           </div>
                        </div>
                     </div>

                     <SectionTitle title="Incident Crew" />
                     <CrewMembersListField
                        values={formData.crew}
                        onChange={(next) => updateField('crew', next)}
                     />

                     <SectionTitle title="Patient Consent & Signatures" />
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                           <label className={labelCls}>Consent Type</label>
                           <select value={formData.consent.consentType} onChange={e => updateField('consent.consentType', e.target.value)} className={inputCls}>
                              <option value="VERBAL">Verbal</option>
                              <option value="WRITTEN">Written</option>
                              <option value="IMPLIED">Implied</option>
                              <option value="GUARDIAN">Guardian</option>
                              <option value="REFUSED">Refused</option>
                           </select>
                        </div>
                        <ToggleField label="Patient Consent Obtained" field="consent.patientConsentObtained" value={formData.consent.patientConsentObtained} update={updateField} />
                        <ToggleField label="Patient Informed of Risks" field="consent.patientInformedOfRisks" value={formData.consent.patientInformedOfRisks} update={updateField} />
                        <ToggleField label="Patient Has Decision Capacity" field="consent.patientHasDecisionCapacity" value={formData.consent.patientHasDecisionCapacity} update={updateField} />
                        <ToggleField label="Refusal of Care" field="consent.refusalOfCare" value={formData.consent.refusalOfCare} update={updateField} />
                        
                        {formData.consent.refusalOfCare && (
                           <>
                              <Field label="Refusal Reason" field="consent.refusalReason" value={formData.consent.refusalReason} update={updateField} />
                              <ToggleField label="Refusal Witnessed" field="consent.refusalWitnessed" value={formData.consent.refusalWitnessed} update={updateField} />
                              <Field label="Refusal Witness Name" field="consent.witnessName" value={formData.consent.witnessName} update={updateField} />
                              <Field label="Refusal Witness Contact" field="consent.witnessContact" value={formData.consent.witnessContact} update={updateField} />
                           </>
                        )}

                        <div className="md:col-span-2 lg:col-span-3">
                           <Field label="Decision Capacity Assessment Notes" field="consent.capacityAssessmentNotes" value={formData.consent.capacityAssessmentNotes} update={updateField} />
                        </div>

                        <ToggleField label="Guardian Consent Obtained" field="consent.guardianConsentObtained" value={formData.consent.guardianConsentObtained} update={updateField} />
                        {formData.consent.guardianConsentObtained && (
                           <>
                              <Field label="Guardian Name" field="consent.guardianName" value={formData.consent.guardianName} update={updateField} />
                              <Field label="Guardian Relationship" field="consent.guardianRelationship" value={formData.consent.guardianRelationship} update={updateField} />
                              <Field label="Guardian Phone" field="consent.guardianPhone" value={formData.consent.guardianPhone} update={updateField} />
                           </>
                        )}

                        <div className="md:col-span-2 lg:col-span-3 border-t border-slate-100 pt-6 mt-6">
                           <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Signature Attachments</h4>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <Field label="Patient Signature Attachment ID" field="consent.patientSignatureAttachmentId" value={formData.consent.patientSignatureAttachmentId} update={updateField} placeholder="att-patient-sig" />
                              <Field label="Guardian Signature Attachment ID" field="consent.guardianSignatureAttachmentId" value={formData.consent.guardianSignatureAttachmentId} update={updateField} placeholder="att-guardian-sig" />
                              <Field label="Crew Signature Attachment ID" field="consent.crewSignatureAttachmentId" value={formData.consent.crewSignatureAttachmentId} update={updateField} placeholder="att-crew-sig" />
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* Navigation */}
               <div className="pt-8 border-t border-slate-200 flex justify-between items-center">
                  <button type="button" onClick={() => currentStep > 1 && setCurrentStep(s => s - 1)} disabled={currentStep === 1} className={`flex items-center gap-2 text-sm font-semibold transition-all ${currentStep === 1 ? 'opacity-0' : 'text-slate-500 hover:text-brand-blue'}`}>
                     <ChevronLeft size={18} /> Previous Step
                  </button>
                  {currentStep < 4 ? (
                     <button type="button" onClick={handleNext} className="bg-brand-blue text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-md flex items-center gap-2">
                        Next Step <ChevronRight size={18} />
                     </button>
                  ) : (
                     <button type="submit" disabled={isSubmitting} className="bg-brand-blue text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-md flex items-center gap-2">
                        {isSubmitting ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                        {recordId ? 'Update Record' : 'Save Record'}
                     </button>
                  )}
               </div>
            </form>
         </div>
      </div>
   );
};

const SectionTitle = ({ title }) => (
   <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
      <div className="w-1 h-5 bg-brand-blue rounded-full" />
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
   </div>
);

const Field = ({ label, field, value, update, type = 'text', required = false, disabled = false, maxLength, error, placeholder = '' }) => (
   <div className="space-y-1.5">
      <label className={error ? 'text-xs font-semibold text-brand-red mb-1.5 block' : (required ? labelReqCls : labelCls)}>{label}</label>
      <input
         type={type} value={value} onChange={e => update(field, e.target.value)} required={required} disabled={disabled} maxLength={maxLength} placeholder={placeholder}
         className={(error ? 'w-full bg-white border border-brand-red rounded-lg px-4 py-3 text-sm text-brand-red focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all' : (required ? inputReqCls : inputCls)) + (disabled ? ' opacity-60 bg-slate-100 cursor-not-allowed' : '')}
      />
      {error && <p className="text-xs font-medium text-brand-red mt-1">{error}</p>}
   </div>
);

const BulletListField = ({ label, addLabel, values = [], onChange, placeholder }) => {
   const list = Array.isArray(values) ? values : [];
   const updateItem = (index, value) => {
      const next = [...list];
      next[index] = value;
      onChange(next);
   };
   const removeItem = (index) => onChange(list.filter((_, i) => i !== index));
   const addItem = () => onChange([...list, '']);

   return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
         <div className="flex items-center justify-between gap-3">
            <label className={labelCls}>{label}</label>
            <button
               type="button"
               onClick={addItem}
               className="inline-flex items-center gap-1 rounded-lg bg-brand-blue px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-all"
            >
               <FilePlus2 size={14} /> {addLabel}
            </button>
         </div>
         <div className="space-y-2">
            {list.length === 0 ? (
               <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-400">No items added.</p>
            ) : list.map((item, index) => (
               <div key={index} className="flex items-center gap-2">
                  <span className="text-brand-blue font-black">•</span>
                  <input
                     type="text"
                     value={item}
                     onChange={(e) => updateItem(index, e.target.value)}
                     placeholder={placeholder}
                     className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-all"
                  />
                  <button type="button" onClick={() => removeItem(index)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 hover:border-brand-red hover:text-brand-red transition-all">
                     Remove
                  </button>
               </div>
            ))}
         </div>
      </div>
   );
};

const ToggleField = ({ label, field, value, update }) => (
   <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      <button
         type="button"
         onClick={() => update(field, !value)}
         className={`w-full py-3 rounded-lg text-sm font-semibold border transition-all ${value ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-slate-600 border-slate-300 hover:border-brand-blue/50'}`}
      >
         {value ? 'Yes' : 'No'}
      </button>
   </div>
);

const CrewMembersListField = ({ values = [], onChange }) => {
   const list = Array.isArray(values) ? values : [];
   const [newCrew, setNewCrew] = useState({
      paramedicsId: '',
      name: '',
      role: 'Lead Paramedic',
      certificationLevel: 'ALS',
      certificationNumber: '',
      certificationExpiryDate: '',
      primaryClinician: false
   });

   const addCrew = () => {
      if (!newCrew.name) return;
      onChange([...list, { ...newCrew, paramedicsId: newCrew.paramedicsId || `paramedic-${Date.now()}` }]);
      setNewCrew({
         paramedicsId: '',
         name: '',
         role: 'Lead Paramedic',
         certificationLevel: 'ALS',
         certificationNumber: '',
         certificationExpiryDate: '',
         primaryClinician: false
      });
   };

   const removeCrew = (index) => {
      onChange(list.filter((_, i) => i !== index));
   };

   return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-6">
         <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h4 className="text-sm font-bold text-slate-800">Crew Members</h4>
            <span className="text-xs bg-brand-blue/10 text-brand-blue font-bold px-2.5 py-1 rounded-full">{list.length} Members</span>
         </div>
         {list.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {list.map((c, index) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 relative shadow-sm hover:shadow transition-all">
                     <button type="button" onClick={() => removeCrew(index)} className="absolute top-3 right-3 text-slate-400 hover:text-brand-red text-xs font-bold transition-colors">
                        Remove
                     </button>
                     <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                     <p className="text-xs font-semibold text-brand-blue mt-1 uppercase tracking-wider">{c.role} | {c.certificationLevel}</p>
                     <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 font-medium">
                        <div>Cert #: {c.certificationNumber || 'N/A'}</div>
                        <div>Expires: {c.certificationExpiryDate || 'N/A'}</div>
                     </div>
                     {c.primaryClinician && (
                        <span className="mt-2.5 inline-block text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded uppercase tracking-wider">Primary Clinician</span>
                     )}
                  </div>
               ))}
            </div>
         )}

         {/* Sub-form to add a new member */}
         <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-inner">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Add Crew Member</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Full Name</label>
                  <input type="text" value={newCrew.name} onChange={e => setNewCrew(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="Alex Carter" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Paramedic ID</label>
                  <input type="text" value={newCrew.paramedicsId} onChange={e => setNewCrew(prev => ({ ...prev, paramedicsId: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="ALS-1001" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Role</label>
                  <select value={newCrew.role} onChange={e => setNewCrew(prev => ({ ...prev, role: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none">
                     <option value="Lead Paramedic">Lead Paramedic</option>
                     <option value="Second Paramedic">Second Paramedic</option>
                     <option value="Driver">Driver</option>
                     <option value="Observer">Observer</option>
                     <option value="Attending Paramedic">Attending Paramedic</option>
                  </select>
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Cert Level</label>
                  <select value={newCrew.certificationLevel} onChange={e => setNewCrew(prev => ({ ...prev, certificationLevel: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none">
                     <option value="ALS">ALS (Advanced Life Support)</option>
                     <option value="BLS">BLS (Basic Life Support)</option>
                     <option value="CCT">Critical Care Transport</option>
                     <option value="EMT">EMT</option>
                     <option value="Paramedic">Paramedic</option>
                  </select>
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Cert #</label>
                  <input type="text" value={newCrew.certificationNumber} onChange={e => setNewCrew(prev => ({ ...prev, certificationNumber: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="ALS-1001" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Expiry Date</label>
                  <input type="date" value={newCrew.certificationExpiryDate} onChange={e => setNewCrew(prev => ({ ...prev, certificationExpiryDate: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" />
               </div>
            </div>
            <div className="flex justify-between items-center pt-2">
               <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={newCrew.primaryClinician} onChange={e => setNewCrew(prev => ({ ...prev, primaryClinician: e.target.checked }))} className="rounded text-brand-blue border-slate-300 focus:ring-brand-blue" />
                  Primary Clinician
               </label>
               <button type="button" onClick={addCrew} disabled={!newCrew.name} className="bg-brand-blue text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50">
                  + Add Member
               </button>
            </div>
         </div>
      </div>
   );
};

const StructuredComplaintsListField = ({ values = [], onChange }) => {
   const list = Array.isArray(values) ? values : [];
   const [newComp, setNewComp] = useState({
      complaint: '',
      onset: 'Sudden',
      onsetTime: '',
      provocation: '',
      quality: '',
      radiation: '',
      severity: 5,
      timing: 'Constant',
      associatedSymptoms: '',
      traumaRelated: false
   });

   const addComp = () => {
      if (!newComp.complaint) return;
      onChange([...list, { ...newComp, severity: Number(newComp.severity) }]);
      setNewComp({
         complaint: '',
         onset: 'Sudden',
         onsetTime: '',
         provocation: '',
         quality: '',
         radiation: '',
         severity: 5,
         timing: 'Constant',
         associatedSymptoms: '',
         traumaRelated: false
      });
   };

   const removeComp = (index) => {
      onChange(list.filter((_, i) => i !== index));
   };

   return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-6">
         <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h4 className="text-sm font-bold text-slate-800">Structured Complaints</h4>
            <span className="text-xs bg-brand-blue/10 text-brand-blue font-bold px-2.5 py-1 rounded-full">{list.length} Complaints</span>
         </div>
         {list.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
               {list.map((c, index) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 relative shadow-sm hover:shadow transition-all">
                     <button type="button" onClick={() => removeComp(index)} className="absolute top-3 right-3 text-slate-400 hover:text-brand-red text-xs font-bold transition-colors">
                        Remove
                     </button>
                     <p className="font-bold text-slate-800 text-sm">{c.complaint} {c.traumaRelated && <span className="text-[9px] bg-brand-red/10 text-brand-red font-black px-1.5 py-0.5 rounded ml-1 uppercase">TRAUMA</span>}</p>
                     <p className="text-xs font-medium text-slate-500 mt-1">Onset: {c.onset} | Severity: <span className="font-bold text-brand-blue">{c.severity}/10</span></p>
                     <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-500 font-medium">
                        {c.provocation && <div>Provoked by: {c.provocation}</div>}
                        {c.quality && <div>Quality: {c.quality}</div>}
                        {c.radiation && <div>Radiation: {c.radiation}</div>}
                        {c.timing && <div>Timing: {c.timing}</div>}
                        {c.associatedSymptoms && <div className="col-span-2">Symptoms: {c.associatedSymptoms}</div>}
                        {c.onsetTime && <div className="col-span-2">Onset Time: {c.onsetTime.replace('T', ' ')}</div>}
                     </div>
                  </div>
               ))}
            </div>
         )}

         {/* Sub-form to add a new complaint */}
         <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-inner">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Add Structured Complaint</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Complaint</label>
                  <input type="text" value={newComp.complaint} onChange={e => setNewComp(prev => ({ ...prev, complaint: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="e.g. Chest pain" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Onset</label>
                  <select value={newComp.onset} onChange={e => setNewComp(prev => ({ ...prev, onset: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none">
                     <option value="Sudden">Sudden</option>
                     <option value="Gradual">Gradual</option>
                     <option value="N/A">N/A</option>
                  </select>
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Onset Timestamp</label>
                  <input type="datetime-local" value={newComp.onsetTime} onChange={e => setNewComp(prev => ({ ...prev, onsetTime: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Provocation</label>
                  <input type="text" value={newComp.provocation} onChange={e => setNewComp(prev => ({ ...prev, provocation: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="e.g. Exertion" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Quality</label>
                  <input type="text" value={newComp.quality} onChange={e => setNewComp(prev => ({ ...prev, quality: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="e.g. Sharp / Pressure" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Radiation</label>
                  <input type="text" value={newComp.radiation} onChange={e => setNewComp(prev => ({ ...prev, radiation: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="e.g. Left arm / Jaw" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Severity (0-10): <span className="font-extrabold text-brand-blue">{newComp.severity}</span></label>
                  <input type="range" min="0" max="10" value={newComp.severity} onChange={e => setNewComp(prev => ({ ...prev, severity: e.target.value }))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue focus:outline-none" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Timing</label>
                  <input type="text" value={newComp.timing} onChange={e => setNewComp(prev => ({ ...prev, timing: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="e.g. Constant / Intermittent" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Associated Symptoms</label>
                  <input type="text" value={newComp.associatedSymptoms} onChange={e => setNewComp(prev => ({ ...prev, associatedSymptoms: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="e.g. Sweating, nausea" />
               </div>
            </div>
            <div className="flex justify-between items-center pt-2">
               <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={newComp.traumaRelated} onChange={e => setNewComp(prev => ({ ...prev, traumaRelated: e.target.checked }))} className="rounded text-brand-blue border-slate-300 focus:ring-brand-blue" />
                  Trauma Related
               </label>
               <button type="button" onClick={addComp} disabled={!newComp.complaint} className="bg-brand-blue text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50">
                  + Add Complaint
               </button>
            </div>
         </div>
      </div>
   );
};

const StructuredVitalsListField = ({ values = [], onChange }) => {
   const list = Array.isArray(values) ? values : [];
   const [newV, setNewV] = useState({
      recordedAt: '',
      heartRate: '',
      systolicBP: '',
      diastolicBP: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      oxygenDeliveryMethod: '',
      temperature: '',
      temperatureRoute: 'ORAL',
      glasgowComaScale: '',
      gcEye: '',
      gcVerbal: '',
      gcMotor: '',
      avpu: 'A',
      painScore: '',
      painLocation: '',
      bloodGlucose: '',
      skinColor: '',
      skinCondition: '',
      skinTemperature: '',
      pupilLeft: '',
      pupilRight: '',
      pupilsEqual: true,
      pupilsReactive: true
   });

   const addV = () => {
      const gcsVal = (Number(newV.gcEye) || 0) + (Number(newV.gcVerbal) || 0) + (Number(newV.gcMotor) || 0);
      onChange([...list, {
         ...newV,
         recordedAt: newV.recordedAt || new Date().toISOString().substring(0, 16),
         heartRate: newV.heartRate ? Number(newV.heartRate) : null,
         systolicBP: newV.systolicBP ? Number(newV.systolicBP) : null,
         diastolicBP: newV.diastolicBP ? Number(newV.diastolicBP) : null,
         respiratoryRate: newV.respiratoryRate ? Number(newV.respiratoryRate) : null,
         oxygenSaturation: newV.oxygenSaturation ? Number(newV.oxygenSaturation) : null,
         temperature: newV.temperature ? Number(newV.temperature) : null,
         glasgowComaScale: gcsVal || (newV.glasgowComaScale ? Number(newV.glasgowComaScale) : null),
         gcEye: newV.gcEye ? Number(newV.gcEye) : null,
         gcVerbal: newV.gcVerbal ? Number(newV.gcVerbal) : null,
         gcMotor: newV.gcMotor ? Number(newV.gcMotor) : null,
         painScore: newV.painScore ? Number(newV.painScore) : null,
         bloodGlucose: newV.bloodGlucose ? Number(newV.bloodGlucose) : null
      }]);
      setNewV({
         recordedAt: '',
         heartRate: '',
         systolicBP: '',
         diastolicBP: '',
         respiratoryRate: '',
         oxygenSaturation: '',
         oxygenDeliveryMethod: '',
         temperature: '',
         temperatureRoute: 'ORAL',
         glasgowComaScale: '',
         gcEye: '',
         gcVerbal: '',
         gcMotor: '',
         avpu: 'A',
         painScore: '',
         painLocation: '',
         bloodGlucose: '',
         skinColor: '',
         skinCondition: '',
         skinTemperature: '',
         pupilLeft: '',
         pupilRight: '',
         pupilsEqual: true,
         pupilsReactive: true
      });
   };

   const removeV = (index) => {
      onChange(list.filter((_, i) => i !== index));
   };

   return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-6">
         <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h4 className="text-sm font-bold text-slate-800">Structured Vitals Logs</h4>
            <span className="text-xs bg-brand-blue/10 text-brand-blue font-bold px-2.5 py-1 rounded-full">{list.length} Logs</span>
         </div>
         {list.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
               {list.map((c, index) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 relative shadow-sm hover:shadow transition-all">
                     <button type="button" onClick={() => removeV(index)} className="absolute top-3 right-3 text-slate-400 hover:text-brand-red text-xs font-bold transition-colors">
                        Remove
                     </button>
                     <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider text-slate-400">Log #{index+1} | {c.recordedAt.replace('T', ' ')}</p>
                     <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs font-semibold text-slate-800">
                        {c.systolicBP && c.diastolicBP && <div>BP: <span className="text-brand-blue">{c.systolicBP}/{c.diastolicBP}</span></div>}
                        {c.heartRate && <div>HR: <span className="text-brand-blue">{c.heartRate} bpm</span></div>}
                        {c.respiratoryRate && <div>RR: <span className="text-brand-blue">{c.respiratoryRate}/min</span></div>}
                        {c.oxygenSaturation && <div>SpO2: <span className="text-emerald-600">{c.oxygenSaturation}%</span></div>}
                        {c.temperature && <div>Temp: <span className="text-brand-blue">{c.temperature}°C ({c.temperatureRoute})</span></div>}
                        {c.bloodGlucose && <div>Glucose: <span className="text-brand-blue">{c.bloodGlucose} mg/dL</span></div>}
                     </div>
                     <div className="mt-3.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-medium">
                        {c.glasgowComaScale && <div>GCS: <span className="font-bold text-brand-blue">{c.glasgowComaScale}</span> (E{c.gcEye} V{c.gcVerbal} M{c.gcMotor})</div>}
                        {c.avpu && <div>AVPU: <span className="font-bold">{c.avpu}</span></div>}
                        {c.painScore !== null && c.painScore !== undefined && <div>Pain: <span className="font-bold text-brand-red">{c.painScore}/10</span> {c.painLocation ? `(${c.painLocation})` : ''}</div>}
                        {c.skinColor && <div>Skin: {c.skinColor}, {c.skinCondition}, {c.skinTemperature}</div>}
                        {(c.pupilLeft || c.pupilRight) && <div>Pupils: L{c.pupilLeft} R{c.pupilRight} {c.pupilsEqual ? '(Equal' : '(Unequal'} {c.pupilsReactive ? 'Reactive)' : 'Nonreactive)'}</div>}
                     </div>
                  </div>
               ))}
            </div>
         )}

         {/* Sub-form to add a new vital */}
         <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-inner">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Add Vitals Log</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Recorded At</label>
                  <input type="datetime-local" value={newV.recordedAt} onChange={e => setNewV(prev => ({ ...prev, recordedAt: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Heart Rate (BPM)</label>
                  <input type="number" value={newV.heartRate} onChange={e => setNewV(prev => ({ ...prev, heartRate: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="88" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">BP Systolic</label>
                  <input type="number" value={newV.systolicBP} onChange={e => setNewV(prev => ({ ...prev, systolicBP: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="120" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">BP Diastolic</label>
                  <input type="number" value={newV.diastolicBP} onChange={e => setNewV(prev => ({ ...prev, diastolicBP: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="80" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Resp Rate (RR)</label>
                  <input type="number" value={newV.respiratoryRate} onChange={e => setNewV(prev => ({ ...prev, respiratoryRate: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="18" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">SpO2 (%)</label>
                  <input type="number" value={newV.oxygenSaturation} onChange={e => setNewV(prev => ({ ...prev, oxygenSaturation: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="96" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">O2 Delivery Method</label>
                  <input type="text" value={newV.oxygenDeliveryMethod} onChange={e => setNewV(prev => ({ ...prev, oxygenDeliveryMethod: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="Nasal cannula" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Temp (°C)</label>
                  <input type="number" step="0.1" value={newV.temperature} onChange={e => setNewV(prev => ({ ...prev, temperature: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="37.1" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Temp Route</label>
                  <select value={newV.temperatureRoute} onChange={e => setNewV(prev => ({ ...prev, temperatureRoute: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none">
                     <option value="ORAL">Oral</option>
                     <option value="TYMPANIC">Tympanic</option>
                     <option value="RECTAL">Rectal</option>
                     <option value="AXILLARY">Axillary</option>
                     <option value="TEMPORAL">Temporal</option>
                  </select>
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Blood Glucose</label>
                  <input type="number" value={newV.bloodGlucose} onChange={e => setNewV(prev => ({ ...prev, bloodGlucose: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="108" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">AVPU</label>
                  <select value={newV.avpu} onChange={e => setNewV(prev => ({ ...prev, avpu: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none">
                     <option value="A">Alert</option>
                     <option value="V">Verbal</option>
                     <option value="P">Pain</option>
                     <option value="U">Unresponsive</option>
                  </select>
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Pain Score (0-10)</label>
                  <input type="number" min="0" max="10" value={newV.painScore} onChange={e => setNewV(prev => ({ ...prev, painScore: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="7" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Pain Location</label>
                  <input type="text" value={newV.painLocation} onChange={e => setNewV(prev => ({ ...prev, painLocation: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="Chest" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">GCS Eye (1-4)</label>
                  <input type="number" min="1" max="4" value={newV.gcEye} onChange={e => setNewV(prev => ({ ...prev, gcEye: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="4" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">GCS Verbal (1-5)</label>
                  <input type="number" min="1" max="5" value={newV.gcVerbal} onChange={e => setNewV(prev => ({ ...prev, gcVerbal: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="5" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">GCS Motor (1-6)</label>
                  <input type="number" min="1" max="6" value={newV.gcMotor} onChange={e => setNewV(prev => ({ ...prev, gcMotor: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="6" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Skin Color</label>
                  <input type="text" value={newV.skinColor} onChange={e => setNewV(prev => ({ ...prev, skinColor: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="Normal" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Skin Condition</label>
                  <input type="text" value={newV.skinCondition} onChange={e => setNewV(prev => ({ ...prev, skinCondition: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="Dry" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Skin Temp</label>
                  <input type="text" value={newV.skinTemperature} onChange={e => setNewV(prev => ({ ...prev, skinTemperature: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="Warm" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Pupil Left</label>
                  <input type="text" value={newV.pupilLeft} onChange={e => setNewV(prev => ({ ...prev, pupilLeft: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="3mm" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Pupil Right</label>
                  <input type="text" value={newV.pupilRight} onChange={e => setNewV(prev => ({ ...prev, pupilRight: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-brand-blue outline-none" placeholder="3mm" />
               </div>
            </div>
            <div className="flex flex-wrap gap-6 pt-2">
               <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={newV.pupilsEqual} onChange={e => setNewV(prev => ({ ...prev, pupilsEqual: e.target.checked }))} className="rounded text-brand-blue border-slate-300 focus:ring-brand-blue" />
                  Pupils Equal
               </label>
               <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={newV.pupilsReactive} onChange={e => setNewV(prev => ({ ...prev, pupilsReactive: e.target.checked }))} className="rounded text-brand-blue border-slate-300 focus:ring-brand-blue" />
                  Pupils Reactive
               </label>
               <div className="flex-1 flex justify-end">
                  <button type="button" onClick={addV} className="bg-brand-blue text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all">
                     + Add Vitals Log
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
};

const StructuredMedicationsListField = ({ values = [], onChange }) => {
   const list = Array.isArray(values) ? values : [];
   const [newM, setNewM] = useState({
      medicationName: '',
      brandName: '',
      dosage: '',
      unit: 'mg',
      route: 'IV',
      administeredAt: '',
      administeredBy: '',
      administrationAttempts: 1,
      patientResponse: '',
      adverseReactionDetails: 'None',
      rxNormCode: '',
      indication: '',
      contraindications: 'None known',
      notes: ''
   });

   const addM = () => {
      if (!newM.medicationName) return;
      onChange([...list, {
         ...newM,
         dosage: newM.dosage ? Number(newM.dosage) : null,
         administrationAttempts: Number(newM.administrationAttempts) || 1,
         administeredAt: newM.administeredAt || new Date().toISOString().substring(0, 16)
      }]);
      setNewM({
         medicationName: '',
         brandName: '',
         dosage: '',
         unit: 'mg',
         route: 'IV',
         administeredAt: '',
         administeredBy: '',
         administrationAttempts: 1,
         patientResponse: '',
         adverseReactionDetails: 'None',
         rxNormCode: '',
         indication: '',
         contraindications: 'None known',
         notes: ''
      });
   };

   const removeM = (index) => {
      onChange(list.filter((_, i) => i !== index));
   };

   return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-6">
         <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h4 className="text-sm font-bold text-slate-800">Structured Medications Administered</h4>
            <span className="text-xs bg-brand-blue/10 text-brand-blue font-bold px-2.5 py-1 rounded-full">{list.length} Medications</span>
         </div>
         {list.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
               {list.map((c, index) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 relative shadow-sm hover:shadow transition-all">
                     <button type="button" onClick={() => removeM(index)} className="absolute top-3 right-3 text-slate-400 hover:text-brand-red text-xs font-bold transition-colors">
                        Remove
                     </button>
                     <p className="font-bold text-slate-800 text-sm">{c.medicationName} {c.brandName ? `(${c.brandName})` : ''}</p>
                     <p className="text-xs font-semibold text-brand-blue mt-1 uppercase tracking-wider">{c.dosage} {c.unit} via {c.route}</p>
                     <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-500 font-medium">
                        {c.administeredAt && <div>Time: {c.administeredAt.replace('T', ' ')}</div>}
                        {c.administeredBy && <div>By: {c.administeredBy}</div>}
                        <div>Attempts: {c.administrationAttempts}</div>
                        {c.patientResponse && <div>Response: {c.patientResponse}</div>}
                        {c.indication && <div className="col-span-2">Indication: {c.indication}</div>}
                        {c.adverseReactionDetails && <div className="col-span-2">Adverse Reaction: {c.adverseReactionDetails}</div>}
                        {c.notes && <div className="col-span-2 text-slate-400 italic">Notes: {c.notes}</div>}
                     </div>
                  </div>
               ))}
            </div>
         )}

         {/* Sub-form to add a new medication */}
         <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-inner">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Add Medication</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Medication Name</label>
                  <input type="text" value={newM.medicationName} onChange={e => setNewM(prev => ({ ...prev, medicationName: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="e.g. Midazolam" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Brand Name</label>
                  <input type="text" value={newM.brandName} onChange={e => setNewM(prev => ({ ...prev, brandName: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="e.g. Versed" />
               </div>
               <div className="flex gap-2">
                  <div className="flex-1">
                     <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Dosage</label>
                     <input type="number" step="0.01" value={newM.dosage} onChange={e => setNewM(prev => ({ ...prev, dosage: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="2.0" />
                  </div>
                  <div>
                     <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Unit</label>
                     <input type="text" value={newM.unit} onChange={e => setNewM(prev => ({ ...prev, unit: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="mg" />
                  </div>
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Route</label>
                  <select value={newM.route} onChange={e => setNewM(prev => ({ ...prev, route: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none">
                     <option value="IV">IV</option>
                     <option value="IM">IM</option>
                     <option value="IN">IN</option>
                     <option value="PO">PO</option>
                     <option value="PR">PR</option>
                     <option value="SubQ">SubQ</option>
                     <option value="IO">IO</option>
                  </select>
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Administered At</label>
                  <input type="datetime-local" value={newM.administeredAt} onChange={e => setNewM(prev => ({ ...prev, administeredAt: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Administered By</label>
                  <input type="text" value={newM.administeredBy} onChange={e => setNewM(prev => ({ ...prev, administeredBy: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="Clinician Name" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Attempts</label>
                  <input type="number" value={newM.administrationAttempts} onChange={e => setNewM(prev => ({ ...prev, administrationAttempts: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Patient Response</label>
                  <input type="text" value={newM.patientResponse} onChange={e => setNewM(prev => ({ ...prev, patientResponse: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="e.g. Improved" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Indication</label>
                  <input type="text" value={newM.indication} onChange={e => setNewM(prev => ({ ...prev, indication: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="e.g. Anxiety" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">RxNorm Code</label>
                  <input type="text" value={newM.rxNormCode} onChange={e => setNewM(prev => ({ ...prev, rxNormCode: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="e.g. 6960" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Adverse Reaction Details</label>
                  <input type="text" value={newM.adverseReactionDetails} onChange={e => setNewM(prev => ({ ...prev, adverseReactionDetails: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Contraindications</label>
                  <input type="text" value={newM.contraindications} onChange={e => setNewM(prev => ({ ...prev, contraindications: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" />
               </div>
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Medication Notes</label>
               <textarea rows={2} value={newM.notes} onChange={e => setNewM(prev => ({ ...prev, notes: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none resize-none" placeholder="e.g. Monitor respiratory status" />
            </div>
            <div className="flex justify-end pt-2">
               <button type="button" onClick={addM} disabled={!newM.medicationName} className="bg-brand-blue text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50">
                  + Add Medication
               </button>
            </div>
         </div>
      </div>
   );
};

const StructuredProceduresListField = ({ values = [], onChange }) => {
   const list = Array.isArray(values) ? values : [];
   const [newP, setNewP] = useState({
      procedureName: '',
      performedAt: '',
      performedBy: '',
      successful: true,
      attempts: 1,
      bodysite: '',
      complications: 'None',
      patientResponse: 'Stable',
      snomedCode: '',
      notes: ''
   });

   const addP = () => {
      if (!newP.procedureName) return;
      onChange([...list, {
         ...newP,
         attempts: Number(newP.attempts) || 1,
         performedAt: newP.performedAt || new Date().toISOString().substring(0, 16)
      }]);
      setNewP({
         procedureName: '',
         performedAt: '',
         performedBy: '',
         successful: true,
         attempts: 1,
         bodysite: '',
         complications: 'None',
         patientResponse: 'Stable',
         snomedCode: '',
         notes: ''
      });
   };

   const removeP = (index) => {
      onChange(list.filter((_, i) => i !== index));
   };

   return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-6">
         <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h4 className="text-sm font-bold text-slate-800">Structured Procedures Performed</h4>
            <span className="text-xs bg-brand-blue/10 text-brand-blue font-bold px-2.5 py-1 rounded-full">{list.length} Procedures</span>
         </div>
         {list.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
               {list.map((c, index) => (
                  <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 relative shadow-sm hover:shadow transition-all">
                     <button type="button" onClick={() => removeP(index)} className="absolute top-3 right-3 text-slate-400 hover:text-brand-red text-xs font-bold transition-colors">
                        Remove
                     </button>
                     <p className="font-bold text-slate-800 text-sm">{c.procedureName} {c.successful ? <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded ml-1 uppercase">SUCCESSFUL</span> : <span className="text-[9px] bg-brand-red/10 text-brand-red font-black px-1.5 py-0.5 rounded ml-1 uppercase">FAILED</span>}</p>
                     <p className="text-xs font-semibold text-brand-blue mt-1 uppercase tracking-wider">{c.bodysite ? `Site: ${c.bodysite}` : 'Site: Unspecified'} | Attempts: {c.attempts}</p>
                     <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-500 font-medium">
                        {c.performedAt && <div>Time: {c.performedAt.replace('T', ' ')}</div>}
                        {c.performedBy && <div>By: {c.performedBy}</div>}
                        {c.patientResponse && <div>Response: {c.patientResponse}</div>}
                        {c.snomedCode && <div>SNOMED: {c.snomedCode}</div>}
                        {c.complications && <div className="col-span-2">Complications: {c.complications}</div>}
                        {c.notes && <div className="col-span-2 text-slate-400 italic">Notes: {c.notes}</div>}
                     </div>
                  </div>
               ))}
            </div>
         )}

         {/* Sub-form to add a new procedure */}
         <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-inner">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Add Procedure</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Procedure Name</label>
                  <input type="text" value={newP.procedureName} onChange={e => setNewP(prev => ({ ...prev, procedureName: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="e.g. Mechanical ventilation" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Performed At</label>
                  <input type="datetime-local" value={newP.performedAt} onChange={e => setNewP(prev => ({ ...prev, performedAt: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Performed By</label>
                  <input type="text" value={newP.performedBy} onChange={e => setNewP(prev => ({ ...prev, performedBy: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="Clinician Name" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Attempts</label>
                  <input type="number" value={newP.attempts} onChange={e => setNewP(prev => ({ ...prev, attempts: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Body Site</label>
                  <input type="text" value={newP.bodysite} onChange={e => setNewP(prev => ({ ...prev, bodysite: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="e.g. Airway" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">SNOMED Code</label>
                  <input type="text" value={newP.snomedCode} onChange={e => setNewP(prev => ({ ...prev, snomedCode: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="e.g. 40617009" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Complications</label>
                  <input type="text" value={newP.complications} onChange={e => setNewP(prev => ({ ...prev, complications: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Patient Response</label>
                  <input type="text" value={newP.patientResponse} onChange={e => setNewP(prev => ({ ...prev, patientResponse: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none" placeholder="e.g. Stable" />
               </div>
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Procedure Notes</label>
               <textarea rows={2} value={newP.notes} onChange={e => setNewP(prev => ({ ...prev, notes: e.target.value }))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-brand-blue outline-none resize-none" placeholder="e.g. No complications" />
            </div>
            <div className="flex justify-between items-center pt-2">
               <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={newP.successful} onChange={e => setNewP(prev => ({ ...prev, successful: e.target.checked }))} className="rounded text-brand-blue border-slate-300 focus:ring-brand-blue" />
                  Successful Procedure
               </label>
               <button type="button" onClick={addP} disabled={!newP.procedureName} className="bg-brand-blue text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all disabled:opacity-50">
                  + Add Procedure
               </button>
            </div>
         </div>
      </div>
   );
};

export default CreateRecord;
