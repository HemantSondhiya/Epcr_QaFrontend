import { useState } from 'react';
import { 
  BookOpen, Shield, ShieldCheck, HeartPulse, UserSquare, LifeBuoy, 
  HelpCircle, ChevronDown, ChevronUp, CheckCircle2, User, 
  FileText, ClipboardList, Zap, Settings, HelpCircle as HelpIcon,
  Sparkles, Mic, Volume2
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectRole } from '../store/slices/authSlice';

const ROLE_DETAILS = {
  ADMIN: {
    title: 'System Administrator',
    color: 'border-rose-500 text-rose-600 bg-rose-50',
    description: 'Platform ka full oversight aur system administration manage karna.',
    tasks: [
      'Naye staff accounts (users) create aur manage karna',
      'System-wide HIPAA logs and security trails check karna',
      'Deployments, system workflows aur organization details setup karna',
      'Tech support tickets ko address aur resolve karna'
    ]
  },
  MANAGER: {
    title: 'Operations Manager',
    color: 'border-blue-500 text-blue-600 bg-blue-50',
    description: 'Medical and administrative operations aur templates design karna.',
    tasks: [
      'Patient intake aur clinical assessment templates design karna',
      'Reviewers ke liye active QA Forms & Questionnaires set karna',
      'Automatic record checks ke liye QA validation rules banana',
      'Operations reports, statistics aur compliance status check karna'
    ]
  },
  PARAMEDIC: {
    title: 'Emergency Paramedic',
    color: 'border-amber-500 text-amber-600 bg-amber-50',
    description: 'Field response, emergency care aur initial patient charting karna.',
    tasks: [
      'Electronic Patient Care Records (EPCR) form fill aur submit karna',
      'Patient vitals log, timeline check, aur medications add karna',
      'QA reviews feedback check karke errors ko update/correct karna',
      'Critical follow-up tasks aur follow-up protocols check karna'
    ]
  },
  QA_REVIEWER: {
    title: 'Clinical QA Reviewer',
    color: 'border-emerald-500 text-emerald-600 bg-emerald-50',
    description: 'Submitted medical charts ki accuracy aur protocol verification check karna.',
    tasks: [
      'Submitted records ke automatic warning flags check karna',
      'Graded checklists fill karke quality score assign karna',
      'Form approve karna (Final Billing ke liye) ya reject karna (Paramedic corrections)',
      'Paramedics ke sath feedback threads me protocol correct karna'
    ]
  },
  PHYSICIAN: {
    title: 'Clinical Oversight Physician',
    color: 'border-violet-500 text-violet-600 bg-violet-50',
    description: 'Specialty timeline reviews, expert reviews aur HIPAA amendments verify karna.',
    tasks: [
      'Comprehensive Patient History, charts, timeline aur diagnostics check karna',
      'Gemini AI suggestions, findings, clinical concerns, aur clinical Q&A check karna',
      'Patient amendments requests aur patient correction requests approve karna',
      'Critical follow-up cases aur clinical oversight reports check karna'
    ]
  },
  PATIENT: {
    title: 'Patient Portal Account',
    color: 'border-teal-500 text-teal-600 bg-teal-50',
    description: 'Apna medical record, treatment details aur data sharing preferences control karna.',
    tasks: [
      'Signed HIPAA Consent sheets download aur review karna',
      'Medical data logs aur disclosures details track karna',
      'Medical details correct karne ke liye data amendment request send karna',
      'Strict data access preferences (opt-in/opt-out) control karna'
    ]
  }
};

const FAQ_ITEMS = [
  {
    question: 'How does the Patient Record (EPCR) validation rules flow work?',
    answer: 'Manager validation rules create karte hain (e.g., transportMode EMERGENCY hone par careLevel compulsory ALS hona chahiye). Paramedic ke record submit karte hi engine is path ko scan karta hai. Agar rule deviate hua, toh record par auto-flag (Critical Warning) lag jata hai aur QA Reviewer ko warning alert dikhti hai.'
  },
  {
    question: 'How do I complete a QA Review?',
    answer: 'Reviewer, QA Reviews queue me record open karke "Complete Review" click karta hai. Wahan par active QA Form questions dikhte hain. Inhe fill karke, quality score aur PASS/FAIL toggle set karke save karne par record final approve (lock) ho jata hai.'
  },
  {
    question: 'How does the Gemini Clinical AI Suggestion & Voice Q&A work?',
    answer: 'Physician portal me Gemini suggestions panel record ko analyse karke risk score, clinical findings aur missing data alerts dikhata hai. "Ask Doctor Q&A" tab me mic icon click karke voice se question puch sakte hain. Ye system continuous listening karta hai aur 2.5 seconds ki silent pause hone par answer generate kar deta hai. Speaker icon click karke voice answer sun sakte hain.'
  },
  {
    question: 'What is the Break-Glass override protocol?',
    answer: 'Emergency condition me restricted patient chart open karne ke liye Break-Glass button click karke reason likhna hota hai. Access turant open ho jata hai, aur audit log alert compliance team ko send ho jata hai.'
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
            <p className="text-[10px] text-white/70 leading-relaxed mb-4">Agar application me koi technical issue aa raha hai, toh click karke internal Support Ticket generate karein.</p>
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
              <h4 className="text-[10px] font-black text-[#A0AECB] uppercase tracking-widest">Key Responsibilities (Zimmedariyan)</h4>
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
                { title: 'Electronic EPCR', icon: FileText, desc: 'Paramedics emergency metrics, medications log, timelines, and clinical tags save karte hain.', color: 'text-blue-600 bg-blue-50' },
                { title: 'QA Audits', icon: ClipboardList, desc: 'Auditors checklists fill karte hain, score set karte hain aur PASS/FAIL stamp verify karte hain.', color: 'text-emerald-600 bg-emerald-50' },
                { title: 'Auto-Flagging', icon: ShieldCheck, desc: 'Setup QA rules automatically check data values against exceptions to alert errors.', color: 'text-amber-600 bg-amber-50' },
                { title: 'Gemini AI Assistant', icon: Sparkles, desc: 'Clinical risk summary cards, continuous mic voice Q&A, and read-out voice assistance.', color: 'text-violet-600 bg-violet-50' }
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
              <HelpIcon size={13} className="text-brand-blue" /> Operational FAQs (Hindi/Hinglish)
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
