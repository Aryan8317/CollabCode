import React from 'react';
import { useNavigate } from 'react-router-dom';

const Settings: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-background text-on-surface font-geist min-h-screen">
      <header className="fixed top-0 z-50 w-full bg-surface-container-low border-b border-outline-variant h-[40px] flex justify-between items-center px-gutter">
        <div className="flex items-center gap-6">
          <span 
            className="font-geist text-[20px] font-bold text-primary tracking-tight cursor-pointer"
            onClick={() => navigate('/dashboard')}
          >
            CollabCode
          </span>
        </div>
      </header>
      <main className="pt-[60px] max-w-4xl mx-auto px-gutter py-8">
        <h2 className="text-[28px] font-bold mb-8">Settings</h2>
        
        <div className="space-y-8">
          <section className="bg-surface-container border border-outline-variant rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary">palette</span>
              <h3 className="text-[20px] font-semibold">Theme</h3>
            </div>
            <p className="text-on-surface-variant">Customize the appearance of your workspace.</p>
            <div className="mt-4 flex gap-4">
              <div className="w-12 h-12 rounded bg-slate-900 border border-primary flex items-center justify-center cursor-pointer">
                <span className="material-symbols-outlined text-primary">check</span>
              </div>
              <div className="w-12 h-12 rounded bg-white border border-outline-variant cursor-not-allowed opacity-50"></div>
            </div>
          </section>

          <section className="bg-surface-container border border-outline-variant rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary">person</span>
              <h3 className="text-[20px] font-semibold">Profile Preferences</h3>
            </div>
            <p className="text-on-surface-variant">Update your personal information and how others see you.</p>
            <div className="mt-4 space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-medium">Display Name</label>
                <input 
                  type="text" 
                  className="bg-surface-container-lowest border border-outline-variant rounded p-2 max-w-sm" 
                  placeholder="Your name"
                />
              </div>
            </div>
          </section>

          <section className="bg-surface-container border border-outline-variant rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary">settings_applications</span>
              <h3 className="text-[20px] font-semibold">Workspace Settings</h3>
            </div>
            <p className="text-on-surface-variant">Configure default editor behavior and collaboration tools.</p>
            <div className="mt-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked readOnly />
                <span>Auto-save changes</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Settings;
