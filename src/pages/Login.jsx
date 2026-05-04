import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginSuccess } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import client from '../api/client';
import { Mail, Lock, Eye, EyeOff, Zap } from 'lucide-react';
import { DEMO_CREDENTIALS } from '../constants/permissions';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await client.post('/api/auth/login', { email, password });
      const { token, userId, role, organizationId } = res.data;
      dispatch(loginSuccess({
        token,
        user: { id: userId, userId, email, role, organizationId },
      }));
      dispatch(addToast({ type: 'success', message: `Logged in as ${role}` }));
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (cred) => { setEmail(cred.email); setPassword(cred.password); };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] p-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/8 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sky-500/8 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[440px] space-y-5">
        {/* Logo */}
        <div className="text-center mb-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center shadow-[0_0_40px_rgba(45,212,191,0.3)] mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">MedEPCR</h1>
          <p className="text-slate-400 text-sm mt-1">ePCR + QA/QI Platform</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-7 rounded-2xl">
          <h2 className="text-lg font-semibold text-white mb-5">Sign In</h2>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 placeholder-slate-600"
                  placeholder="you@example.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-9 pr-10 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 placeholder-slate-600"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-900 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(45,212,191,0.25)] hover:shadow-[0_0_30px_rgba(45,212,191,0.4)] hover:-translate-y-0.5">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

        </div>

        {/* Demo Credentials Quick-Fill */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex flex-col gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-amber-400" />
              <span className="text-xs font-medium text-slate-300">Demo Credentials (click to fill)</span>
            </div>
            <p className="text-[11px] text-slate-500">Start the app with the dev profile so the initializer populates these demo users.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_CREDENTIALS.map(c => (
              <button key={c.email} onClick={() => fillDemo(c)}
                className="text-left px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-teal-500/30 hover:bg-teal-500/5 transition-all group">
                <p className="text-xs font-semibold text-teal-400 group-hover:text-teal-300">{c.role}</p>
                <p className="text-[10px] text-slate-500 truncate">{c.email}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
