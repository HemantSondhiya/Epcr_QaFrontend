import { useState } from 'react';
import { Settings as SettingsIcon, Save, Shield, Bell, Database } from 'lucide-react';

const Settings = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Configure global application parameters.</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-slate-900 px-5 py-2 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(45,212,191,0.3)] disabled:opacity-50"
        >
          <Save size={18} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="md:col-span-1 space-y-2">
          <button 
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'general' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'}`}
          >
            <SettingsIcon size={18} />
            <span className="font-medium text-sm">General</span>
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'security' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'}`}
          >
            <Shield size={18} />
            <span className="font-medium text-sm">Security</span>
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'notifications' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'}`}
          >
            <Bell size={18} />
            <span className="font-medium text-sm">Notifications</span>
          </button>
          <button 
            onClick={() => setActiveTab('database')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeTab === 'database' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'}`}
          >
            <Database size={18} />
            <span className="font-medium text-sm">Data Retention</span>
          </button>
        </div>

        {/* Settings Content */}
        <div className="md:col-span-3">
          <div className="glass-card rounded-2xl p-6 border border-slate-700/50">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">General Configuration</h3>
                  <p className="text-sm text-slate-400 mt-1">Basic settings for the MedEPCR platform.</p>
                </div>
                <hr className="border-slate-800" />
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Platform Name</label>
                    <input type="text" defaultValue="MedEPCR" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all max-w-md" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Support Contact Email</label>
                    <input type="email" defaultValue="support@medepcr.local" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all max-w-md" />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <input type="checkbox" id="maintenance" className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500/50" />
                    <label htmlFor="maintenance" className="text-sm font-medium text-slate-300">Enable Maintenance Mode</label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Security Policies</h3>
                  <p className="text-sm text-slate-400 mt-1">Manage global security and session policies.</p>
                </div>
                <hr className="border-slate-800" />
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Session Timeout (Minutes)</label>
                    <select className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all max-w-md">
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="60" selected>60 Minutes</option>
                      <option value="120">120 Minutes</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Minimum Password Length</label>
                    <input type="number" defaultValue="8" className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all max-w-md" />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <input type="checkbox" id="mfa" defaultChecked className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500/50" />
                    <label htmlFor="mfa" className="text-sm font-medium text-slate-300">Require MFA for Admins</label>
                  </div>
                </div>
              </div>
            )}

            {/* Other tabs can be similarly implemented... */}
            {(activeTab === 'notifications' || activeTab === 'database') && (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                <SettingsIcon size={48} className="mb-4 opacity-20" />
                <p>Configuration panel under construction.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
