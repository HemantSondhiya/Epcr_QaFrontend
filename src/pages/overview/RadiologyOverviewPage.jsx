import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchAllPatientHistory, selectHistorySummary } from '../../store/slices/patientHistorySlice';
import { 
  ArrowLeft, Contrast, ZoomIn, 
  Activity, Sparkles, FileText, CheckCircle
} from 'lucide-react';

export default function RadiologyOverviewPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const summary = useSelector(selectHistorySummary);

  const canvasRef = useRef(null);
  const [sliceIndex, setSliceIndex] = useState(7); // default middle slice
  const [isInverted, setIsInverted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [calipers, setCalipers] = useState([]); // Array of {x, y} coordinates for calipers
  const [isMeasuring, setIsMeasuring] = useState(false);

  useEffect(() => {
    if (patientId) {
      dispatch(fetchAllPatientHistory(patientId));
    }
  }, [patientId, dispatch]);

  // Draw simulated cross-sectional MRI Brain/CT Scan slices on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = isInverted ? '#ffffff' : '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Draw reference coordinate markers
    ctx.strokeStyle = isInverted ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Redraw scan slice structure based on sliceIndex
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);

    // Center circular skull boundary (glows)
    const baseRadius = 85 + (sliceIndex * 1.5);
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = isInverted ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Internal simulated Brain ventricles & matter
    // We adjust the coordinates slightly with sliceIndex to simulate depth!
    const sliceFactor = (sliceIndex - 7) * 4;

    ctx.beginPath();
    ctx.arc(-20 - sliceFactor/2, -10, 25 - Math.abs(sliceFactor), 0, 2 * Math.PI);
    ctx.arc(20 + sliceFactor/2, -10, 25 - Math.abs(sliceFactor), 0, 2 * Math.PI);
    ctx.fillStyle = isInverted ? '#cccccc' : '#1e293b';
    ctx.fill();

    // Simulated Ventricle inner core (dark/light contrast)
    ctx.beginPath();
    ctx.arc(-22 - sliceFactor/2, -12, 10 - Math.abs(sliceFactor)/2, 0, 2 * Math.PI);
    ctx.arc(22 + sliceFactor/2, -12, 10 - Math.abs(sliceFactor)/2, 0, 2 * Math.PI);
    ctx.fillStyle = isInverted ? '#999999' : '#0f172a';
    ctx.fill();

    // Simulated lesion / contrast area (clinical highlight!)
    ctx.beginPath();
    ctx.arc(25, 30 + sliceFactor, 12, 0, 2 * Math.PI);
    ctx.fillStyle = isInverted ? '#000000' : '#ffffff';
    ctx.shadowBlur = isInverted ? 0 : 15;
    ctx.shadowColor = '#ffffff';
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Brain cortex ridges/matter folding (detailed abstract strokes)
    ctx.strokeStyle = isInverted ? '#666666' : '#475569';
    ctx.lineWidth = 2;
    for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
      const radiusStart = baseRadius - 10;
      const radiusEnd = baseRadius - 30 - (Math.sin(angle * 6 + sliceIndex) * 12);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * radiusStart, Math.sin(angle) * radiusStart);
      ctx.lineTo(Math.cos(angle) * radiusEnd, Math.sin(angle) * radiusEnd);
      ctx.stroke();
    }

    ctx.restore();

    // Draw placed Caliper measurement lines
    if (calipers.length > 0) {
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      
      // Draw first point
      ctx.beginPath();
      ctx.arc(calipers[0].x, calipers[0].y, 3, 0, 2 * Math.PI);
      ctx.fill();

      if (calipers.length === 2) {
        // Draw caliper connector line
        ctx.beginPath();
        ctx.moveTo(calipers[0].x, calipers[0].y);
        ctx.lineTo(calipers[1].x, calipers[1].y);
        ctx.stroke();

        // Draw second point
        ctx.beginPath();
        ctx.arc(calipers[1].x, calipers[1].y, 3, 0, 2 * Math.PI);
        ctx.fill();

        // Draw caliper cross ticks
        const dx = calipers[1].x - calipers[0].x;
        const dy = calipers[1].y - calipers[0].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Output clinical measurement text inside viewer overlay
        const mmDist = (dist * 0.14).toFixed(1); // 0.14 mm/pixel scale
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${mmDist} mm`, (calipers[0].x + calipers[1].x)/2 + 8, (calipers[0].y + calipers[1].y)/2 - 8);
      }
    }

  }, [sliceIndex, isInverted, zoom, calipers]);

  const handleCanvasClick = (e) => {
    if (!isMeasuring) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (calipers.length >= 2) {
      // Reset calipers and start a new measurement
      setCalipers([{ x, y }]);
    } else {
      setCalipers([...calipers, { x, y }]);
    }
  };

  const clearCalipers = () => {
    setCalipers([]);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-16 animate-fade-in font-sans selection:bg-amber-500/30">
      
      {/* Premium PACS Bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-xl px-8 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/epcr')} 
              className="p-3 bg-zinc-850 hover:bg-zinc-800 rounded-2xl transition-all border border-zinc-800 text-zinc-400"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <span className="bg-zinc-800 text-amber-500 border border-amber-500/25 px-3 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                PACS WORKSTATION
              </span>
              <h1 className="text-xl font-black text-white mt-0.5">
                {summary?.patientName || summary?.name || 'Radiology Station'}
              </h1>
              <p className="text-zinc-400 text-xs mt-0.5">
                Modality: CT/MRI • Protocol: Brain Scan Contrast • Patient ID: {patientId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-zinc-800 px-3 py-1.5 rounded-lg text-xs font-black text-zinc-400">
              SLICE: <span className="text-amber-500">{sliceIndex}/15</span>
            </span>
            <span className="bg-zinc-800 px-3 py-1.5 rounded-lg text-xs font-black text-zinc-400">
              ZOOM: <span className="text-amber-500">{Math.round(zoom * 100)}%</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Medical DICOM-like Image Viewer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative">
            
            {/* Control Bar inside viewer */}
            <div className="flex items-center justify-between gap-4 mb-4 border-b border-zinc-800 pb-3">
              <span className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" /> Active Diagnostic Canvas
              </span>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsInverted(!isInverted)} 
                  className={`p-2 rounded-lg transition-colors border ${isInverted ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'}`}
                  title="Invert Contrast"
                >
                  <Contrast size={15} />
                </button>
                <button 
                  onClick={() => setZoom(z => z === 1 ? 1.4 : 1)}
                  className={`p-2 rounded-lg transition-colors border ${zoom > 1 ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'}`}
                  title="Zoom Image"
                >
                  <ZoomIn size={15} />
                </button>
                <button 
                  onClick={() => { setIsMeasuring(!isMeasuring); clearCalipers(); }} 
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isMeasuring ? 'bg-amber-500 text-black border-amber-500' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'}`}
                >
                  {isMeasuring ? 'Exit Caliper Mode' : 'Measure Calipers'}
                </button>
              </div>
            </div>

            {/* Simulated viewport screen */}
            <div className="bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-850 relative flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                width={520}
                height={380}
                onClick={handleCanvasClick}
                className={`max-w-full block transition-transform rounded-xl cursor-crosshair`}
              />
              
              {/* Measurement helper text */}
              {isMeasuring && calipers.length < 2 && (
                <div className="absolute top-4 left-4 bg-amber-500/10 text-amber-500 border border-amber-500/25 px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-md">
                  {calipers.length === 0 ? 'Click first caliper point' : 'Click second endpoint'}
                </div>
              )}
            </div>

            {/* Slice Scrolling Slider */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                <span>Sagittal cross-section slider</span>
                <span className="text-amber-500">Slide to scroll CT deck</span>
              </div>
              <input 
                type="range" 
                min={0} 
                max={15} 
                value={sliceIndex} 
                onChange={(e) => setSliceIndex(Number(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-zinc-850 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Radiologist Diagnostic findings */}
        <div className="space-y-6 lg:col-span-1">
          {/* Findings card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 mb-2">
              <Activity size={16} /> Diagnostic Radiology Findings
            </h3>
            
            <div className="space-y-3">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">CLINICAL OBSERVATION</span>
                <p className="text-xs font-bold text-zinc-200 leading-relaxed">
                  Right hemisphere showing distinct structural hyper-intensity at coordinate matrix (slice 7-11) measuring approximately 12mm. Mild localized edema is noted surrounding the primary lesion.
                </p>
              </div>

              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-1">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">RECOMMENDATIONS</span>
                <p className="text-xs font-bold text-zinc-200 leading-relaxed">
                  Recommend secondary High-Resolution Contrast Enhanced MRI for confirmation and tumor perimeter mapping. Urgent neuro-surgical referral is advised.
                </p>
              </div>
            </div>
          </div>

          {/* Imaging Patient Metadata */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 mb-2">
              <FileText size={16} /> Modality Record
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="font-bold text-zinc-500">Technician ID</span>
                <span className="font-black text-zinc-200">#TECH-901</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="font-bold text-zinc-500">Scan Status</span>
                <span className="font-black text-emerald-400 uppercase flex items-center gap-1">
                  <CheckCircle size={12} /> VERIFIED
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
