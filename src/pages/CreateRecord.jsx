import { useState, useEffect } from 'react';
import { ArrowLeft, Save, ChevronRight, User, Activity, FilePlus2, CheckCircle2, Layers, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import client from '../api/client';
import { selectUser } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import { createRecord } from '../store/slices/epcrSlice';
import { fetchWorkflows, selectWorkflows } from '../store/slices/workflowSlice';
import DynamicFormRenderer from '../components/forms/DynamicFormRenderer';

const CreateRecord = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Workflow/form engine state
  const workflows = useSelector(selectWorkflows);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [dynamicFormResponses, setDynamicFormResponses] = useState({});

  const [formData, setFormData] = useState({
    patientId: '', patientName: '', patientDateOfBirth: '', patientGender: '', patientPhone: '', patientAddress: '',
    incidentDateTime: '', incidentLocation: '', incidentDescription: '',
    complaints: '', vitals: '', diagnosis: '', treatmentProvided: '', transportDestination: ''
  });

  // Fetch active workflows for the org
  useEffect(() => {
    dispatch(fetchWorkflows(user?.organizationId));
  }, [dispatch, user]);

  // Dynamic step — only show Step 4 if selected workflow has form fields
  const hasDynamicStep = selectedWorkflow?.formSchema?.fields?.length > 0;
  const totalSteps = hasDynamicStep ? 4 : 3;

  const steps = [
    { id: 1, name: 'Patient Info', icon: <User size={18} /> },
    { id: 2, name: 'Incident Details', icon: <FilePlus2 size={18} /> },
    { id: 3, name: 'Vitals & Treatment', icon: <Activity size={18} /> },
    ...(hasDynamicStep ? [{ id: 4, name: selectedWorkflow.name, icon: <Layers size={18} /> }] : []),
  ];

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleDynamicChange = (key, value) => {
    setDynamicFormResponses(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveRecord = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const payload = {};

      const stringFields = ['patientId', 'patientName', 'patientDateOfBirth', 'patientGender', 'patientPhone', 'patientAddress',
        'incidentLocation', 'incidentDescription', 'diagnosis', 'treatmentProvided', 'transportDestination'];
      stringFields.forEach(field => {
        if (formData[field]?.trim()) payload[field] = formData[field].trim();
      });

      if (formData.incidentDateTime) {
        let dt = formData.incidentDateTime;
        if (dt.length === 16) dt += ':00';
        payload.incidentDateTime = dt;
      }

      payload.complaints = formData.complaints ? formData.complaints.split(',').map(c => c.trim()).filter(Boolean) : [];
      payload.vitals = formData.vitals ? formData.vitals.split(',').map(v => v.trim()).filter(Boolean) : [];

      if (user?.userId) payload.paramedicsId = user.userId;
      if (user?.organizationId) payload.organizationId = user.organizationId;

      // Attach dynamic form responses and workflow reference
      if (Object.keys(dynamicFormResponses).length > 0) {
        payload.dynamicFormResponses = dynamicFormResponses;
      }
      if (selectedWorkflow?.id) {
        payload.dynamicFormResponses = {
          ...payload.dynamicFormResponses,
          workflowId: selectedWorkflow.id,
          workflowName: selectedWorkflow.name,
        };
      }

      await dispatch(createRecord(payload)).unwrap();
      dispatch(addToast({ type: 'success', message: 'Record created successfully' }));
      navigate('/records');
    } catch (err) {
      setError(err || 'Failed to save the record.');
      dispatch(addToast({ type: 'error', message: err || 'Failed to save the record.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/records')}
          className="p-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create New EPCR</h1>
          <p className="text-slate-400 text-sm mt-1">Fill in the details for the new patient care report.</p>
        </div>
      </div>

      {/* Workflow selector */}
      {workflows.length > 0 && (
        <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Layers size={18} className="text-teal-400 shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-200">Apply Workflow Form</p>
            <p className="text-xs text-slate-400 mt-0.5">Select a workflow to add dynamic fields to this record.</p>
          </div>
          <select
            value={selectedWorkflow?.id || ''}
            onChange={e => {
              const wf = workflows.find(w => w.id === e.target.value) || null;
              setSelectedWorkflow(wf);
              setDynamicFormResponses({});
              if (currentStep === 4 && !wf?.formSchema?.fields?.length) setCurrentStep(3);
            }}
            className="w-full sm:w-64 bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none appearance-none"
          >
            <option value="">No workflow</option>
            {workflows.map(w => (
              <option key={w.id} value={w.id}>{w.name} ({w.formSchema.fields.length} fields)</option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Stepper */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-slate-800 z-0"></div>
          {steps.map((step) => (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  currentStep === step.id
                    ? 'bg-teal-500 border-teal-500 text-slate-900 shadow-[0_0_15px_rgba(45,212,191,0.4)]'
                    : currentStep > step.id
                      ? 'bg-teal-500/20 border-teal-500 text-teal-400'
                      : 'bg-slate-900 border-slate-700 text-slate-500'
                }`}
              >
                {currentStep > step.id ? <CheckCircle2 size={20} /> : step.icon}
              </div>
              <span className={`text-xs font-medium text-center max-w-[70px] ${currentStep >= step.id ? 'text-slate-200' : 'text-slate-500'}`}>
                {step.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Form Area */}
      <div className="glass-card rounded-2xl p-6 md:p-8 relative overflow-hidden">
        {currentStep === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Patient Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Patient ID (Required for Patient Portal)</label>
                <input name="patientId" value={formData.patientId} onChange={handleChange} className="w-full bg-slate-900/50 border border-teal-500/30 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" placeholder="e.g. PAT-1001" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Full Name</label>
                <input name="patientName" value={formData.patientName} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50" placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Date of Birth</label>
                <input type="date" name="patientDateOfBirth" value={formData.patientDateOfBirth} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Gender</label>
                <select name="patientGender" value={formData.patientGender} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 appearance-none">
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Phone</label>
                <input name="patientPhone" value={formData.patientPhone} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50" placeholder="+1 (555) 000-0000" />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-slate-300">Address</label>
                <input name="patientAddress" value={formData.patientAddress} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50" placeholder="123 Main St, City, State" />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Incident Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Date & Time</label>
                <input type="datetime-local" name="incidentDateTime" value={formData.incidentDateTime} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Location</label>
                <input name="incidentLocation" value={formData.incidentLocation} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50" placeholder="Location of incident" />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-slate-300">Incident Description</label>
                <textarea name="incidentDescription" value={formData.incidentDescription} onChange={handleChange} rows="4" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 resize-none" placeholder="Describe the incident..."></textarea>
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-slate-300">Chief Complaints (Comma separated)</label>
                <input name="complaints" value={formData.complaints} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50" placeholder="e.g. Chest pain, Shortness of breath" />
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Vitals & Treatment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-slate-300">Vitals (Comma separated)</label>
                <input name="vitals" value={formData.vitals} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50" placeholder="e.g. BP 120/80, Pulse 88" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Diagnosis / Impression</label>
                <input name="diagnosis" value={formData.diagnosis} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50" placeholder="Mild trauma" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Transport Destination</label>
                <input name="transportDestination" value={formData.transportDestination} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50" placeholder="City General Hospital" />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-slate-300">Treatment Provided</label>
                <textarea name="treatmentProvided" value={formData.treatmentProvided} onChange={handleChange} rows="4" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 resize-none" placeholder="First aid, oxygen administered..."></textarea>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — Dynamic Workflow Fields */}
        {currentStep === 4 && hasDynamicStep && (
          <DynamicFormRenderer
            schema={selectedWorkflow.formSchema}
            values={dynamicFormResponses}
            onChange={handleDynamicChange}
          />
        )}

        <div className="mt-8 pt-6 border-t border-[var(--border-color)] flex justify-between items-center">
          <button
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1 || isSubmitting}
            className="px-6 py-2.5 rounded-lg text-slate-300 font-medium hover:bg-slate-800/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>

          {currentStep < totalSteps ? (
            <button
              onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
              className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-900 px-6 py-2.5 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(45,212,191,0.3)]"
            >
              <span>Next Step</span>
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSaveRecord}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-900 px-6 py-2.5 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(45,212,191,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              <span>{isSubmitting ? 'Saving...' : 'Save Record'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateRecord;
