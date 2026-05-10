import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginSuccess, checkAuth } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';
import client from '../api/client';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, RefreshCw, Shield, AlertCircle, Activity, Heart, Fingerprint } from 'lucide-react';


const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('STAFF');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [patientIdentifier, setPatientIdentifier] = useState('');
  const [patientOtp, setPatientOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await client.post('/api/auth/login', { email, password });
      const { userId, role, organizationId, accessToken, refreshToken, token, firstName, lastName } = res.data;
      const finalToken = accessToken || token;
      dispatch(loginSuccess({
        user: { id: userId, userId, email, firstName, lastName, role, organizationId, accessToken: finalToken, refreshToken, ...res.data },
      }));
      dispatch(checkAuth());
      dispatch(addToast({ type: 'success', message: 'Login successful' }));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  const handleRequestPatientOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (!patientIdentifier.trim()) {
        setError('Please enter your patient identifier');
        setLoading(false);
        return;
      }
      await client.post('/api/patient/auth/request-otp', { identifier: patientIdentifier });
      setOtpSent(true);
      dispatch(addToast({ type: 'success', message: 'OTP sent to your registered contact' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally { setLoading(false); }
  };

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await client.post('/api/patient/auth/login', { identifier: patientIdentifier, otp: patientOtp });
      const { userId, patientId, accessToken, refreshToken, token, firstName, lastName } = res.data;
      const finalToken = accessToken || token;
      dispatch(loginSuccess({
        user: { id: userId, userId, patientId, firstName, lastName, role: 'PATIENT', accessToken: finalToken, refreshToken, ...res.data },
      }));
      dispatch(checkAuth());
      dispatch(addToast({ type: 'success', message: 'Patient login successful' }));
      navigate('/patient-portal');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="h-screen flex bg-[#F0F4FC] overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Left Panel ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-blue relative overflow-hidden flex-col justify-between p-12">
        {/* dot grid */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '36px 36px'
        }} />
        {/* red blob */}
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-brand-red rounded-full opacity-15 blur-3xl translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-brand-red rounded-xl flex items-center justify-center">
              <Activity size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-lg leading-none tracking-tight">INNOVIXA</p>
              <p className="text-white/50 font-bold text-xs tracking-widest">HEALTH PRODUCTS</p>
            </div>
          </div>

          <h1 className="text-5xl font-black text-white leading-tight tracking-tight mb-6">
            Clinical<br />Quality<br /><span className="text-brand-red">Assurance</span>
          </h1>
          <p className="text-white/60 leading-relaxed max-w-sm">
            Secure access to the ePCR management platform for authorized clinical staff and administrators.
          </p>
        </div>

        {/* Stats at bottom */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[['1,200+', 'Records'], ['98%', 'Accuracy'], ['HIPAA', 'Compliant']].map(([val, lab]) => (
            <div key={lab} className="bg-white/10 rounded-2xl p-4 border border-white/10">
              <p className="text-white font-black text-xl">{val}</p>
              <p className="text-white/50 text-xs uppercase tracking-wider">{lab}</p>
            </div>
          ))}
        </div>

        {/* Pulse SVG */}
        <svg viewBox="0 0 400 50" className="absolute bottom-48 left-0 w-full opacity-20" style={{ height: 50 }}>
          <path d="M0 25 L100 25 L130 5 L160 45 L190 25 L400 25"
            fill="none" stroke="white" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* ── Right Panel ── FIXED: overflow-y-auto so content scrolls, pt for back button space */}
      <div className="flex-1 flex flex-col overflow-y-auto">

        {/* Back to home — fixed at top of right panel */}
        <div className="shrink-0 px-8 pt-8 pb-4">
          <Link to="/" className="inline-flex items-center gap-2 text-[#8A97B0] hover:text-brand-blue transition-colors text-sm font-semibold">
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>

        {/* Centered content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-y-auto">
          <div className="w-full max-w-md">

            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
              <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center">
                <Activity size={20} className="text-white" />
              </div>
              <p className="text-brand-blue font-black text-xl tracking-tight">INNOVIXA HEALTH</p>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-black text-[#0F1A3A] tracking-tight">Welcome back</h2>
              <p className="text-[#8A97B0] text-sm mt-1">Sign in to access the QA/QI platform</p>
            </div>

            {/* Tab switcher */}
            <div className="flex bg-[#E8EEF8] p-1 rounded-xl mb-6">
              {['STAFF', 'PATIENT'].map(tab => (
                <button key={tab} onClick={() => { setActiveTab(tab); setError(''); }}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-200 ${activeTab === tab
                    ? 'bg-white text-brand-blue shadow-sm'
                    : 'text-[#8A97B0] hover:text-brand-blue'
                    }`}>
                  {tab === 'STAFF' ? 'Staff Login' : 'Patient Login'}
                </button>
              ))}
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(26,60,143,0.10)] border border-[#DDE3F0] p-8 space-y-5">
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-brand-red text-sm font-semibold">
                  <AlertCircle size={18} className="shrink-0" /> {error}
                </div>
              )}

              {activeTab === 'STAFF' ? (
                <form onSubmit={handleStaffSubmit} className="space-y-5">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">Email Address</label>
                    <div className="relative">

                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                        className="input pl-10" />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">Password</label>
                    <div className="relative">

                      <input type={showPw ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)} required
                        className="input pl-10 pr-11" />
                      <button type="button" onClick={() => setShowPw(p => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A0AECB] hover:text-brand-blue transition-colors">
                        {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="btn-primary w-full justify-center py-3.5 text-sm mt-2">
                    {loading ? <RefreshCw size={16} className="animate-spin" /> : <Shield size={16} />}
                    {loading ? 'Verifying…' : 'Sign In'}
                  </button>
                </form>
              ) : (
                <form onSubmit={otpSent ? handlePatientSubmit : handleRequestPatientOtp} className="space-y-5">
                  {/* Patient Identifier */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">Patient Identifier</label>
                    <div className="relative">

                      <input type="text" value={patientIdentifier} onChange={e => setPatientIdentifier(e.target.value)} required disabled={otpSent}
                        className="input pl-10 " placeholder='Email' />
                    </div>
                  </div>

                  {/* OTP Field */}
                  {otpSent && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">One-Time Password</label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0AECB]" />
                        <input type="text" value={patientOtp} onChange={e => setPatientOtp(e.target.value)} required
                          className="input pl-10" placeholder="Enter 6-digit OTP" maxLength="6" />
                      </div>
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="btn-primary w-full justify-center py-3.5 text-sm mt-2">
                    {loading ? <RefreshCw size={16} className="animate-spin" /> : <Shield size={16} />}
                    {loading ? 'Verifying…' : (otpSent ? 'Verify OTP' : 'Request OTP')}
                  </button>

                  {otpSent && (
                    <button type="button" onClick={() => { setOtpSent(false); setPatientOtp(''); }}
                      className="w-full text-sm text-brand-blue hover:text-brand-blue/80 font-semibold py-2">
                      Change Identifier
                    </button>
                  )}
                </form>
              )}


            </div>

            <p className="text-center text-xs text-[#A0AECB] mt-6 font-medium">
              Protected by HIPAA-compliant security protocols
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;