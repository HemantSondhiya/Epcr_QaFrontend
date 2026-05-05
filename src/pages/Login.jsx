import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginSuccess, checkAuth } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import client from '../api/client';
import { Mail, Lock, Eye, EyeOff, Zap, User, Key } from 'lucide-react';
import { DEMO_CREDENTIALS } from '../constants/permissions';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('STAFF'); // 'STAFF' or 'PATIENT'

  // Staff Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Patient Form
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {}, []);

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await client.post('/api/auth/login', { email, password });
      const { userId, role, organizationId, accessToken, refreshToken, token, firstName, lastName } = res.data;
      const finalAccessToken = accessToken || token;
      
      localStorage.setItem('authMode', 'STAFF');

      dispatch(loginSuccess({
        user: { id: userId, userId, email, firstName, lastName, role, organizationId, accessToken: finalAccessToken, refreshToken, ...res.data },
      }));

      dispatch(checkAuth());
      dispatch(addToast({ type: 'success', message: `Welcome${firstName ? ', ' + firstName : ''}! Logged in as ${role}` }));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await client.post('/api/patient/auth/login', { identifier, otp });
      const { patientId, token, accessToken, refreshToken } = res.data;
      const finalAccessToken = accessToken || token;
      
      localStorage.setItem('authMode', 'PATIENT');

      dispatch(loginSuccess({
        user: { id: patientId, patientId, identifier, role: 'PATIENT', accessToken: finalAccessToken, refreshToken, ...res.data },
      }));

      dispatch(checkAuth({ type: 'PATIENT' }));
      dispatch(addToast({ type: 'success', message: `Welcome! Logged in as Patient.` }));
      navigate('/patient-portal'); // Patients go straight to the portal
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid patient credentials');
    } finally { setLoading(false); }
  };

  const fillDemo = (cred) => { setEmail(cred.email); setPassword(cred.password); };
  const fillPatientDemo = () => { setIdentifier('PAT-1001'); setOtp('123456'); };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/8 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sky-500/8 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[440px] space-y-5">
        <div className="text-center mb-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center shadow-[0_0_40px_rgba(45,212,191,0.3)] mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">MedEPCR</h1>
          <p className="text-slate-400 text-sm mt-1">ePCR + QA/QI Platform</p>
        </div>

        <div className="glass-card p-7 rounded-2xl">
          {/* Tabs */}
          <div className="flex bg-slate-900/50 p-1 rounded-xl mb-6 border border-slate-800">
            <button onClick={() => { setActiveTab('STAFF'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'STAFF' ? 'bg-teal-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>
              Staff Login
            </button>
            <button onClick={() => { setActiveTab('PATIENT'); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'PATIENT' ? 'bg-sky-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>
              Patient Login
            </button>
          </div>

          <h2 className="text-lg font-semibold text-white mb-5">{activeTab === 'STAFF' ? 'Sign In as Staff' : 'Patient Access Portal'}</h2>

          {error && <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>}

          {activeTab === 'STAFF' ? (
            <form onSubmit={handleStaffSubmit} className="space-y-4">
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
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-400 text-slate-900 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(45,212,191,0.25)] hover:shadow-[0_0_30px_rgba(45,212,191,0.4)]">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePatientSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Patient Identifier</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} required
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 placeholder-slate-600"
                    placeholder="e.g. PAT-1001" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">One-Time Password (OTP)</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input type="text" value={otp} onChange={e => setOtp(e.target.value)} required
                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 placeholder-slate-600"
                    placeholder="123456" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-sky-500 hover:bg-sky-400 text-slate-900 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(14,165,233,0.25)] hover:shadow-[0_0_30px_rgba(14,165,233,0.4)]">
                {loading ? 'Verifying...' : 'Access Portal'}
              </button>
            </form>
          )}
        </div>

        {/* Demo Credentials Quick-Fill */}
        {activeTab === 'STAFF' ? (
          <div className="glass-card rounded-2xl p-4">
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-amber-400" />
                <span className="text-xs font-medium text-slate-300">Staff Demo Credentials</span>
              </div>
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
        ) : (
          <div className="glass-card rounded-2xl p-4">
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-amber-400" />
                <span className="text-xs font-medium text-slate-300">Patient Demo Credentials</span>
              </div>
            </div>
            <button onClick={fillPatientDemo}
              className="w-full text-left px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-sky-500/30 hover:bg-sky-500/5 transition-all group">
              <p className="text-xs font-semibold text-sky-400 group-hover:text-sky-300">PATIENT (OTP)</p>
              <p className="text-[10px] text-slate-500 truncate">ID: PAT-1001 • OTP: 123456</p>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
