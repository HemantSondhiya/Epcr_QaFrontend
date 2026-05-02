import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Phone, Building } from 'lucide-react';
import client from '../api/client';

const Register = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', organizationId: '', password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const response = await client.get('/api/organizations');
        setOrganizations(response.data);
      } catch (err) {
        console.error("Failed to load organizations");
      }
    };
    fetchOrgs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await client.post('/api/auth/register', formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] p-4 relative overflow-hidden py-12">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sky-500/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      
      <div className="w-full max-w-lg">
        <div className="glass-card p-8 rounded-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white tracking-tight">Request Access</h1>
            <p className="text-slate-400 text-sm mt-2">Create your account for MedEPCR</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input name="firstName" value={formData.firstName} onChange={handleChange} required className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 placeholder-slate-500" placeholder="John" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Last Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input name="lastName" value={formData.lastName} onChange={handleChange} required className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 placeholder-slate-500" placeholder="Doe" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 placeholder-slate-500" placeholder="john@example.com" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 placeholder-slate-500" placeholder="+1 (555) 000-0000" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Organization</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <select name="organizationId" value={formData.organizationId} onChange={handleChange} required className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 appearance-none">
                    <option value="" disabled>Select Organization</option>
                    {organizations.map(org => (
                      <option key={org.id || org.code} value={org.id || org.code}>{org.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 placeholder-slate-500" placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-teal-500 hover:bg-teal-400 text-slate-900 py-3 rounded-lg font-medium transition-all shadow-[0_0_20px_rgba(45,212,191,0.2)] hover:shadow-[0_0_25px_rgba(45,212,191,0.4)] hover:-translate-y-0.5 mt-4 disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Already have an account? <Link to="/login" className="text-teal-400 hover:text-teal-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
