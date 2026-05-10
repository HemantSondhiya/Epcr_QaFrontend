import { useState } from 'react';
import {
  Save, Shield, Bell, Database, RefreshCw, ChevronRight,
  Globe, Lock, Cpu, Server, Cloud, Monitor, UserCheck, ShieldAlert, Activity
} from 'lucide-react';

const Settings = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  const tabs = [
    { id: 'general',  label: 'General',  icon: Cpu },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'alerts',   label: 'Alerts',   icon: Bell },
    { id: 'database', label: 'Storage',  icon: Database },
  ];

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="section-label mb-1">Configuration</p>
          <h1 className="text-2xl font-black text-[#0F1A3A] tracking-tight">System <span className="text-brand-blue">Settings</span></h1>
          <p className="text-sm text-[#8A97B0] mt-0.5">Platform configuration and preferences</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="btn-primary text-sm px-5 py-2.5">
          {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <div className="md:col-span-1 space-y-1.5">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === id
                  ? 'bg-brand-blue text-white shadow-md'
                  : 'text-[#4B5A7A] hover:bg-[#F0F4FC]'
              }`}>
              <div className="flex items-center gap-3">
                <Icon size={17} className={activeTab === id ? 'text-white' : 'text-brand-blue'} />
                {label}
              </div>
              <ChevronRight size={14} className={activeTab === id ? 'opacity-100' : 'opacity-0'} />
            </button>
          ))}

          {/* Version card */}
          <div className="mt-4 p-4 bg-white border border-[#DDE3F0] rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Server size={14} className="text-[#A0AECB]" />
              <span className="text-xs font-bold text-[#8A97B0] uppercase tracking-wider">Platform Version</span>
            </div>
            <p className="font-black text-[#0F1A3A]">v2.0.4</p>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-600">System Operational</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          {activeTab === 'general' && (
            <div className="card p-6 space-y-5">
              <h3 className="font-black text-[#0F1A3A] text-base border-b border-[#F0F4FC] pb-3">General Configuration</h3>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">API Gateway Host</label>
                <div className="relative">
                  <Globe size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0AECB]" />
                  <input className="input pl-10 py-2.5 text-sm" defaultValue="https://api.innovixahealth.io" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#4B5A7A] uppercase tracking-wider">Organization Identifier</label>
                <input className="input py-2.5 text-sm" defaultValue="GLOBAL_HQ_REGION_01" />
              </div>
              <div className="flex items-center justify-between p-4 bg-[#F8FAFF] rounded-xl border border-[#DDE3F0]">
                <div>
                  <p className="text-sm font-bold text-[#0F1A3A]">Performance Mode</p>
                  <p className="text-xs text-[#8A97B0]">Enable edge caching for faster data loads</p>
                </div>
                <button className="w-12 h-6 rounded-full bg-brand-blue relative shadow-sm">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card p-6 space-y-4">
              <h3 className="font-black text-[#0F1A3A] text-base border-b border-[#F0F4FC] pb-3">Security Settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title:'Multi-Factor Auth', desc:'Require OTP for admin access', icon:UserCheck, active:true },
                  { title:'AES-256 Encryption', desc:'Encrypt all stored clinical data', icon:Lock, active:true },
                  { title:'Session Monitoring', desc:'Track active user sessions in real-time', icon:Monitor, active:false },
                  { title:'Auto Session Revoke', desc:'Terminate session after 15min idle', icon:ShieldAlert, active:true },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="p-4 bg-[#F8FAFF] rounded-xl border border-[#DDE3F0]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-brand-blue">
                          <Icon size={16} />
                        </div>
                        <button className={`w-10 h-5 rounded-full relative transition-all ${item.active ? 'bg-brand-blue' : 'bg-[#DDE3F0]'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${item.active ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-[#0F1A3A]">{item.title}</p>
                      <p className="text-xs text-[#8A97B0] mt-0.5">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="card p-6 space-y-4">
              <h3 className="font-black text-[#0F1A3A] text-base border-b border-[#F0F4FC] pb-3">Alert Preferences</h3>
              {[
                { label:'QA Review Assignments', desc:'Notify when assigned a new QA review' },
                { label:'Record Status Updates', desc:'Notify on EPCR status changes' },
                { label:'System Announcements', desc:'Platform-wide notices and updates' },
                { label:'Security Alerts', desc:'Failed login attempts and breach detection' },
              ].map((a, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-[#F8FAFF] rounded-xl border border-[#DDE3F0]">
                  <div>
                    <p className="text-sm font-bold text-[#0F1A3A]">{a.label}</p>
                    <p className="text-xs text-[#8A97B0]">{a.desc}</p>
                  </div>
                  <button className="w-10 h-5 rounded-full bg-brand-blue relative">
                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'database' && (
            <div className="card p-6 space-y-5">
              <h3 className="font-black text-[#0F1A3A] text-base border-b border-[#F0F4FC] pb-3">Storage Configuration</h3>
              <div className="p-5 bg-[#F8FAFF] rounded-xl border border-[#DDE3F0]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-[#0F1A3A]">Database Capacity</span>
                  <span className="badge badge-orange">78% Used</span>
                </div>
                <div className="w-full h-3 bg-[#DDE3F0] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-brand-blue to-brand-red rounded-full" style={{ width:'78%' }} />
                </div>
                <p className="text-xs text-[#8A97B0] mt-2">78 GB of 100 GB allocated</p>
              </div>
              <div className="flex items-center gap-3 p-4 bg-[#EEF2FF] rounded-xl border border-[#C8D5F0]">
                <Cloud size={18} className="text-brand-blue" />
                <div>
                  <p className="text-sm font-bold text-brand-blue">AES-256-GCM Encryption Active</p>
                  <p className="text-xs text-[#4B5A7A]">All data is encrypted at rest and in transit</p>
                </div>
              </div>
              <button className="btn-primary text-sm px-5 py-2.5">
                <RefreshCw size={15} /> Optimize Database
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
