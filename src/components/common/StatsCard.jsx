/**
 * StatsCard — reusable metric card for dashboards.
 *
 * Props:
 *   icon      — Lucide icon element
 *   label     — metric label
 *   value     — metric value (string | number)
 *   sub       — optional subtitle / trend
 *   trend     — 'up' | 'down' | null
 *   color     — 'teal' | 'sky' | 'purple' | 'amber' | 'rose'
 *   loading   — shows skeleton if true
 */
const COLORS = {
  teal:   'text-teal-400   bg-teal-500/10   border-teal-500/20',
  sky:    'text-sky-400    bg-sky-500/10    border-sky-500/20',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  amber:  'text-amber-400  bg-amber-500/10  border-amber-500/20',
  rose:   'text-rose-400   bg-rose-500/10   border-rose-500/20',
  indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
};

const StatsCard = ({ icon, label, value, sub, color = 'teal', loading = false }) => {
  const cls = COLORS[color] || COLORS.teal;

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-5 animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-slate-700 mb-4" />
        <div className="h-8 w-20 bg-slate-700 rounded mb-2" />
        <div className="h-3 w-28 bg-slate-800 rounded" />
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 hover-glow transition-all group">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 shrink-0 ${cls}`}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-white tabular-nums">{value ?? '—'}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
};

export default StatsCard;
