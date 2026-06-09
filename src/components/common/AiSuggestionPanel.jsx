import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Sparkles, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle, Clock, RefreshCw, Brain, TrendingUp,
  List, Zap, FileText, AlertCircle, Paperclip, Search,
} from 'lucide-react';
import {
  generateAiSuggestion,
  fetchAiSuggestions,
  selectSuggestionsForRecord,
  selectAiGenerating,
  selectAiFetching,
  selectAiError,
  clearAiError,
} from '../../store/slices/aiSuggestionSlice';

/* ── Markdown sanitizer ──────────────────────────────────────────── */
const clean = (text) =>
  String(text ?? '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')   // strip **bold**
    .replace(/\*([^*]+)\*/g, '$1')        // strip *italic*
    .replace(/^#+\s*/gm, '')              // strip # headers
    .replace(/^\s*[-*•]\s*/gm, '')        // strip leading bullet chars
    .trim();

/* ── Risk Badge ─────────────────────────────────────────── */
const RISK_CONFIG = {
  HIGH:   { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: AlertTriangle, dot: 'bg-red-500'    },
  MEDIUM: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  icon: TrendingUp,    dot: 'bg-amber-400'  },
  LOW:    { bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200',icon: CheckCircle,   dot: 'bg-emerald-500'},
};

const RiskBadge = ({ level }) => {
  const key  = String(level || '').toUpperCase();
  const cfg  = RISK_CONFIG[key] || RISK_CONFIG.MEDIUM;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <Icon size={11} />
      {key || 'UNKNOWN'} RISK
    </span>
  );
};

