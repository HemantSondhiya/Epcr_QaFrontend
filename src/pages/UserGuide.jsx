import { useState } from 'react';
import { 
  BookOpen, ShieldCheck, LifeBuoy, CheckCircle2, User, 
  FileText, ClipboardList, Zap, HelpCircle as HelpIcon,
  Sparkles, ChevronDown, ChevronUp, Mic, Lock, Clipboard, Layers
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectRole } from '../store/slices/authSlice';
import { ROLE_MENU } from '../constants/permissions';

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
  VIEWER: {
    title: 'Guest / Auditor Viewer',
    color: 'border-slate-400 text-slate-600 bg-slate-50 border-dashed',
    description: 'Read-only access to basic dashboards, support tickets, system-wide notifications, and incident discussions.',
    tasks: [
      'Monitor clinical compliance rates and active case volume via the Dashboard',
      'Read system-wide notifications and alerts',
      'Review support tickets submitted by staff members',
      'View paramedic-to-QA feedback threads for general auditing'
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

const MENU_DESCRIPTIONS = {
  Dashboard: 'The main dashboard displaying real-time compliance rates, draft/pending QA charts count, response times, and active system alerts.',
  Organizations: 'Management pane to create, configure, and monitor clinic branches, ambulance fleets, and external agency partners.',
  Users: 'Staff account directory to invite crew members, reset passwords, update personal details, and configure RBAC roles.',
  Tickets: 'Internal helpdesk tracking platform issues, bugs, and feedback tickets submitted by paramedics or other staff.',
  EPCR: 'Digital charting portal where paramedics write new emergency records, input patient details, vitals, drugs, and submit to QA.',
  'QA Forms': 'Template creator to design clinical checklists and compliance rubrics for specific emergencies (e.g., Cardiac, Stroke).',
  'QA Reviews': 'Evaluations portal where auditors inspect submitted EPCRs, grade clinical performance, and approve/reject charts.',
  'QA Rules': 'Validation engine interface where managers declare logical rules (e.g., "ECG required if chest pain is selected").',
  'Rules Engine': 'Logical router that automatically executes backend actions (e.g., auto-routing reviews or issuing automated patient emails).',
  'Form Templates': 'Custom drag-and-drop form builder to layout inputs, toggles, and sections for the electronic medical chart.',
  Workflows: 'Process manager mapping out the strict step-by-step lifecycle flow of medical files from draft to archive.',
  Deployments: 'Release pane displaying live workflow versions running across the organization.',
  Reports: 'Analytics console generating performance statistics, response times, and enabling CSV/PDF clinical exports.',
  'Audit Logs': 'Comprehensive, immutable database logging every user login, page view, and record access to satisfy federal HIPAA audits.',
  Feedback: 'Secure real-time chat workspace connecting paramedics and QA reviewers to coordinate corrections on rejected charts.',
  Notifications: 'Inbox highlighting active tasks, chart status approvals, support updates, and emergency overrides.',
  'HIPAA Consent': 'Protected storage displaying signed digital agreements proving patients authorized data storage.',
  'HIPAA Disclosure': 'Release logs documenting every transmission of patient records to external systems (e.g., insurance companies).',
  'Patient Portal': 'Patient-facing portal where patients securely review their charts, sign consents, and track access disclosures.',
  'Patient History': 'Aggregated health records timeline combining history, allergies, medications, and vitals trend charts.',
  'Break-Glass': 'Emergency security bypass enabling immediate viewing of restricted files, with automatic compliance triggers.',
  'Business Associates': 'Directory tracking signed contracts (BAAs) with external vendors to verify legal HIPAA compliance.',
  'De-Identification': 'Data scrubber that anonymizes clinical datasets by removing PII (names, SSNs) before research export.',
  'Critical Follow-Ups': 'Safety registry tracking high-risk patients post-discharge to verify continuity of emergency treatment.',
  'User Guide': 'Interactive platform manual describing roles, workflows, permissions, and voice/AI features instructions.'
};

const VISIT_STEPS = [
  {
    role: 'PARAMEDIC',
    title: '1. Incident & Charting',
    desc: 'Patient John has an acute reaction. Paramedic Sarah responds, treats him, and creates an ePCR draft. She dictates notes using Voice-to-ePCR, and clicks Submit.',
    tip: 'Tip: Use Voice-to-ePCR to speak details naturally to auto-fill fields.'
  },
  {
    role: 'SYSTEM',
    title: '2. Auto-Validation',
    desc: 'The Rules Engine immediately scans the submitted record. If vital metrics or required fields (like ECG for chest pain) are missing, it tags the record with warning flags.',
    tip: 'Tip: Rules ensure HIPAA compliance and clinical protocol completion.'
  },
  {
    role: 'QA_REVIEWER',
    title: '3. Quality Audit',
    desc: 'QA Reviewer Dr. Miller accesses the pending queue, reviews the ePCR against compliance rubrics, gives a score (e.g., 95%), and approves the chart.',
    tip: 'Tip: Approved records are instantly locked for billing.'
  },
  {
    role: 'SYSTEM',
    title: '4. Notification',
    desc: 'The platform triggers an automated SMS/alert. Patient John receives a notification on his phone, and a red badge displays on the bell icon in his portal.',
    tip: 'Tip: Patients access their portal securely using OTP login.'
  },
  {
    role: 'PATIENT',
    title: '5. Patient Review',
    desc: 'John logs into the Patient Portal. He reviews his vitals tracking chart showing stabilization, downloads his official PDF, and reviews signed consent forms.',
    tip: 'Tip: Full transparency builds patient confidence.'
  },
  {
    role: 'PATIENT',
    title: '6. Amendment Request',
    desc: 'John remembers a pre-existing allergy. He submits an Amendment Request to correct his historical health record in the database.',
    tip: 'Tip: Patients can specify privacy levels (opt-out of external disclosures).'
  },
  {
    role: 'PHYSICIAN',
    title: '7. Medical Sign-off',
    desc: 'Physician Dr. Smith receives the amendment request. He verifies John\'s clinical timeline, checks the AI suggestion warnings, and approves the change.',
    tip: 'Tip: Approving updates the master patient history timeline securely.'
  },
  {
    role: 'ADMIN',
    title: '8. Security Audit',
    desc: 'Every single step—logins, record views, AI suggestions, and edits—is logged in the immutable Audit Logs page, ensuring 100% HIPAA audit compliance.',
    tip: 'Tip: This keeps the clinic safe from federal regulatory penalties.'
  }
];

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
  const [activeStep, setActiveStep] = useState(0);

  const activeRoleData = ROLE_DETAILS[selectedRole];
  return (
    <div className="space-y-6 pb-12 animate-fade-in max-w-6xl mx-auto px-4 md:px-6">
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
        
        {/* Sidebar Controls */}
        <div className="space-y-4">
          
          {/* Role Selector */}
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
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive 
                        ? 'border-brand-blue bg-[#EEF2FF] text-brand-blue font-bold shadow-sm' 
                        : 'border-[#DDE3F0] hover:border-brand-blue hover:bg-slate-50 text-[#4B5A7A]'
                    }`}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider">{ROLE_DETAILS[roleKey].title} ({roleKey})</span>
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
          
          {/* Role Description Card */}
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

          {/* Dynamic Menu & Page Access Explorer */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-[#F0F4FC] pb-3">
              <Layers size={14} className="text-brand-blue" />
              <h3 className="text-xs font-black text-[#0F1A3A] uppercase tracking-wider">
                Accessible Pages & Tool Guide
              </h3>
            </div>
            <p className="text-xs text-[#8A97B0]">
              Under the selected <span className="font-bold text-[#0F1A3A]">{selectedRole}</span> role, you have access to the following {ROLE_MENU[selectedRole]?.length || 0} platform pages:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {ROLE_MENU[selectedRole]?.map(menu => (
                <div key={menu} className="p-3 rounded-xl border border-[#DDE3F0] bg-white hover:border-brand-blue/30 transition-all flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#0F1A3A] flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-blue shrink-0"></span>
                      {menu}
                    </h4>
                    <p className="text-[10px] text-[#4B5A7A] leading-relaxed">
                      {MENU_DESCRIPTIONS[menu] || 'Platform screen detail.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Clickable Patient Visit Timeline */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-[#F0F4FC] pb-3">
              <Sparkles size={14} className="text-violet-600" />
              <h3 className="text-xs font-black text-[#0F1A3A] uppercase tracking-wider">
                Interactive Patient Care Lifecycle
              </h3>
            </div>
            <p className="text-xs text-[#8A97B0]">
              Click through the steps below to see how different roles work together in a real-life patient care scenario:
            </p>
            
            {/* Timeline circles */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 border-b border-[#F0F4FC] scrollbar-thin">
              {VISIT_STEPS.map((step, idx) => {
                const isActive = activeStep === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveStep(idx)}
                    className={`flex flex-col items-center min-w-[90px] cursor-pointer transition-all duration-200 p-1.5 rounded-lg ${
                      isActive ? 'scale-105 font-bold text-brand-blue bg-[#EEF2FF]' : 'opacity-65 hover:opacity-100'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black mb-1 ${
                      isActive ? 'bg-brand-blue text-white shadow' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-wider text-center line-clamp-1 max-w-[80px]">
                      {step.role}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Step Details */}
            <div className="p-4.5 rounded-xl border border-slate-100 bg-[#FAFBFF] space-y-2.5 animate-slide-up">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-[#0F1A3A]">
                  {VISIT_STEPS[activeStep].title}
                </h4>
                <span className="badge border-blue-500 text-blue-600 bg-blue-50 text-[9px] font-black tracking-widest uppercase">
                  Role: {VISIT_STEPS[activeStep].role}
                </span>
              </div>
              <p className="text-xs text-[#4B5A7A] leading-relaxed">
                {VISIT_STEPS[activeStep].desc}
              </p>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 flex items-start gap-2">
                <CheckCircle2 size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-[10px] font-semibold text-emerald-800 leading-relaxed m-0">
                  {VISIT_STEPS[activeStep].tip}
                </p>
              </div>
            </div>
          </div>

          {/* Voice & AI Assistant Help Guides */}
          <div className="card p-6 space-y-5">
            <h3 className="text-xs font-black text-[#0F1A3A] uppercase tracking-wider border-b border-[#F0F4FC] pb-3 flex items-center gap-1.5">
              <Mic size={13} className="text-brand-blue animate-pulse" /> Advanced Voice & AI Features
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { 
                  title: 'Voice Search (Alt+V)', 
                  icon: Mic, 
                  desc: 'Press Alt+V or click the floating microphone button in the lower right. Say a patient\'s name to immediately find and open their EPCR records.', 
                  color: 'text-blue-600 bg-blue-50' 
                },
                { 
                  title: 'Voice-to-ePCR Dictation', 
                  icon: FileText, 
                  desc: 'Inside the EPCR creation form, click Voice-to-ePCR and dictate patient metrics/observations. AI parses this to auto-fill fields with color-coded feedback.', 
                  color: 'text-emerald-600 bg-emerald-50' 
                },
                { 
                  title: 'Gemini Q&A Assistant', 
                  icon: Sparkles, 
                  desc: 'In the physician portal, speak or type queries about patient diagnostics. Hear processed answers read aloud using the text-to-speech option.', 
                  color: 'text-violet-600 bg-violet-50' 
                },
                { 
                  title: 'Emergency Break-Glass', 
                  icon: Lock, 
                  desc: 'Instantly bypass file access locks during critical life-saving care. Triggers high-priority notifications and generates audits for compliance oversight.', 
                  color: 'text-rose-600 bg-rose-50' 
                }
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl border border-[#DDE3F0] hover:border-brand-blue/30 transition-all space-y-2 bg-[#FAFBFF]">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${item.color}`}>
                      <item.icon size={13} />
                    </div>
                    <h4 className="text-xs font-bold text-[#0F1A3A]">{item.title}</h4>
                  </div>
                  <p className="text-[10px] text-[#4B5A7A] leading-relaxed">{item.desc}</p>
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
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-left cursor-pointer"
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
