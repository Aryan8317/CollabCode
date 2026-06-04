import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import Navbar from '../components/Navbar';
import API from '../utils/api';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Editor settings state
  const [editorSettings, setEditorSettings] = useState(user?.editorSettings || {
    theme: 'vs-dark',
    fontSize: 14,
    fontLigatures: false,
    lineNumbers: 'on',
    minimap: true
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState(user?.notificationSettings || {
    email: true
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);
    try {
      const { data } = await API.put('/users/profile', { name, username, avatar });
      updateUser(data);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setIsChangingPassword(true);
    setMessage(null);
    try {
      await API.put('/users/change-password', { currentPassword, newPassword });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdateEditorSettings = async (updates: Partial<typeof editorSettings>) => {
    const newSettings = { ...editorSettings, ...updates };
    setEditorSettings(newSettings);
    try {
      const { data } = await API.put('/users/profile', { editorSettings: newSettings });
      updateUser(data);
    } catch (err: any) {
      console.error('Failed to update editor settings:', err);
    }
  };

  const handleUpdateNotificationSettings = async (updates: Partial<typeof notificationSettings>) => {
    const newSettings = { ...notificationSettings, ...updates };
    setNotificationSettings(newSettings);
    try {
      const { data } = await API.put('/users/profile', { notificationSettings: newSettings });
      updateUser(data);
    } catch (err: any) {
      console.error('Failed to update notification settings:', err);
    }
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body-md selection:bg-primary/30 min-h-screen">
      <Navbar />

      <div className="flex pt-[40px] h-screen overflow-hidden">
        {/* SideNavBar */}
        <aside className="hidden md:flex flex-col h-full w-[260px] bg-surface-container-low border-r border-outline-variant pt-4 shrink-0">
          <div className="px-4 py-4 text-left">
            <div className="flex flex-col gap-1 mb-6">
              <span className="font-headline-md text-headline-md font-bold text-on-surface text-[14px]">SETTINGS</span>
              <span className="font-code-sm text-code-sm text-on-surface-variant text-[11px]">System Preferences</span>
            </div>
            <nav className="space-y-1">
              <button 
                onClick={() => setActiveTab('account')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-all font-mono text-[11px] uppercase ${activeTab === 'account' ? 'bg-surface-container-highest text-primary border-l-2 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
              >
                <span className="material-symbols-outlined text-[18px]">account_circle</span>
                Account
              </button>
              <button 
                onClick={() => setActiveTab('editor')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-all font-mono text-[11px] uppercase ${activeTab === 'editor' ? 'bg-surface-container-highest text-primary border-l-2 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
              >
                <span className="material-symbols-outlined text-[18px]">code</span>
                Editor Preferences
              </button>
              <button 
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-all font-mono text-[11px] uppercase ${activeTab === 'notifications' ? 'bg-surface-container-highest text-primary border-l-2 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
              >
                <span className="material-symbols-outlined text-[18px]">notifications</span>
                Notifications
              </button>
            </nav>
          </div>
          <div className="mt-auto border-t border-outline-variant p-4">
             <button 
               onClick={handleLogout}
               className="w-full flex items-center gap-3 px-3 py-2 text-error hover:bg-error/10 transition-all rounded font-mono text-[11px] uppercase"
             >
               <span className="material-symbols-outlined text-[18px]">logout</span>
               Terminate Session
             </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-surface-container-lowest p-8 text-left pb-20">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-[28px] font-bold text-on-surface mb-8">System Settings</h1>

            {message && (
              <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 font-mono text-[12px] uppercase ${message.type === 'success' ? 'bg-secondary/10 border-secondary/20 text-secondary' : 'bg-error/10 border-error/20 text-error'}`}>
                <span className="material-symbols-outlined">{message.type === 'success' ? 'check_circle' : 'error'}</span>
                {message.text}
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-8 animate-fade-in">
                <section className="glass-panel border border-outline-variant/30 rounded-xl p-8">
                  <h3 className="text-[18px] font-bold mb-6 flex items-center gap-3 font-mono uppercase text-secondary">
                    <span className="material-symbols-outlined">person</span> Identity Profile
                  </h3>
                  <form onSubmit={handleUpdateProfile}>
                    <div className="flex flex-col md:flex-row gap-8 items-start md:items-center mb-8">
                      <div className="relative group">
                        <img 
                          className="w-24 h-24 rounded-full border-2 border-secondary p-1 object-cover" 
                          src={avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&size=96`} 
                          alt="" 
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                          <span className="material-symbols-outlined text-white">photo_camera</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-4 w-full">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5 text-left">
                              <label className="font-mono text-[10px] font-bold text-outline uppercase tracking-widest">Display Name</label>
                              <input 
                                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-[14px] focus:outline-none focus:border-primary transition-all text-on-surface" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Full Name"
                              />
                            </div>
                            <div className="space-y-1.5 text-left">
                              <label className="font-mono text-[10px] font-bold text-outline uppercase tracking-widest">Username</label>
                              <input 
                                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-[14px] focus:outline-none focus:border-primary transition-all text-on-surface" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="username"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-1.5 text-left">
                              <label className="font-mono text-[10px] font-bold text-outline uppercase tracking-widest">Avatar URL</label>
                              <input 
                                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-[14px] focus:outline-none focus:border-primary transition-all text-on-surface" 
                                value={avatar}
                                onChange={(e) => setAvatar(e.target.value)}
                                placeholder="https://example.com/avatar.jpg"
                              />
                            </div>
                         </div>
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={isUpdating}
                      className="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold font-mono text-[11px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {isUpdating && <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>}
                      Update Identity
                    </button>
                  </form>
                </section>

                <section className="glass-panel border border-outline-variant/30 rounded-xl p-8">
                  <h3 className="text-[18px] font-bold mb-6 flex items-center gap-3 font-mono uppercase text-secondary">
                    <span className="material-symbols-outlined">security</span> Encryption & Security
                  </h3>
                  
                  {(!user?.githubId && !user?.googleId) ? (
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5 text-left">
                          <label className="font-mono text-[10px] font-bold text-outline uppercase tracking-widest">Current Password</label>
                          <input 
                            type="password"
                            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-[14px] focus:outline-none focus:border-primary transition-all text-on-surface" 
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-1.5 text-left">
                          <label className="font-mono text-[10px] font-bold text-outline uppercase tracking-widest">New Password</label>
                          <input 
                            type="password"
                            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-[14px] focus:outline-none focus:border-primary transition-all text-on-surface" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-1.5 text-left">
                          <label className="font-mono text-[10px] font-bold text-outline uppercase tracking-widest">Confirm New Password</label>
                          <input 
                            type="password"
                            className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-[14px] focus:outline-none focus:border-primary transition-all text-on-surface" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <button 
                        type="submit"
                        disabled={isChangingPassword}
                        className="bg-outline text-on-surface hover:bg-outline-variant px-6 py-2 rounded-lg font-bold font-mono text-[11px] uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {isChangingPassword && <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>}
                        Update Security Credentials
                      </button>
                    </form>
                  ) : (
                    <div className="p-4 bg-surface-container rounded-lg border border-outline-variant/30">
                      <p className="text-[13px] text-on-surface-variant flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">info</span>
                        You are logged in via a social provider. Password management is handled by your provider ({user?.githubId ? 'GitHub' : 'Google'}).
                      </p>
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'editor' && (
               <div className="space-y-8 animate-fade-in text-left">
                  <section className="glass-panel border border-outline-variant/30 rounded-xl p-8">
                    <h3 className="text-[18px] font-bold mb-6 flex items-center gap-3 font-mono uppercase text-primary">
                      <span className="material-symbols-outlined">settings_ethernet</span> IDE Configuration
                    </h3>
                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                          <div>
                             <p className="font-bold text-[14px]">Editor Theme</p>
                             <p className="text-[12px] text-on-surface-variant">Select your preferred color scheme.</p>
                          </div>
                          <select 
                            className="bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-[12px] font-mono text-on-surface focus:outline-none focus:border-primary"
                            value={editorSettings.theme}
                            onChange={(e) => handleUpdateEditorSettings({ theme: e.target.value })}
                          >
                            <option value="vs-dark">VS Dark</option>
                            <option value="one-dark-pro">One Dark Pro</option>
                            <option value="solarized-dark">Solarized Dark</option>
                            <option value="light">VS Light</option>
                            <option value="hc-black">High Contrast</option>
                          </select>
                       </div>
                       
                       <div className="flex items-center justify-between">
                          <div>
                             <p className="font-bold text-[14px]">Font Size</p>
                             <p className="text-[12px] text-on-surface-variant">Adjust the size of the editor text.</p>
                          </div>
                          <input 
                            type="number"
                            min="10"
                            max="30"
                            className="w-20 bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-[12px] font-mono text-on-surface focus:outline-none focus:border-primary"
                            value={editorSettings.fontSize}
                            onChange={(e) => handleUpdateEditorSettings({ fontSize: parseInt(e.target.value) })}
                          />
                       </div>

                       <div className="flex items-center justify-between">
                          <div>
                             <p className="font-bold text-[14px]">Font Ligatures</p>
                             <p className="text-[12px] text-on-surface-variant">Enable advanced typography for logical operators.</p>
                          </div>
                          <div 
                            onClick={() => handleUpdateEditorSettings({ fontLigatures: !editorSettings.fontLigatures })}
                            className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${editorSettings.fontLigatures ? 'bg-primary' : 'bg-surface-container-highest'}`}
                          >
                             <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${editorSettings.fontLigatures ? 'right-1 bg-on-primary' : 'left-1 bg-outline'}`}></div>
                          </div>
                       </div>

                       <div className="flex items-center justify-between">
                          <div>
                             <p className="font-bold text-[14px]">Line Numbers</p>
                             <p className="text-[12px] text-on-surface-variant">Control the visibility of line numbers.</p>
                          </div>
                          <select 
                            className="bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-[12px] font-mono text-on-surface focus:outline-none focus:border-primary"
                            value={editorSettings.lineNumbers}
                            onChange={(e) => handleUpdateEditorSettings({ lineNumbers: e.target.value })}
                          >
                            <option value="on">On</option>
                            <option value="off">Off</option>
                            <option value="relative">Relative</option>
                          </select>
                       </div>

                       <div className="flex items-center justify-between">
                          <div>
                             <p className="font-bold text-[14px]">Minimap</p>
                             <p className="text-[12px] text-on-surface-variant">Show code overview on the right side.</p>
                          </div>
                          <div 
                            onClick={() => handleUpdateEditorSettings({ minimap: !editorSettings.minimap })}
                            className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${editorSettings.minimap ? 'bg-primary' : 'bg-surface-container-highest'}`}
                          >
                             <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${editorSettings.minimap ? 'right-1 bg-on-primary' : 'left-1 bg-outline'}`}></div>
                          </div>
                       </div>
                    </div>
                  </section>
               </div>
            )}

            {activeTab === 'notifications' && (
               <div className="space-y-8 animate-fade-in text-left">
                  <section className="glass-panel border border-outline-variant/30 rounded-xl p-8">
                    <h3 className="text-[18px] font-bold mb-6 flex items-center gap-3 font-mono uppercase text-tertiary">
                      <span className="material-symbols-outlined">notifications_active</span> Signal Control
                    </h3>
                    <div className="space-y-4">
                       <div className="flex items-center gap-3 p-4 rounded bg-surface-container-low border border-outline-variant/30">
                          <input 
                            type="checkbox" 
                            checked={notificationSettings.email} 
                            onChange={(e) => handleUpdateNotificationSettings({ email: e.target.checked })}
                            className="w-4 h-4 rounded border-outline-variant bg-surface text-primary focus:ring-primary cursor-pointer" 
                          />
                          <div>
                             <p className="font-bold text-[14px]">Email Notifications</p>
                             <p className="text-[12px] text-on-surface-variant">Receive invitations and mentions via email.</p>
                          </div>
                       </div>
                    </div>
                  </section>
               </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
