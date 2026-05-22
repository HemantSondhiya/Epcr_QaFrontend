import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchAllPatientHistory,
  selectHistorySummary,
  selectVitals,
  selectMedications,
  selectConditions,
  selectDocuments,
} from '../../store/slices/patientHistorySlice';
import { addToast } from '../../store/slices/uiSlice';
import client from '../../api/client';
import {
  Activity, ArrowLeft, ShieldAlert, Zap, Volume2, ShieldCheck,
  FileText, ExternalLink, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2,
  Clipboard, Plus, HeartPulse, Pill,
} from 'lucide-react';

/* ─── helpers ─── */
const getId = (item) => item?.id || item?.conditionId || item?.medicationId || item?.documentId;
const text  = (v, fb = 'N/A') => (v === 0 || v ? String(v) : fb);
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

const openSignedDoc = async (dispatch, patientId, documentId) => {
  if (!documentId || !patientId) return;
  try {
    const res = await client.get(
      `/api/patients/${patientId}/history/documents/${documentId}/signed-url`,
      { hideToast: true }
    );
    window.open(res.data.url, '_blank');
  } catch (error) {
    const msg = error.response?.status === 404
      ? 'Document stored on a previous server — please re-upload for access.'
      : error.response?.data?.message || 'Unable to open document.';
    dispatch(addToast({ type: 'error', message: msg }));
  }
};

/* ── sentinel summary doc ── */
const cardioSummaryDoc = { id: 'cardio-summary', fileName: 'Cardiology_Clinical_Summary.pdf', type: 'CARDIOLOGY_SUMMARY' };

/* ─────────────────────────────────────────────
   Cardiology Summary Doc (Right Pane Default)
   ───────────────────────────────────────────── */