/* ── Bullet list ─────────────────────────────────────────────────── */
// Accepts: Array<string> (backend parsed) or plain string (legacy rawResponse)
const BulletList = ({ raw, bulletColor = 'bg-brand-blue' }) => {
  if (!raw || (Array.isArray(raw) && raw.length === 0)) {
    return <p className="text-xs text-[#8A97B0] italic">None provided.</p>;
  }
  const items = Array.isArray(raw)
    ? raw.map(clean).filter(Boolean)
    : String(raw).split('\n').map(clean).filter(Boolean);
  if (!items.length) return <p className="text-xs text-[#4B5A7A]">{String(raw)}</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-[#374563] leading-relaxed">
          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${bulletColor} shrink-0`} />
          {item}
        </li>
      ))}
    </ul>
  );
};

/* ── Single suggestion card ─────────────────────────────── */
const SuggestionCard = ({ suggestion, isLatest }) => {
  const [open, setOpen] = useState(isLatest);
  const ts = suggestion.createdAt
    ? new Date(suggestion.createdAt).toLocaleString()
    : suggestion.generatedAt
    ? new Date(suggestion.generatedAt).toLocaleString()
    : '';

  return (
    <div className={`rounded-2xl border transition-all overflow-hidden ${
      isLatest
        ? 'border-violet-200 shadow-md shadow-violet-50 bg-white'
        : 'border-[#DDE3F0] bg-[#FAFBFF]'
    }`}>
      {/* Card header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-violet-50/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isLatest && (
            <span className="text-[9px] font-black uppercase tracking-widest bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full border border-violet-200">
              Latest
            </span>
          )}
          <RiskBadge level={suggestion.riskLevel} />
          {ts && (
            <span className="flex items-center gap-1 text-[10px] text-[#A0AECB] font-medium">
              <Clock size={10} /> {ts}
            </span>
          )}
        </div>
        <span className="text-[#A0AECB]">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {/* Card body */}
      {open && (
        <div className="px-4 pb-5 pt-2 space-y-5 border-t border-[#F0F4FC]">

          {/* 1. Clinical Summary */}
          {suggestion.clinicalSummary && (
            <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 mt-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-1.5">Clinical Summary</p>
              <p className="text-xs text-[#374563] leading-relaxed">{clean(suggestion.clinicalSummary)}</p>
            </div>
          )}

          {/* 2. Findings */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><Brain size={13} /></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#A0AECB]">Clinical Findings</p>
            </div>
            <BulletList raw={suggestion.findings} bulletColor="bg-blue-400" />
          </div>

          {/* 3. Clinical Concerns */}
          {(suggestion.clinicalConcerns?.length > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600"><AlertCircle size={13} /></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#A0AECB]">Clinical Concerns</p>
              </div>
              <BulletList raw={suggestion.clinicalConcerns} bulletColor="bg-amber-400" />
            </div>
          )}

          {/* 4. Recommendations */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600"><Zap size={13} /></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#A0AECB]">Recommendations</p>
            </div>
            <BulletList raw={suggestion.recommendations} bulletColor="bg-emerald-500" />
          </div>

          {/* 5. Recommended Plan */}
          {(suggestion.recommendedPlan?.length > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600"><List size={13} /></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#A0AECB]">Recommended Plan</p>
              </div>
              <BulletList raw={suggestion.recommendedPlan} bulletColor="bg-indigo-400" />
            </div>
          )}

          {/* 6. Missing Data */}
          {(suggestion.missingData?.length > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500"><Search size={13} /></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#A0AECB]">Missing Data</p>
              </div>
              <BulletList raw={suggestion.missingData} bulletColor="bg-slate-400" />
            </div>
          )}

          {/* 7. Attachments Analyzed */}
          {(suggestion.attachmentsAnalyzed?.length > 0) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500"><Paperclip size={13} /></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#A0AECB]">
                  Attachments Analyzed ({suggestion.attachmentsAnalyzed.length})
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestion.attachmentsAnalyzed.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-600 font-medium">
                    <FileText size={9} /> {clean(a)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          {suggestion.requestedBy && (
            <p className="text-[10px] text-[#C0CADF] font-medium pt-2 border-t border-[#F0F4FC]">
              Requested by: <span className="font-bold text-[#8A97B0]">{suggestion.requestedBy}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Main Panel ─────────────────────────────────────────── */
/**
 * @param {string}   recordId   — the ePCR record ID
 * @param {string[]} allowedRoles — roles that can generate (default: PHYSICIAN, ADMIN)
 * @param {string}   userRole   — current user role
 */
const AiSuggestionPanel = ({ recordId, userRole, allowedRoles = ['PHYSICIAN', 'ADMIN', 'MANAGER'] }) => {
  const dispatch    = useDispatch();
  const suggestions = useSelector(selectSuggestionsForRecord(recordId));
  const generating  = useSelector(selectAiGenerating);
  const fetching    = useSelector(selectAiFetching);
  const aiError     = useSelector(selectAiError);

  const [panelOpen, setPanelOpen] = useState(false);
  const canGenerate = allowedRoles.includes(userRole);

  // Fetch previous suggestions when panel opens
  useEffect(() => {
    if (panelOpen && recordId) {
      dispatch(fetchAiSuggestions(recordId));
    }
  }, [panelOpen, recordId, dispatch]);

  const handleGenerate = async () => {
    if (!recordId || generating) return;
    dispatch(clearAiError());
    const result = await dispatch(generateAiSuggestion(recordId));
    // Only sync from server if generate succeeded but payload had no recordId
    // (cooldown-cached path). Normal path already updates Redux store.
    if (generateAiSuggestion.fulfilled.match(result) && !result.payload?.recordId) {
      dispatch(fetchAiSuggestions(recordId));
    }
  };

  return (
    <div className="rounded-2xl border border-violet-200 overflow-hidden shadow-sm">
      {/* Panel trigger bar */}
      <button
        onClick={() => setPanelOpen(v => !v)}
        className={`w-full flex items-center justify-between px-5 py-3.5 transition-all ${
          panelOpen
            ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white'
            : 'bg-gradient-to-r from-violet-50 to-purple-50 text-violet-700 hover:from-violet-100 hover:to-purple-100'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${panelOpen ? 'bg-white/20' : 'bg-violet-100'}`}>
            <Sparkles size={15} className={panelOpen ? 'text-white' : 'text-violet-600'} />
          </div>
          <div className="text-left">
            <p className={`text-xs font-black uppercase tracking-widest ${panelOpen ? 'text-white' : 'text-violet-700'}`}>
              Gemini AI Clinical Suggestions
            </p>
            {suggestions.length > 0 && (
              <p className={`text-[10px] mt-0.5 ${panelOpen ? 'text-violet-100' : 'text-violet-400'}`}>
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} on file
              </p>
            )}
          </div>
        </div>
        <span className={panelOpen ? 'text-white' : 'text-violet-400'}>
          {panelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* Panel content */}
      {panelOpen && (
        <div className="bg-[#FAFBFF] p-4 space-y-4 border-t border-violet-100">

          {/* Generate button — only for allowed roles */}
          {canGenerate && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-violet-100 px-4 py-3 shadow-sm">
              <div>
                <p className="text-xs font-bold text-[#0F1A3A]">Generate New Analysis</p>
                <p className="text-[10px] text-[#A0AECB] mt-0.5">
                  Gemini AI will analyse this ePCR and return risk level, findings &amp; recommendations.
                </p>
              </div>
              <button
                id="generate-ai-suggestion-btn"
                onClick={handleGenerate}
                disabled={generating}
                className={`ml-4 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
                  generating
                    ? 'bg-violet-100 text-violet-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:opacity-90 shadow-md shadow-violet-200 active:scale-95'
                }`}
              >
                {generating ? (
                  <><RefreshCw size={13} className="animate-spin" /> Analysing…</>
                ) : (
                  <><Zap size={13} /> Analyse</>
                )}
              </button>
            </div>
          )}

          {/* Error message */}
          {aiError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <p className="text-xs font-medium">{aiError}</p>
            </div>
          )}

          {/* Loading state */}
          {(fetching || generating) && suggestions.length === 0 && (
            <div className="py-8 text-center flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <RefreshCw size={18} className="animate-spin text-violet-600" />
              </div>
              <p className="text-xs text-[#A0AECB] font-medium animate-pulse">
                {generating ? 'Gemini is analysing the clinical record…' : 'Loading suggestions…'}
              </p>
            </div>
          )}

          {/* Suggestion list — stays visible even during background sync */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#A0AECB]">
                  Suggestion History ({suggestions.length})
                </p>
                {fetching && (
                  <span className="flex items-center gap-1 text-[10px] text-violet-400">
                    <RefreshCw size={10} className="animate-spin" /> Syncing…
                  </span>
                )}
              </div>
              {suggestions.map((s, idx) => (
                <SuggestionCard key={s.id || idx} suggestion={s} isLatest={idx === 0} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!fetching && !generating && suggestions.length === 0 && !aiError && (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mx-auto">
                <Brain size={20} className="text-violet-300" />
              </div>
              <p className="text-xs font-bold text-[#8A97B0]">No AI suggestions yet</p>
              {canGenerate ? (
                <p className="text-[10px] text-[#A0AECB]">Click "Analyse" to generate Gemini clinical insights.</p>
              ) : (
                <p className="text-[10px] text-[#A0AECB]">A Physician or Admin must generate the first analysis.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AiSuggestionPanel;
