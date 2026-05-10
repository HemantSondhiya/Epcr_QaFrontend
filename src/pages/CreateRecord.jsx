import { useState, useEffect } from 'react';
import {
   ArrowLeft, ArrowRight, Save, ChevronRight, User, Activity, FilePlus2,
   CheckCircle2, Layers, AlertTriangle, Pill, ClipboardList,
   FlaskConical, Clock, Shield, Zap, Heart, Thermometer,
   Stethoscope, Syringe, Building, ChevronLeft, Fingerprint, Lock,
   RefreshCw
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import { createRecord, updateRecord } from '../store/slices/epcrSlice';
import { fetchWorkflows, selectWorkflows } from '../store/slices/workflowSlice';
import DynamicFormRenderer from '../components/forms/DynamicFormRenderer';
import client from '../api/client';

const INCIDENT_TYPES = ['TRAUMA', 'CARDIAC', 'RESPIRATORY', 'NEUROLOGICAL', 'OBSTETRIC', 'PEDIATRIC', 'BEHAVIORAL', 'OTHER'];
const TRANSPORT_MODES = ['ALS', 'BLS', 'CRITICAL_CARE', 'AIR', 'WATER', 'WHEELCHAIR', 'WALK_IN'];
const CARE_LEVELS = ['ALS', 'BLS', 'CCT', 'SCT', 'MFR', 'EMT', 'PARAMEDIC'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const TRIAGE_TAGS = ['RED', 'YELLOW', 'GREEN', 'BLACK'];

const inputCls = 'w-full bg-slate-50 border-2 border-slate-200 px-5 py-4 text-sm text-brand-blue focus:border-brand-blue outline-none transition-all font-black uppercase';
const inputReqCls = 'w-full bg-white border-2 border-brand-blue/30 px-5 py-4 text-sm text-brand-blue focus:border-brand-blue outline-none transition-all font-black uppercase';
const labelCls = 'text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1';
const labelReqCls = 'text-[9px] font-black text-brand-blue uppercase tracking-widest mb-2 block ml-1 after:content-["*"] after:ml-1 after:text-brand-red';

const CreateRecord = () => {
   const navigate = useNavigate();
   const [searchParams] = useSearchParams();
   const recordId = searchParams.get('id');
   const dispatch = useDispatch();
   const user = useSelector(selectUser);
   const [currentStep, setCurrentStep] = useState(1);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [error, setError] = useState('');
   const [fieldErrors, setFieldErrors] = useState({});

   const workflows = useSelector(selectWorkflows);
   const [selectedWorkflow, setSelectedWorkflow] = useState(null);
   const [dynamicFormResponses, setDynamicFormResponses] = useState({});

   const [formData, setFormData] = useState({
      // Patient
      patientId: '',
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
      diagnosis: '',
      treatmentProvided: '',
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
         patientInformedOfRisks: true,
         patientHasDecisionCapacity: true,
         capacityAssessmentNotes: '',
         guardianConsentObtained: false,
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
         if (!formData.patientName) errors.patientName = 'Name Required';
         if (!formData.patientDateOfBirth) errors.patientDateOfBirth = 'DOB Required';
         if (!formData.patientGender) errors.patientGender = 'Gender Required';
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

      return {
         patientName: cv(data.patientName) || '',
         patientDateOfBirth: data.patientDateOfBirth || null,
         patientGender: cv(data.patientGender) || '',
         patientPhone: data.patientPhone || '',
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
         // Clinical
         diagnosis: cv(data.diagnosis) || '',
         treatmentProvided: cv(data.treatmentProvided) || '',
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
         structuredComplaints: data.structuredComplaints || [],
         structuredVitals: data.structuredVitals || [],
         structuredMedications: data.structuredMedications || [],
         structuredProcedures: data.structuredProcedures || [],
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
            geoLocation: (sa.geoLocation?.latitude && sa.geoLocation?.longitude) ? sa.geoLocation : null,
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
            patientInformedOfRisks: cn.patientInformedOfRisks ?? true,
            patientHasDecisionCapacity: cn.patientHasDecisionCapacity ?? true,
            capacityAssessmentNotes: cv(cn.capacityAssessmentNotes) || '',
            guardianConsentObtained: cn.guardianConsentObtained ?? false,
         },
         // Meta
         paramedicsId: data.paramedicsId || '',
         organizationId: data.organizationId || '',
         status: data.status || 'PENDING',
         clinicalData: {},
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
            created = await dispatch(createRecord(payload)).unwrap();
         }
         
         const generatedId = created?.incidentNumber || created?.patientId || created?.id;
         dispatch(addToast({ type: 'success', message: generatedId ? `Manifest ${recordId ? 'Updated' : 'Committed'}: ${generatedId}` : `Manifest ${recordId ? 'Updated' : 'Committed'}` }));
         navigate('/epcr');
      } catch (err) {
         const msg = typeof err === 'string' ? err : (err?.message || 'Transmission Interrupted');
         setError(msg);
         dispatch(addToast({ type: 'error', message: msg || 'Protocol transmission failed.' }));
      } finally {
         setIsSubmitting(false);
      }
   };

   const StepIndicator = ({ step, label, icon }) => (
      <div className={`flex flex-col items-center gap-4 transition-all duration-500 relative group ${currentStep === step ? 'scale-110' : 'opacity-30'}`}>
         <div className={`w-14 h-14 flex items-center justify-center border-2 transition-all ${currentStep === step ? 'bg-brand-blue border-brand-blue text-white shadow-xl' : 'bg-white border-slate-200 text-slate-400'}`}>
            {icon}
            {currentStep > step && <div className="absolute -top-1 -right-1 bg-brand-red text-white p-1"><CheckCircle2 size={14} /></div>}
         </div>
         <span className={`text-[9px] font-black uppercase tracking-widest text-center ${currentStep === step ? 'text-brand-blue' : 'text-slate-400'}`}>{label}</span>
      </div>
   );

   return (
      <div className="max-w-7xl mx-auto pb-24 space-y-12">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
               <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-brand-red mb-6 transition-colors">
                  <ArrowLeft size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Abort Synthesis</span>
               </button>
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-brand-blue flex items-center justify-center text-white">
                     <FilePlus2 size={32} />
                  </div>
                  <div>
                     <h1 className="text-4xl font-black text-brand-blue tracking-tighter uppercase leading-none">
                        {recordId ? 'UPDATE' : 'INITIALIZE'} <span className="text-brand-red">MANIFEST</span>
                     </h1>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Clinical Neural Link Engine</p>
                  </div>
               </div>
            </div>
            <button onClick={handleSubmit} disabled={isSubmitting} className="bg-brand-red text-white px-10 py-5 font-black text-[12px] uppercase tracking-widest flex items-center gap-3 hover:bg-brand-blue transition-all disabled:opacity-50 shadow-2xl">
               {isSubmitting ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
               <span>{isSubmitting ? 'Transmitting...' : (recordId ? 'Update Manifest' : 'Commit Manifest')}</span>
            </button>
         </div>

         {/* Workflow Selector */}
         <div className="brochure-card p-8 flex flex-col md:flex-row items-center gap-8">
            <div className="px-4 py-2 bg-brand-blue text-white text-[9px] font-black uppercase tracking-widest shrink-0">PROTOCOL MATRIX</div>
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

                     {/* Basic Info */}
                     <SectionTitle title="Subject Specification" />
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        <Field label="Subject Name" field="patientName" value={formData.patientName} update={updateField} error={fieldErrors.patientName} required />
                        <Field label="Patient ID" field="patientId" value={formData.patientId} update={updateField} disabled placeholder="Auto-generated on save" />
                        <Field label="Activation Date (DOB)" field="patientDateOfBirth" value={formData.patientDateOfBirth} update={updateField} type="date" error={fieldErrors.patientDateOfBirth} required />
                        <div className="space-y-2">
                           <label className={fieldErrors.patientGender ? 'text-[9px] font-black text-brand-red uppercase tracking-widest mb-2 block ml-1' : labelReqCls}>Gender</label>
                           <select value={formData.patientGender} onChange={e => updateField('patientGender', e.target.value)} className={fieldErrors.patientGender ? 'w-full bg-white border-2 border-brand-red px-5 py-4 text-sm text-brand-red focus:border-brand-red outline-none transition-all font-black uppercase' : inputReqCls}>
                              <option value="">SELECT</option>
                              <option value="MALE">MALE</option>
                              <option value="FEMALE">FEMALE</option>
                              <option value="OTHER">OTHER</option>
                           </select>
                           {fieldErrors.patientGender && <p className="text-[8px] font-black text-brand-red uppercase tracking-tighter ml-1">{fieldErrors.patientGender}</p>}
                        </div>
                        <Field label="Age" field="age" value={formData.age} update={updateField} type="number" />
                        <Field label="Vector (Email)" field="email" value={formData.email} update={updateField} type="email" />
                        <Field label="Contact (Phone)" field="patientPhone" value={formData.patientPhone} update={updateField} />
                        <Field label="SSN Last 4" field="patientSSNLast4" value={formData.patientSSNLast4} update={updateField} maxLength={4} />
                        <div className="space-y-2">
                           <label className={labelCls}>Blood Group</label>
                           <select value={formData.bloodGroup} onChange={e => updateField('bloodGroup', e.target.value)} className={inputCls}>
                              <option value="">SELECT</option>
                              {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                           </select>
                        </div>
                        <Field label="Height (cm)" field="height" value={formData.height} update={updateField} type="number" />
                        <Field label="Weight (kg)" field="weight" value={formData.weight} update={updateField} type="number" />
                     </div>
                     <div className="space-y-2">
                        <label className={labelCls}>Physical Sector (Address)</label>
                        <textarea rows={2} value={formData.patientAddress} onChange={e => updateField('patientAddress', e.target.value)} className={inputCls + ' resize-none'} />
                     </div>

                     {/* Medical History */}
                     <SectionTitle title="Medical History" />
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
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
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <Field label="Last Known Well" field="medicalHistory.lastKnownWellDateTime" value={formData.medicalHistory.lastKnownWellDateTime} update={updateField} type="datetime-local" />
                        <Field label="Last Oral Intake" field="medicalHistory.lastOralIntake" value={formData.medicalHistory.lastOralIntake} update={updateField} type="datetime-local" />
                     </div>
                  </div>
               )}

               {/* ── STEP 2: INCIDENT ── */}
               {currentStep === 2 && (
                  <div className="space-y-12">

                     <SectionTitle title="Incident Vector" />
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        <Field label="Timestamp" field="incidentDateTime" value={formData.incidentDateTime} update={updateField} type="datetime-local" error={fieldErrors.incidentDateTime} required />
                        <Field label="Coordinates (Location)" field="incidentLocation" value={formData.incidentLocation} update={updateField} error={fieldErrors.incidentLocation} required />
                        <div className="space-y-2">
                           <label className={fieldErrors.incidentType ? 'text-[9px] font-black text-brand-red uppercase tracking-widest mb-2 block ml-1' : labelReqCls}>Classification</label>
                           <select value={formData.incidentType} onChange={e => updateField('incidentType', e.target.value)} className={fieldErrors.incidentType ? 'w-full bg-white border-2 border-brand-red px-5 py-4 text-sm text-brand-red focus:border-brand-red outline-none transition-all font-black uppercase' : inputReqCls}>
                              <option value="">SELECT</option>
                              {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                           </select>
                           {fieldErrors.incidentType && <p className="text-[8px] font-black text-brand-red uppercase tracking-tighter ml-1">{fieldErrors.incidentType}</p>}
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
                        <div className="space-y-2">
                           <label className={labelCls}>Triage Tag</label>
                           <select value={formData.sceneAssessment.triageTag} onChange={e => updateField('sceneAssessment.triageTag', e.target.value)} className={inputCls}>
                              <option value="">SELECT</option>
                              {TRIAGE_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                           </select>
                        </div>
                     </div>

                     {/* Scene Toggles */}
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <ToggleField label="Scene Safe" field="sceneAssessment.sceneSafe" value={formData.sceneAssessment.sceneSafe} update={updateField} />
                        <ToggleField label="Trauma Call" field="sceneAssessment.traumaCall" value={formData.sceneAssessment.traumaCall} update={updateField} />
                        <ToggleField label="Mass Casualty" field="sceneAssessment.massCasualtyIncident" value={formData.sceneAssessment.massCasualtyIncident} update={updateField} />
                        <ToggleField label="Witness Present" field="sceneAssessment.witnessPresent" value={formData.sceneAssessment.witnessPresent} update={updateField} />
                        <ToggleField label="Bystander CPR" field="sceneAssessment.bystanderCPRPerformed" value={formData.sceneAssessment.bystanderCPRPerformed} update={updateField} />
                        <ToggleField label="AED By Bystander" field="sceneAssessment.aedUsedByBystander" value={formData.sceneAssessment.aedUsedByBystander} update={updateField} />
                     </div>

                     {/* Witness Info */}
                     {formData.sceneAssessment.witnessPresent && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           <Field label="Witness Name" field="sceneAssessment.witnessName" value={formData.sceneAssessment.witnessName} update={updateField} />
                           <Field label="Witness Contact" field="sceneAssessment.witnessContact" value={formData.sceneAssessment.witnessContact} update={updateField} />
                        </div>
                     )}

                     {/* Narrative */}
                     <div className="space-y-2">
                        <label className={labelCls}>Narrative Abstract</label>
                        <textarea rows={4} value={formData.incidentDescription} onChange={e => updateField('incidentDescription', e.target.value)} className={inputCls + ' resize-none'} />
                     </div>

                     {/* Timeline */}
                     <SectionTitle title="Response Timeline" />
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        <Field label="Call Received At" field="timeline.callReceivedAt" value={formData.timeline.callReceivedAt} update={updateField} type="datetime-local" />
                        <Field label="Arrived Scene At" field="timeline.arrivedSceneAt" value={formData.timeline.arrivedSceneAt} update={updateField} type="datetime-local" />
                        <Field label="Departed Scene At" field="timeline.departedSceneAt" value={formData.timeline.departedSceneAt} update={updateField} type="datetime-local" />
                        <Field label="Arrived Destination At" field="timeline.arrivedDestinationAt" value={formData.timeline.arrivedDestinationAt} update={updateField} type="datetime-local" />
                        <Field label="Transfer of Care At" field="timeline.transferOfCareAt" value={formData.timeline.transferOfCareAt} update={updateField} type="datetime-local" />
                     </div>

                     {/* Complaints */}
                     <SectionTitle title="Chief Complaints" />
                     <div className="space-y-2">
                        <label className={labelCls}>Complaints</label>
                        <textarea rows={3} value={formData.complaints} onChange={e => updateField('complaints', e.target.value)} className={inputCls + ' resize-none'} />
                     </div>
                  </div>
               )}

               {/* ── STEP 3: CLINICAL ── */}
               {currentStep === 3 && (
                  <div className="space-y-12">

                     <SectionTitle title="Clinical Vitals" />
                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        <Field label="BP Systolic" field="systolicBp" value={formData.systolicBp} update={updateField} type="number" />
                        <Field label="BP Diastolic" field="diastolicBp" value={formData.diastolicBp} update={updateField} type="number" />
                        <Field label="Pulse (BPM)" field="pulseRate" value={formData.pulseRate} update={updateField} type="number" />
                        <Field label="Resp (RR)" field="respirationRate" value={formData.respirationRate} update={updateField} type="number" />
                        <Field label="SpO2 (%)" field="spo2" value={formData.spo2} update={updateField} type="number" />
                        <Field label="Temp (°C)" field="temperature" value={formData.temperature} update={updateField} type="number" />
                        <Field label="Blood Sugar" field="bloodSugar" value={formData.bloodSugar} update={updateField} type="number" />
                        <Field label="GCS" field="glasgowComaScale" value={formData.glasgowComaScale} update={updateField} type="number" />
                     </div>

                     {/* Clinical Assessment */}
                     <SectionTitle title="Clinical Assessment" />
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        <Field label="Mental Status" field="mentalStatus" value={formData.mentalStatus} update={updateField} />
                        <Field label="ECG Rhythm" field="ecgRhythm" value={formData.ecgRhythm} update={updateField} />
                        <Field label="Pupils Response" field="pupilsResponse" value={formData.pupilsResponse} update={updateField} />
                        <Field label="Skin Condition" field="skinCondition" value={formData.skinCondition} update={updateField} />
                        <Field label="Diagnosis" field="diagnosis" value={formData.diagnosis} update={updateField} />
                        <Field label="Treatment Provided" field="treatmentProvided" value={formData.treatmentProvided} update={updateField} />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ToggleField label="Airway Managed" field="airwayManaged" value={formData.airwayManaged} update={updateField} />
                     </div>

                     <div className="space-y-2">
                        <label className={labelCls}>Diagnostic Findings</label>
                        <textarea rows={3} value={formData.diagnosticFindings} onChange={e => updateField('diagnosticFindings', e.target.value)} className={inputCls + ' resize-none'} />
                     </div>
                     <div className="space-y-2">
                        <label className={labelCls}>Procedures Performed</label>
                        <textarea rows={3} value={formData.proceduresPerformed} onChange={e => updateField('proceduresPerformed', e.target.value)} className={inputCls + ' resize-none'} />
                     </div>
                     <div className="space-y-2">
                        <label className={labelCls}>Medications Administered</label>
                        <textarea rows={3} value={formData.medicationsAdministered} onChange={e => updateField('medicationsAdministered', e.target.value)} className={inputCls + ' resize-none'} />
                     </div>

                     {/* Dynamic Workflow */}
                     {selectedWorkflow && (
                        <div className="p-10 border-2 border-slate-100 space-y-8">
                           <h3 className="text-lg font-black text-brand-blue uppercase tracking-tighter flex items-center gap-3">
                              <Layers size={20} /> Matrix: {selectedWorkflow.name}
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
                     <SectionTitle title="Disposition" />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <Field label="Target Terminal" field="transport.destinationName" value={formData.transport.destinationName} update={updateField} error={fieldErrors['transport.destinationName']} required />
                        <div className="space-y-2">
                           <label className={fieldErrors['transport.transportMode'] ? 'text-[9px] font-black text-brand-red uppercase tracking-widest mb-2 block ml-1' : labelReqCls}>Transport Mode</label>
                           <select value={formData.transport.transportMode} onChange={e => updateField('transport.transportMode', e.target.value)} required className={fieldErrors['transport.transportMode'] ? 'w-full bg-white border-2 border-brand-red px-5 py-4 text-sm text-brand-red focus:border-brand-red outline-none transition-all font-black uppercase' : inputReqCls}>
                              <option value="">SELECT</option>
                              {TRANSPORT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                           </select>
                           {fieldErrors['transport.transportMode'] && <p className="text-[8px] font-black text-brand-red uppercase tracking-tighter ml-1">{fieldErrors['transport.transportMode']}</p>}
                        </div>
                        <div className="space-y-2">
                           <label className={labelCls}>Care Level</label>
                           <select value={formData.transport.careLevel} onChange={e => updateField('transport.careLevel', e.target.value)} className={inputCls}>
                              <option value="">SELECT</option>
                              <option value="BASIC">BASIC</option>
                              <option value="STABLE">STABLE</option>
                              <option value="URGENT">URGENT</option>
                              <option value="CRITICAL">CRITICAL</option>
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className={labelCls}>Status</label>
                           <select value={formData.status} onChange={e => updateField('status', e.target.value)} className={inputCls}>
                              <option value="PENDING">PENDING</option>
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="CANCELLED">CANCELLED</option>
                           </select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                           <label className={labelReqCls}>Triage Priority</label>
                           <div className="flex gap-2">
                              {[
                                 { id: 'RED', label: 'CRITICAL', color: 'bg-brand-red' },
                                 { id: 'YELLOW', label: 'URGENT', color: 'bg-amber-500' },
                                 { id: 'GREEN', label: 'STABLE', color: 'bg-emerald-600' },
                              ].map(t => (
                                 <button key={t.id} type="button" onClick={() => updateField('transport.patientConditionOnArrival', t.id === 'RED' ? 'CRITICAL' : (t.id === 'YELLOW' ? 'URGENT' : 'STABLE'))} className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest border-2 transition-all ${formData.transport.patientConditionOnArrival === (t.id === 'RED' ? 'CRITICAL' : (t.id === 'YELLOW' ? 'URGENT' : 'STABLE')) ? `${t.color} text-white border-transparent shadow-lg` : 'bg-white text-slate-400 border-slate-100 hover:border-brand-blue'}`}>
                                    {t.label}
                                 </button>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* Navigation */}
               <div className="pt-12 border-t-2 border-slate-100 flex justify-between items-center">
                  <button type="button" onClick={() => currentStep > 1 && setCurrentStep(s => s - 1)} disabled={currentStep === 1} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${currentStep === 1 ? 'opacity-0' : 'text-slate-400 hover:text-brand-red'}`}>
                     <ChevronLeft size={18} /> Previous Step
                  </button>
                  {currentStep < 4 ? (
                     <button type="button" onClick={handleNext} className="bg-brand-blue text-white px-12 py-5 font-black text-[12px] uppercase tracking-widest hover:bg-brand-red transition-all shadow-xl flex items-center gap-3">
                        Advance Protocol <ChevronRight size={18} />
                     </button>
                  ) : (
                     <button type="submit" disabled={isSubmitting} className="bg-brand-red text-white px-16 py-5 font-black text-[13px] uppercase tracking-widest hover:bg-brand-blue transition-all shadow-2xl flex items-center gap-3">
                        {isSubmitting ? <RefreshCw className="animate-spin" size={24} /> : <Zap size={24} />}
                        {recordId ? 'Update Manifest' : 'Commit Manifest'}
                     </button>
                  )}
               </div>
            </form>
         </div>
      </div>
   );
};

const SectionTitle = ({ title }) => (
   <div className="flex items-center gap-4 pb-4 border-b-2 border-slate-100">
      <div className="w-1.5 h-6 bg-brand-red" />
      <h3 className="text-xl font-black text-brand-blue uppercase tracking-tighter">{title}</h3>
   </div>
);

const Field = ({ label, field, value, update, type = 'text', required = false, disabled = false, maxLength, error, placeholder = '' }) => (
   <div className="space-y-2">
      <label className={error ? 'text-[9px] font-black text-brand-red uppercase tracking-widest mb-2 block ml-1' : (required ? labelReqCls : labelCls)}>{label}</label>
      <input
         type={type} value={value} onChange={e => update(field, e.target.value)} required={required} disabled={disabled} maxLength={maxLength} placeholder={placeholder}
         className={(error ? 'w-full bg-white border-2 border-brand-red px-5 py-4 text-sm text-brand-red focus:border-brand-red outline-none transition-all font-black uppercase' : (required ? inputReqCls : inputCls)) + (disabled ? ' opacity-50 bg-slate-100' : '')}
      />
      {error && <p className="text-[8px] font-black text-brand-red uppercase tracking-tighter ml-1">{error}</p>}
   </div>
);

const ToggleField = ({ label, field, value, update }) => (
   <div className="space-y-2">
      <label className={labelCls}>{label}</label>
      <button
         type="button"
         onClick={() => update(field, !value)}
         className={`w-full py-4 text-[10px] font-black uppercase tracking-widest border-2 transition-all ${value ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-slate-400 border-slate-200 hover:border-brand-blue'}`}
      >
         {value ? 'YES' : 'NO'}
      </button>
   </div>
);

export default CreateRecord;