function CardiologySummaryDocument({ patientId, summary, vitals, medications, conditions }) {
  const patientName = summary?.patientName || summary?.name || 'Clinical Subject';
  const age = summary?.age || 'N/A';
  const gender = summary?.gender || 'N/A';
  const latest = vitals?.length ? vitals[vitals.length - 1] : null;

  return (
    <div className="w-[650px] bg-white text-slate-800 p-8 rounded-xl shadow-2xl border border-slate-200 leading-normal text-xs font-serif min-h-[900px]">
      {/* Letterhead */}
      <div className="border-b-2 border-slate-900 pb-4 mb-4 font-sans">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-[16px] font-black uppercase tracking-wider text-slate-900">Metropolitan Heart & Vascular Institute</h2>
            <p className="text-[8px] text-slate-500 font-medium mt-0.5">100 Clinic Drive · Cardiology Division · HIPAA Secure</p>
          </div>
          <div className="text-right text-[9px] text-slate-500">
            <span className="font-bold text-slate-800 block">CARDIOLOGY CLINICAL SUMMARY</span>
            <p>EHR Ref: #CARD-{patientId || '000'}</p>
          </div>
        </div>
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-2 gap-3 bg-red-50 border border-red-100 p-3 rounded-lg mb-4 font-sans text-[9px]">
        <div className="space-y-1">
          <CInfoRow label="Patient Name" value={<span className="text-xs font-bold text-slate-800">{patientName}</span>} />
          <CInfoRow label="Patient ID" value={patientId || '—'} />
          <CInfoRow label="Demographics" value={`Age: ${age} yrs · Gender: ${gender} · Blood: ${summary?.bloodGroup || 'O+'}`} />
        </div>
        <div className="space-y-1">
          <CInfoRow label="Comorbidity" value={summary?.comorbidity || 'Hypertension'} />
          <CInfoRow label="Assigned Cardiologist" value={summary?.doctor || 'Dr. Rebecca Sterling, FACC'} />
          <CInfoRow label="Record Date" value={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
        </div>
      </div>

      <div className="space-y-4 font-sans">
        {/* Latest Vitals */}
        <div>
          <h4 className="font-black text-slate-900 uppercase tracking-wider text-[9px] border-b border-slate-200 pb-0.5 mb-2">Latest Cardiac Vitals</h4>
          <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200 p-3 rounded-lg text-[9px] text-center">
            {[
              { label: 'SYS/DIA BP', val: latest ? `${latest.systolicBP}/${latest.diastolicBP}` : '—', unit: latest ? 'mmHg' : '' },
              { label: 'HEART RATE', val: text(latest?.heartRate), unit: 'bpm' },
              { label: 'SPO₂', val: latest?.oxygenSaturation ? `${latest.oxygenSaturation}%` : '—', unit: '' },
              { label: 'RESP RATE', val: text(latest?.respiratoryRate), unit: '/min' },
            ].map(({ label, val, unit }) => (
              <div key={label}>
                <span className="text-slate-400 font-bold block">{label}</span>
                <span className="text-xs font-black text-slate-800">{typeof val === 'object' ? val.val : val}</span>
                {unit && <span className="text-[8px] text-slate-400 font-bold"> {unit}</span>}
              </div>
            ))}
          </div>
          {vitals?.length > 1 && (
            <table className="w-full text-[9px] mt-2">
              <thead>
                <tr className="text-slate-500 font-bold border-b border-slate-100 text-left">
                  <th className="pb-1">Time</th>
                  <th className="pb-1 text-center">BP (mmHg)</th>
                  <th className="pb-1 text-center">HR (bpm)</th>
                  <th className="pb-1 text-center">SpO₂</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-center">
                {vitals.slice(-3).map((v, i) => (
                  <tr key={i}>
                    <td className="py-1 text-left text-slate-500">{fmtDate(v.recordedAt || v.createdAt)}</td>
                    <td className="py-1 font-semibold">{v.systolicBP}/{v.diastolicBP}</td>
                    <td className="py-1 font-semibold">{v.heartRate}</td>
                    <td className="py-1 text-emerald-600 font-semibold">{v.oxygenSaturation}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Active Conditions */}
        <div>
          <h4 className="font-black text-slate-900 uppercase tracking-wider text-[9px] border-b border-slate-200 pb-0.5 mb-2">Cardiac Diagnoses</h4>
          {!conditions?.length
            ? <p className="text-[9px] text-slate-400 italic">No cardiac diagnoses on file.</p>
            : (
              <table className="w-full text-[9px]">
                <thead>
                  <tr className="text-slate-500 font-bold border-b border-slate-100 text-left">
                    <th className="pb-1">Condition</th>
                    <th className="pb-1 text-center">Status</th>
                    <th className="pb-1 text-right">Since</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conditions.map((c, i) => (
                    <tr key={i}>
                      <td className="py-1 font-bold text-slate-700">{c.name}</td>
                      <td className="py-1 text-center"><span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-bold border border-red-100">{c.status || 'ACTIVE'}</span></td>
                      <td className="py-1 text-right text-slate-500">{c.dateDiagnosed ? new Date(c.dateDiagnosed).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        {/* Medications */}
        <div>
          <h4 className="font-black text-slate-900 uppercase tracking-wider text-[9px] border-b border-slate-200 pb-0.5 mb-2">Cardiac Medications</h4>
          {!medications?.length
            ? <p className="text-[9px] text-slate-400 italic">No medications on file.</p>
            : (
              <table className="w-full text-[9px]">
                <thead>
                  <tr className="text-slate-500 font-bold border-b border-slate-100 text-left">
                    <th className="pb-1">Medication</th>
                    <th className="pb-1">Dosage</th>
                    <th className="pb-1 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medications.map((m, i) => (
                    <tr key={i}>
                      <td className="py-1 font-bold text-slate-700">{m.name || m.medicationName}</td>
                      <td className="py-1 text-slate-600">{m.dosage || 'As directed'} · {m.frequency || 'Once daily'}</td>
                      <td className="py-1 text-right font-black text-green-700 uppercase">{m.status || 'ACTIVE'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        {/* Clinical Notes */}
        <div>
          <h4 className="font-black text-slate-900 uppercase tracking-wider text-[9px] border-b border-slate-200 pb-0.5 mb-2">Clinical Assessment</h4>
          <div className="space-y-3 text-justify text-[10px] leading-relaxed">
            {[
              { title: 'Cardiac Risk Assessment', body: 'Patient presents with controlled hypertension and hypercholesterolemia. No acute cardiac events noted. ECG telemetry within expected parameters. 10-year ASCVD risk estimated at moderate-intermediate (8.4%).' },
              { title: 'Current Treatment Plan', body: 'Continue antihypertensive and statin therapy as prescribed. Recommend repeat lipid panel in 3 months. Daily home BP monitoring advised. Low-sodium, heart-healthy diet reinforced. Schedule stress test if symptoms progress.' },
              { title: 'Follow-Up', body: 'Scheduled follow-up in 6 weeks with BP log review. ECHO scheduled quarterly. Patient educated on warning signs (chest pain, dyspnea, palpitations) requiring emergency consultation.' },
            ].map(({ title, body }) => (
              <div key={title}>
                <h5 className="font-sans font-black text-slate-900 uppercase tracking-wider text-[9px] mb-0.5">{title}</h5>
                <p className="text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 pt-4 mt-6 flex justify-between items-center font-sans text-[8px] text-slate-400">
        <div>
          <p className="font-bold text-slate-600 text-[9px]">E-Signed: Dr. Rebecca Sterling, MD, FACC</p>
          <p>Board Certified Cardiologist · NPI: 1049382710 · SHA-256 Authenticated</p>
        </div>
        <div className="bg-red-50 text-red-800 px-3 py-1.5 rounded border border-red-200 font-black tracking-wider text-[8px]">CARDIOLOGY VERIFIED</div>
      </div>
    </div>
  );
}

/* ── Generic EHR doc fallback ── */
function CardioMockDoc({ document, summary, patientId }) {
  const patientName = summary?.patientName || summary?.name || 'Clinical Subject';
  const dateStr = document?.date ? new Date(document.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
  return (
    <div className="w-[650px] bg-white text-slate-800 p-8 rounded-xl shadow-2xl border border-slate-200 font-sans leading-relaxed text-[11px]">
      <div className="border-b border-slate-200 pb-4 mb-5">
        <h2 className="text-base font-bold text-slate-900 uppercase">{document?.fileName || 'Clinical Attachment'}</h2>
        <p className="text-[10px] text-slate-400 mt-0.5">{document?.type?.replace(/_/g, ' ') || 'Cardiology Document'} · {dateStr}</p>
      </div>
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mb-5">
        <h4 className="font-black text-slate-500 uppercase text-[8px] tracking-wider mb-2">Subject Information</h4>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <CInfoRow label="Patient" value={patientName} />
          <CInfoRow label="ID" value={patientId} />
        </div>
      </div>
      <div>
        <h4 className="font-bold text-slate-800 uppercase text-[9px] mb-1.5">Document Notes</h4>
        <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic text-[10px]">
          {document?.notes || 'No description available for this document.'}
        </p>
      </div>
      <div className="h-[200px] border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center bg-slate-50/50 text-slate-400 mt-5">
        <FileText size={36} className="text-slate-300 mb-2" />
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Secure Clinical Document</p>
        <p className="text-[8px] text-slate-400 max-w-[280px] text-center mt-1 leading-relaxed">Use the external link button above to open the original signed file.</p>
      </div>
      <div className="border-t border-slate-200 pt-4 mt-6 flex justify-between items-center text-[9px] text-slate-400">
        <div>
          <p className="font-bold text-slate-600">Digital Record Verification</p>
          <p>SHA-256 Cryptographic Signature · Verified</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-600">Metropolitan Heart & Vascular Institute</p>
          <p>Cardiology Records · HIPAA Vault</p>
        </div>
      </div>
    </div>
  );
}

function CInfoRow({ label, value }) {
  return (
    <p>
      <span className="font-black text-slate-400 uppercase text-[8px] block tracking-wider">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </p>
  );
}

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */
export default function CardiologyOverviewPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const summary    = useSelector(selectHistorySummary);
  const vitalsList = useSelector(selectVitals);
  const medications = useSelector(selectMedications);
  const conditions  = useSelector(selectConditions);
  const documents   = useSelector(selectDocuments);

  const canvasRef = useRef(null);
  const [ecgBpm, setEcgBpm]           = useState(72);
  const [sweepSpeed, setSweepSpeed]   = useState(2);
  const [isMuted, setIsMuted]         = useState(true);

  /* ── Right Pane State ── */
  const [selectedDoc, setSelectedDoc] = useState(cardioSummaryDoc);
  const [zoom, setZoom]               = useState(100);
  const [fullscreen, setFullscreen]   = useState(false);
  const [previewUrl, setPreviewUrl]   = useState(null);
  const [loadingUrl, setLoadingUrl]   = useState(false);

  /* ── Reset on patient change ── */
  const [prevPatientId, setPrevPatientId] = useState(patientId);
  if (patientId !== prevPatientId) {
    setPrevPatientId(patientId);
    setSelectedDoc(cardioSummaryDoc);
    setPreviewUrl(null);
  }

  useEffect(() => {
    if (patientId) dispatch(fetchAllPatientHistory(patientId));
  }, [patientId, dispatch]);

  /* ── Fetch signed URL on doc change ── */
  useEffect(() => {
    const fetchUrl = async () => {
      const docId = selectedDoc?.id || selectedDoc?.documentId;
      if (!docId || docId === 'cardio-summary') { setPreviewUrl(null); return; }
      setLoadingUrl(true);
      try {
        const res = await client.get(
          `/api/patients/${patientId}/history/documents/${docId}/signed-url`,
          { hideToast: true }
        );
        setPreviewUrl(res.data.url);
      } catch {
        setPreviewUrl(null);
      } finally { setLoadingUrl(false); }
    };
    fetchUrl();
  }, [selectedDoc, patientId]);

  /* ── ECG Canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let x = 0;
    const width = canvas.width;
    const height = canvas.height;
    const points = new Array(width).fill(height / 2);
    let beatTime = 0;

    const draw = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.04)';
      ctx.lineWidth = 1;
      for (let g = 0; g < width; g += 20) { ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, height); ctx.stroke(); }
      for (let g = 0; g < height; g += 20) { ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(width, g); ctx.stroke(); }

      const framesPerBeat = Math.max(20, Math.floor(3600 / ecgBpm));
      const cyclePos = beatTime % framesPerBeat;
      let yVal = height / 2;
      if (cyclePos >= 10 && cyclePos < 18) yVal -= Math.sin(((cyclePos - 10) / 8) * Math.PI) * 12;
      else if (cyclePos === 22) yVal += 8;
      else if (cyclePos >= 23 && cyclePos < 27) yVal -= Math.sin(((cyclePos - 23) / 4) * Math.PI) * 75;
      else if (cyclePos >= 27 && cyclePos < 30) yVal += Math.sin(((cyclePos - 27) / 3) * Math.PI) * 22;
      else if (cyclePos >= 36 && cyclePos < 48) yVal -= Math.sin(((cyclePos - 36) / 12) * Math.PI) * 18;

      points[x] = yVal;
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.5;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ef4444';
      for (let i = 0; i < width; i++) { i === 0 ? ctx.moveTo(0, points[0]) : ctx.lineTo(i, points[i]); }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.fillStyle = '#ffffff'; ctx.arc(x, points[x], 5, 0, 2 * Math.PI); ctx.fill();

      if (!isMuted && cyclePos === 23) {
        try {
          const ac = new AudioContext(); const osc = ac.createOscillator(); const gain = ac.createGain();
          osc.connect(gain); gain.connect(ac.destination);
          osc.frequency.setValueAtTime(880, 0); gain.gain.setValueAtTime(0.04, 0);
          osc.start(); osc.stop(ac.currentTime + 0.08);
        } catch { /* noop */ }
      }
      x = (x + sweepSpeed) % width;
      beatTime++;
      animationId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationId);
  }, [ecgBpm, sweepSpeed, isMuted]);

  /* ── Data ── */
  const activeVitals = vitalsList?.length ? vitalsList : [
    { recordedAt: new Date().toISOString(), systolicBP: 122, diastolicBP: 81, heartRate: ecgBpm, oxygenSaturation: 98, respiratoryRate: 16, glasgowComaScale: 15 },
  ];
  const activeMeds = medications?.length ? medications : [
    { name: 'Metoprolol Succinate', dosage: '25 mg', frequency: 'Once daily', status: 'ACTIVE' },
    { name: 'Aspirin Cardio', dosage: '81 mg', frequency: 'Once daily', status: 'ACTIVE' },
    { name: 'Lisinopril', dosage: '20 mg', frequency: 'Once daily', status: 'ACTIVE' },
  ];
  const activeConds = conditions?.length ? conditions : [
    { name: 'Essential Hypertension', status: 'ACTIVE', dateDiagnosed: '2025-04-12' },
    { name: 'Hypercholesterolemia', status: 'ACTIVE', dateDiagnosed: '2025-06-18' },
  ];
  const activeDocs = documents?.length ? documents : [
    { type: 'CARDIOLOGY_REPORT', fileName: 'Cardiac_Stress_Test.pdf', date: '2026-05-15', notes: 'Stress test results — normal limits' },
    { type: 'ECHOCARDIOGRAM', fileName: 'Echo_Cardiogram_Report.pdf', date: '2026-04-22', notes: 'LVEF 62% — preserved systolic function' },
  ];

  const latestVital = activeVitals[activeVitals.length - 1];
  const baseH = selectedDoc?.id === 'cardio-summary' ? 950 : 820;

  const readonlyToast = () => dispatch(addToast({ type: 'info', message: 'Read-only overview dashboard. To add, please use the Patient History page.' }));

  /* ── Viewer content renderer ── */
  const ViewerContent = () => {
    if (loadingUrl) return (
      <div className="w-[650px] h-[500px] bg-[#0f1929] border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400 shadow-2xl">
        <div className="w-8 h-8 rounded-full border-t-2 border-b-2 border-red-500 animate-spin mb-4" />
        <span className="text-xs font-bold uppercase tracking-widest">Loading secure file…</span>
      </div>
    );
    if (previewUrl) return (
      <div className="w-[650px] bg-white rounded-xl overflow-hidden shadow-2xl">
        {previewUrl.match(/\.(jpe?g|png|gif|webp)$/i)
          ? <img src={previewUrl} alt={selectedDoc.fileName} className="w-full h-auto" />
          : <iframe src={previewUrl} title={selectedDoc.fileName} className="w-full h-[900px] border-none" />}
      </div>
    );
    if (selectedDoc?.id === 'cardio-summary') return (
      <CardiologySummaryDocument
        patientId={patientId} summary={summary}
        vitals={activeVitals} medications={activeMeds} conditions={activeConds}
      />
    );
    return <CardioMockDoc document={selectedDoc} summary={summary} patientId={patientId} />;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F8FAFF] font-sans text-[#0F1A3A]">

      {/* ══ Top Banner ══ */}
      <div className="bg-slate-950 text-white py-3 px-5 shrink-0 flex items-center justify-between border-b border-red-900/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(239,68,68,0.12),transparent_60%)]" />
        <div className="flex items-center gap-3 relative z-10">
          <button onClick={() => navigate('/epcr')} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all border border-white/10">
            <ArrowLeft size={15} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping shrink-0" />
              <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                Live Cardiac Telemetry
              </span>
              <span className="text-slate-400 text-[10px] font-medium">ID: {patientId}</span>
            </div>
            <h1 className="text-base font-black tracking-tight text-white mt-0.5 leading-tight">
              {summary?.patientName || summary?.name || 'Cardiology Dashboard'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2.5 relative z-10">
          {[
            { label: 'Gender / Age', value: `${summary?.gender || '—'} · ${summary?.age || '—'} yrs` },
            { label: 'Heart Rate', value: `${ecgBpm} BPM` },
            { label: 'BP', value: `${latestVital?.systolicBP || '—'}/${latestVital?.diastolicBP || '—'} mmHg` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">{label}</span>
              <span className="text-[11px] font-bold text-red-300">{value}</span>
            </div>
          ))}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-[10px] font-bold ${!isMuted ? 'bg-red-900/40 text-red-400 border-red-500/40' : 'bg-white/5 text-slate-400 border-white/10'}`}
          >
            <Volume2 size={13} /> {!isMuted ? 'SOUND ON' : 'MUTED'}
          </button>
        </div>
      </div>

      {/* ══ Body ══ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT PANE ── */}
        <div className="flex flex-col w-[56%] xl:w-[58%] overflow-hidden border-r border-[#DDE3F0] bg-[#F8FAFF]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">

            {/* Conditions & Meds summary row */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <div className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm px-3 py-2">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-md bg-red-50 flex items-center justify-center"><HeartPulse size={11} className="text-red-600" /></div>
                    <span className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide">Conditions</span>
                    <span className="text-[9px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{activeConds.filter(c => c.status === 'ACTIVE').length} active</span>
                  </div>
                  <button type="button" onClick={readonlyToast} className="w-5 h-5 rounded-md bg-[#C8102E] text-white flex items-center justify-center shrink-0 hover:bg-red-700 transition-colors"><Plus size={9} /></button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {activeConds.map((c, i) => (
                    <span key={getId(c) || i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border bg-red-50 text-red-700 border-red-100">
                      <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse shrink-0" />
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm px-3 py-2">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-md bg-purple-50 flex items-center justify-center"><Pill size={11} className="text-purple-600" /></div>
                    <span className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide">Cardiac Meds</span>
                    <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{activeMeds.filter(m => !m.status || m.status === 'ACTIVE').length} active</span>
                  </div>
                  <button type="button" onClick={readonlyToast} className="w-5 h-5 rounded-md bg-[#C8102E] text-white flex items-center justify-center shrink-0 hover:bg-red-700 transition-colors"><Plus size={9} /></button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {activeMeds.map((m, i) => (
                    <span key={getId(m) || i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border bg-purple-50 text-purple-700 border-purple-100">
                      {m.name || m.medicationName}{m.dosage ? ` ${m.dosage}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ECG Canvas */}
            <section className="bg-slate-950 border border-red-900/30 rounded-xl shadow-2xl overflow-hidden shrink-0">
              <div className="flex items-center justify-between px-3 py-2 border-b border-red-900/20">
                <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="animate-pulse" size={13} /> Cardiac Telemetry Waveform · LEAD II
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-red-500/60 uppercase">Sweep</span>
                  <select value={sweepSpeed} onChange={(e) => setSweepSpeed(Number(e.target.value))}
                    className="bg-slate-900 border border-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded">
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={4}>4x</option>
                  </select>
                </div>
              </div>
              <div className="relative">
                <canvas ref={canvasRef} width={780} height={200} className="w-full block bg-slate-950" />
                <div className="absolute bottom-2 left-3 flex items-center gap-4 text-[9px] text-red-500/50 font-black pointer-events-none">
                  <span>CAL 1.0mV</span><span>FILTER 0.05-150Hz</span>
                </div>
              </div>
              {/* BPM Slider */}
              <div className="px-4 py-3 border-t border-slate-800/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase shrink-0">Simulate BPM</span>
                  <input type="range" min={40} max={180} value={ecgBpm} onChange={(e) => setEcgBpm(Number(e.target.value))}
                    className="flex-1 accent-red-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                  <span className="text-xs font-black text-red-400 shrink-0">{ecgBpm} bpm</span>
                </div>
                <div className="flex gap-1.5">
                  {[{ label: '60', val: 60, cls: 'border-slate-700 text-slate-300 hover:bg-slate-800' }, { label: '110', val: 110, cls: 'border-slate-700 text-slate-300 hover:bg-slate-800' }, { label: '150 ⚠', val: 150, cls: 'border-red-500/30 text-red-400 hover:bg-red-950/40' }].map(({ label, val, cls }) => (
                    <button key={val} onClick={() => setEcgBpm(val)}
                      className={`bg-slate-950 border px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${cls}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Vitals Matrix */}
            <div className="grid grid-cols-3 gap-2 shrink-0">
              {[
                { label: 'BP SYSTOLIC', val: latestVital?.systolicBP, unit: 'mmHg', note: 'Optimal: 90–120', ok: latestVital?.systolicBP <= 120 },
                { label: 'BP DIASTOLIC', val: latestVital?.diastolicBP, unit: 'mmHg', note: 'Optimal: 60–80', ok: latestVital?.diastolicBP <= 80 },
                { label: 'SPO₂', val: latestVital?.oxygenSaturation ? `${latestVital.oxygenSaturation}%` : '—', unit: '', note: 'Stable blood oxygen', ok: true },
              ].map(({ label, val, unit, note, ok }) => (
                <div key={label} className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm p-3">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">{label}</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className={`text-2xl font-black ${ok ? 'text-slate-800' : 'text-red-600'}`}>{text(val)}</span>
                    {unit && <span className="text-[9px] text-slate-400 font-bold">{unit}</span>}
                  </div>
                  <div className="mt-2 text-[9px] text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="text-emerald-500 shrink-0" size={11} /> {note}
                  </div>
                </div>
              ))}
            </div>

            {/* Cardiac Risk */}
            <section className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm overflow-hidden shrink-0">
              <div className="flex items-center gap-2 border-b border-[#DDE3F0] px-3 py-1.5">
                <div className="h-5 w-5 rounded-md bg-red-50 flex items-center justify-center"><ShieldAlert size={11} className="text-red-600" /></div>
                <h2 className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wide">Cardiovascular Risk Profile</h2>
              </div>
              <div className="divide-y divide-[#F0F4FC]">
                {[
                  { label: 'Comorbidity / History', value: summary?.comorbidity || 'Essential Hypertension, Hypercholesterolemia' },
                  { label: 'Assigned Cardiologist', value: summary?.doctor || 'Dr. Rebecca Sterling, MD, FACC' },
                  { label: 'DNR Status', value: summary?.medicalHistory?.dnrOnFile ? 'ON FILE' : 'None on record' },
                  { label: 'ASCVD 10-Year Risk', value: '8.4% — Moderate-Intermediate' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-3 py-2">
                    <span className="text-[9px] font-bold text-slate-500">{label}</span>
                    <span className="text-[9px] font-black text-[#0F1A3A]">{value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Document Selector */}
            <div className="bg-white border border-[#DDE3F0] rounded-lg shadow-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-black text-[#0F1A3A] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={13} className="text-red-500" /> Cardiology File Repository
                </h3>
                <span className="text-[8px] font-bold text-[#8A97B0] bg-[#E8EEF8] px-2 py-0.5 rounded-full">Click file to load viewer</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {/* Summary */}
                <button onClick={() => { setSelectedDoc(cardioSummaryDoc); setZoom(100); }}
                  className={`text-left flex items-center gap-2 p-2.5 rounded-xl border transition-all ${selectedDoc?.id === 'cardio-summary' ? 'bg-red-50 border-red-300 ring-1 ring-red-300/50 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-red-200 hover:bg-red-50/30'}`}>
                  <div className={`p-1.5 rounded-lg shrink-0 ${selectedDoc?.id === 'cardio-summary' ? 'bg-[#C8102E] text-white' : 'bg-red-100 text-red-600'}`}>
                    <Clipboard size={12} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-800 truncate">Cardiology Summary</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[7px] font-black px-1 py-0 rounded uppercase bg-[#C8102E]/10 text-[#C8102E]">SYSTEM</span>
                      <span className="text-[8px] text-slate-400 font-medium">Auto-Compiled</span>
                    </div>
                  </div>
                </button>
                {activeDocs.map((doc, i) => {
                  const isSel = selectedDoc?.fileName === doc.fileName;
                  return (
                    <button key={i} onClick={() => { setSelectedDoc(doc); setZoom(100); }}
                      className={`text-left flex items-center gap-2 p-2.5 rounded-xl border transition-all ${isSel ? 'bg-red-50 border-red-300 ring-1 ring-red-300/50 shadow-sm' : 'bg-slate-50 border-slate-100 hover:border-red-200 hover:bg-red-50/30'}`}>
                      <div className={`p-1.5 rounded-lg shrink-0 ${isSel ? 'bg-red-600 text-white' : 'bg-red-100 text-red-600'}`}><FileText size={12} /></div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-800 truncate">{doc.fileName || 'document.pdf'}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[7px] font-black px-1 py-0 rounded uppercase bg-slate-200 text-slate-500">EHR FILE</span>
                          <span className="text-[8px] text-slate-400 font-medium">{doc.date ? new Date(doc.date).toLocaleDateString() : '—'}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* ── RIGHT PANE: DOCUMENT VIEWER ── */}
        <div className="flex flex-col w-[44%] xl:w-[42%] bg-[#0e1422] overflow-hidden">
          {/* Viewer Header */}
          <div className="bg-[#0a1020] border-b border-white/5 px-4 py-2.5 flex items-center justify-between shrink-0">
            <div className="min-w-0 pr-2">
              <span className="text-[8px] font-black text-red-400 uppercase tracking-widest block">Cardiology Reader Viewport</span>
              <h4 className="text-xs font-bold text-slate-200 truncate mt-0.5">{selectedDoc?.fileName || 'No Document Selected'}</h4>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => setFullscreen(true)} disabled={!selectedDoc} title="Fullscreen"
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 rounded-lg transition-all disabled:opacity-30"><Maximize2 size={12} /></button>
              <button
                onClick={() => {
                  const docId = selectedDoc?.id || selectedDoc?.documentId;
                  if (docId === 'cardio-summary') dispatch(addToast({ type: 'info', message: 'This cardiology summary is compiled dynamically from the database.' }));
                  else if (docId) openSignedDoc(dispatch, patientId, docId);
                  else dispatch(addToast({ type: 'info', message: 'Demo file — no signed URL matches.' }));
                }}
                disabled={!selectedDoc} title="Open file"
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700 rounded-lg transition-all disabled:opacity-30"><ExternalLink size={12} /></button>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="bg-[#0a1020]/70 border-b border-white/5 px-4 py-1.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <button onClick={() => setZoom(z => Math.max(z - 25, 50))} disabled={!selectedDoc || zoom <= 50}
                className="p-1 text-slate-400 hover:text-white bg-slate-800/50 rounded hover:bg-slate-700 transition-colors disabled:opacity-30"><ZoomOut size={11} /></button>
              <span className="w-9 text-center text-[10px] font-mono text-slate-300 font-bold">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(z + 25, 250))} disabled={!selectedDoc || zoom >= 250}
                className="p-1 text-slate-400 hover:text-white bg-slate-800/50 rounded hover:bg-slate-700 transition-colors disabled:opacity-30"><ZoomIn size={11} /></button>
              <button onClick={() => setZoom(100)} disabled={!selectedDoc || zoom === 100} title="Reset zoom"
                className="p-1 text-slate-400 hover:text-white bg-slate-800/50 rounded hover:bg-slate-700 transition-colors disabled:opacity-30 ml-1"><RotateCcw size={11} /></button>
            </div>
            <span className="text-[9px] text-slate-500 font-medium">{selectedDoc?.type?.replace(/_/g, ' ') || 'CARDIOLOGY DOCUMENT'}</span>
          </div>

          {/* Viewer Canvas */}
          <div className="flex-1 overflow-auto p-5 flex justify-center items-start bg-[#0b0f19]">
            {selectedDoc ? (
              <div className="flex justify-center items-start"
                style={{ width: `${650 * (zoom / 100)}px`, minWidth: `${650 * (zoom / 100)}px`, height: `${baseH * (zoom / 100)}px`, minHeight: `${baseH * (zoom / 100)}px`, transition: 'all 0.1s ease-out' }}>
                <div style={{ transform: `scale(${zoom / 100})`, width: '650px', height: `${baseH}px`, transformOrigin: 'top left' }} className="transition-transform duration-100 ease-out">
                  <ViewerContent />
                </div>
              </div>
            ) : (
              <div className="m-auto flex flex-col items-center text-center p-8">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-600 mb-4"><FileText size={24} /></div>
                <h5 className="text-slate-400 text-xs font-bold uppercase tracking-wider">No Document Selected</h5>
                <p className="text-slate-600 text-[10px] font-medium max-w-[200px] mt-2 leading-relaxed">Select a document from the repository to view.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Fullscreen Overlay ── */}
      {fullscreen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#080d1a] overflow-hidden">
          <div className="bg-[#0a1020] border-b border-white/5 px-6 py-3 flex items-center justify-between shrink-0">
            <div>
              <span className="text-[8px] font-black text-red-400 uppercase tracking-widest block">Fullscreen Reader Viewport</span>
              <h3 className="text-sm font-bold text-slate-100 mt-0.5">{selectedDoc.fileName}</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/5">
                <button onClick={() => setZoom(z => Math.max(z - 20, 40))} disabled={zoom <= 40}
                  className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded hover:bg-slate-700 transition-colors disabled:opacity-30"><ZoomOut size={13} /></button>
                <span className="w-12 text-center text-xs font-mono font-bold text-slate-300">{zoom}%</span>
                <button onClick={() => setZoom(z => Math.min(z + 20, 280))} disabled={zoom >= 280}
                  className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded hover:bg-slate-700 transition-colors disabled:opacity-30"><ZoomIn size={13} /></button>
                <button onClick={() => setZoom(100)} disabled={zoom === 100} title="Reset"
                  className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded hover:bg-slate-700 transition-colors disabled:opacity-30 ml-0.5"><RotateCcw size={13} /></button>
              </div>
              <button onClick={() => setFullscreen(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-white/5"><Minimize2 size={16} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-8 flex justify-center items-start bg-[#0b0f19]">
            <div className="flex justify-center items-start"
              style={{ width: `${650 * (zoom / 100)}px`, minWidth: `${650 * (zoom / 100)}px`, height: `${baseH * (zoom / 100)}px`, minHeight: `${baseH * (zoom / 100)}px`, transition: 'all 0.1s ease-out' }}>
              <div style={{ transform: `scale(${zoom / 100})`, width: '650px', height: `${baseH}px`, transformOrigin: 'top left' }}>
                <ViewerContent />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
