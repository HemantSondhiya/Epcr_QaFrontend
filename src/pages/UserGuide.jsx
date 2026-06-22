import { useState } from 'react';
import { 
  BookOpen, ShieldCheck, LifeBuoy, CheckCircle2, User, 
  FileText, ClipboardList, Zap, HelpCircle as HelpIcon,
  Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectRole } from '../store/slices/authSlice';

const ROLE_DETAILS = {
  ADMIN: {
    title: 'System Administrator',
    color: 'border-rose-500 text-rose-600 bg-rose-50',
    description: 'Manage full oversight and system-wide administration of the platform.',
    tasks: [
      'Create, update, and manage staff accounts and user security roles',
      'Monitor system-wide HIPAA logs and security audit trails',
      'Configure workflow paths, deployments, and organization parameters',
      'Address and resolve technical support tickets submitted by staff'
    ]
  },
  MANAGER: {
    title: 'Operations Manager',
    color: 'border-blue-500 text-blue-600 bg-blue-50',
    description: 'Design medical and administrative workflows, operations, and templates.',
    tasks: [
      'Design templates for patient intake and clinical assessments',
      'Build and assign evaluation templates and QA forms for reviewers',
      'Construct automated validation rules (QA Rules) for clinical compliance',
      'Review operational analytics, performance reports, and compliance scores'
    ]
  },
  PARAMEDIC: {
    title: 'Emergency Paramedic',
    color: 'border-amber-500 text-amber-600 bg-amber-50',
    description: 'Provide emergency care on-scene and perform initial patient charting.',
    tasks: [
      'Complete and submit Electronic Patient Care Records (EPCR) in the field',
      'Log baseline patient vitals, incident timeline, and drugs administered',
      'Review QA auditor feedback and correct any rejected chart errors',
      'Monitor critical post-discharge follow-up protocols'
    ]
  },
  QA_REVIEWER: {
    title: 'Clinical QA Reviewer',
    color: 'border-emerald-500 text-emerald-600 bg-emerald-50',
    description: 'Verify the accuracy and protocol compliance of submitted clinical charts.',
    tasks: [
      'Inspect automated warning flags and validation warnings on records',
      'Complete audit checklists and assign clinical quality compliance scores',
      'Approve valid records (locking them for billing) or reject records needing revision',
      'Open feedback chat threads to resolve protocol questions with paramedics'
    ]
  },
  PHYSICIAN: {
    title: 'Clinical Oversight Physician',
    color: 'border-violet-500 text-violet-600 bg-violet-50',
    description: 'Review specialized clinical timelines, perform expert audits, and approve patient data amendments.',
    tasks: [
      'Examine comprehensive patient history, diagnostics, and clinical timelines',
      'Review Gemini AI diagnostic suggestions, concerns, and clinical Q&A logs',
      'Evaluate and approve patient requests to amend or correct medical records',
      'Oversee critical follow-up registries and high-risk case reports'
    ]
  },
  PATIENT: {
    title: 'Patient Portal Account',
    color: 'border-teal-500 text-teal-600 bg-teal-50',
    description: 'Access and download personal medical records, manage data sharing, and specify privacy preferences.',
    tasks: [
      'Download and review signed HIPAA consent authorization documents',
      'Monitor data disclosure history and track who has viewed personal charts',
      'Submit formal amendment requests to correct errors in personal medical history',
      'Set strict privacy and data sharing preferences (opt-in/opt-out settings)'
    ]
  }
};

const FAQ_ITEMS = [
  {
    question: 'How does the Patient Record (EPCR) validation rules flow work?',
    answer: 'Managers define validation rules (e.g., if transport mode is Emergency, care level must be ALS). When a paramedic submits a record, the engine scans the data. If a rule is violated, the system stamps an auto-flag (Critical Warning) on the record and alerts the QA Reviewer.'
  },
  {
    question: 'How do I complete a QA Review?',
    answer: 'The auditor opens a pending record in the QA Reviews queue and clicks "Complete Review". This renders the questions from the active QA Form. After answering the questions, assigning a score, and toggling PASS/FAIL, saving the review locks the record and marks it as approved for billing.'
  },
  {
    question: 'How does the Gemini Clinical AI Suggestion & Voice Q&A work?',
    answer: 'In the physician portal, the Gemini suggestions panel analyzes the record to display risk scores, clinical findings, concerns, and missing data warnings. In the "Ask Doctor Q&A" tab, you can click the mic icon to ask questions by voice. The system records continuously and auto-submits after 2.5 seconds of silence. Clicking the speaker icon reads the AI response out loud.'
  },
  {
    question: 'What is the Break-Glass override protocol?',
    answer: 'In critical emergencies, restricted patient charts can be opened by clicking the "Break-Glass" button and entering a justification. Access is granted immediately, and a high-priority audit log notification is sent to the compliance team.'
  }
];

