import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectToasts, removeToast } from '../../store/slices/uiSlice';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const ICONS  = { success: CheckCircle, error: XCircle, info: Info, warning: AlertTriangle };
const STYLES = {
  success: 'border-teal-500/30 bg-teal-500/10 text-teal-300',
  error:   'border-rose-500/30 bg-rose-500/10 text-rose-300',
  info:    'border-sky-500/30 bg-sky-500/10 text-sky-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
};

const Toast = ({ toast }) => {
  const dispatch = useDispatch();
  const Icon = ICONS[toast.type] || Info;

  useEffect(() => {
    const t = setTimeout(() => dispatch(removeToast(toast.id)), toast.duration || 4000);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, dispatch]);

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm min-w-[280px] max-w-sm animate-in slide-in-from-right-4 fade-in duration-300 ${STYLES[toast.type]}`}>
      <Icon size={18} className="shrink-0 mt-0.5" />
      <p className="text-sm flex-1 leading-snug">{toast.message}</p>
      <button onClick={() => dispatch(removeToast(toast.id))} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  );
};

/**
 * Place <ToastContainer /> once in AppShell — renders all active toasts.
 */
const ToastContainer = () => {
  const toasts = useSelector(selectToasts);
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map(t => <Toast key={t.id} toast={t} />)}
    </div>
  );
};

export default ToastContainer;