const UserGuide = () => {
  const currentRole = useSelector(selectRole);
  const [selectedRole, setSelectedRole] = useState(ROLE_DETAILS[currentRole] ? currentRole : 'PARAMEDIC');
  const [openFaq, setOpenFaq] = useState(null);

  const activeRoleData = ROLE_DETAILS[selectedRole];

  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[#EEF2FF] rounded-2xl flex items-center justify-center text-brand-blue shadow-md">
          <BookOpen size={24} />
        </div>
        <div>
          <p className="section-label mb-0.5">Application Help Center</p>
          <h1 className="text-2xl font-black text-[#0F1A3A] tracking-tight">User Guide &amp; <span className="text-brand-blue">Responsibilities</span></h1>
          <p className="text-xs text-[#8A97B0]">Platform rules, features guide, and clinical operational workflows</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sidebar Role Selector */}
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-black text-[#0F1A3A] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User size={13} className="text-brand-blue" /> Choose Staff Role
            </h3>
            <div className="space-y-2">
              {Object.keys(ROLE_DETAILS).map(roleKey => {
                const isActive = selectedRole === roleKey;
                return (
                  <button
                    key={roleKey}
                    onClick={() => setSelectedRole(roleKey)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                      isActive 
                        ? 'border-brand-blue bg-[#EEF2FF] text-brand-blue font-bold shadow-sm' 
                        : 'border-[#DDE3F0] hover:border-brand-blue hover:bg-slate-50 text-[#4B5A7A]'
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider">{roleKey}</span>
                    {isActive && <CheckCircle2 size={13} className="text-brand-blue" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Help Links */}
          <div className="card p-5 bg-gradient-to-br from-[#1A3C8F] to-[#0F2660] text-white">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mb-3">
              <LifeBuoy size={16} />
            </div>
            <h3 className="font-black text-sm mb-1 text-white">Need Live Help?</h3>
            <p className="text-[10px] text-white/70 leading-relaxed mb-4">If you encounter any technical issues on the platform, click below to submit an internal support ticket.</p>
            <a href="/tickets" className="btn-primary bg-brand-red hover:bg-brand-red-dark w-full justify-center py-2 text-xs">
              Go to Support Tickets
            </a>
          </div>
        </div>

        {/* Roles & Tasks Detail View */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Role Card */}
          <div className="card p-6 space-y-5 animate-slide-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0F4FC] pb-4">
              <div>
                <span className={`badge ${activeRoleData.color} text-[9px] font-black tracking-widest`}>
                  {selectedRole} ROLE
                </span>
                <h2 className="text-lg font-black text-[#0F1A3A] mt-1">{activeRoleData.title}</h2>
              </div>
              {currentRole === selectedRole && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  <CheckCircle2 size={11} /> Your Assigned Role
                </span>
              )}
            </div>

            <p className="text-xs font-medium text-[#4B5A7A] leading-relaxed">{activeRoleData.description}</p>

            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest">Key Responsibilities</h4>
              <div className="grid grid-cols-1 gap-2.5">
                {activeRoleData.tasks.map((task, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl border border-[#DDE3F0] bg-[#F8FAFF]">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center text-[9px] font-black shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-xs text-[#0F1A3A] font-semibold leading-relaxed">{task}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Workflow Features Checklists */}
          <div className="card p-6 space-y-5">
            <h3 className="text-xs font-black text-[#0F1A3A] uppercase tracking-wider border-b border-[#F0F4FC] pb-3 flex items-center gap-1.5">
              <Sparkles size={13} className="text-violet-600" /> Platform Core Features (Workflows)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: 'Electronic EPCR', icon: FileText, desc: 'Paramedics log patient vitals, medication logs, incident timelines, and generate clinical tags.', color: 'text-blue-600 bg-blue-50' },
                { title: 'QA Audits', icon: ClipboardList, desc: 'Auditors fill checklists, assign quality compliance scores, and toggle record approval.', color: 'text-emerald-600 bg-emerald-50' },
                { title: 'Auto-Flagging', icon: ShieldCheck, desc: 'Validation rules automatically check record parameters to raise warning flags.', color: 'text-amber-600 bg-amber-50' },
                { title: 'Gemini AI Assistant', icon: Sparkles, desc: 'Generates clinical summaries, highlights concerns, and enables voice-activated Q&A.', color: 'text-violet-600 bg-violet-50' }
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl border border-[#DDE3F0] hover:border-brand-blue/30 transition-all space-y-2 bg-[#FAFBFF]">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${item.color}`}>
                      <item.icon size={13} />
                    </div>
                    <h4 className="text-xs font-bold text-[#0F1A3A]">{item.title}</h4>
                  </div>
                  <p className="text-[10px] text-[#8A97B0] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Accordion FAQ Guide */}
          <div className="card p-6 space-y-4">
            <h3 className="text-xs font-black text-[#0F1A3A] uppercase tracking-wider border-b border-[#F0F4FC] pb-3 flex items-center gap-1.5">
              <HelpIcon size={13} className="text-brand-blue" /> Operational FAQs
            </h3>
            <div className="space-y-2">
              {FAQ_ITEMS.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} className="rounded-xl border border-[#DDE3F0] overflow-hidden transition-all bg-[#FAFBFF]">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <span className="text-xs font-bold text-[#0F1A3A] pr-4">{faq.question}</span>
                      <span className="text-[#A0AECB] shrink-0">
                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 border-t border-[#F0F4FC] bg-white">
                        <p className="text-xs text-[#4B5A7A] leading-relaxed pt-2">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default UserGuide;
