import React, { useState } from 'react';
import API from '../utils/api';

interface Collaborator {
  user: {
    _id: string;
    name: string;
    avatar?: string;
    email: string;
  };
  role: 'Admin' | 'Editor' | 'Viewer';
}

interface ShareModalProps {
  roomId: string;
  roomName: string;
  inviteCode: string;
  collaborators: Collaborator[];
  onClose: () => void;
  onUpdate: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ roomId, roomName, inviteCode, collaborators, onClose, onUpdate }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Editor' | 'Viewer'>('Viewer');
  const [isInviting, setIsInviting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const inviteLink = `${window.location.origin}/workspace/${roomId}`;

  const handleCopy = (text: string, type: 'link' | 'id' | 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
    if (type === 'id') { setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }
    if (type === 'code') { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }
  };
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsInviting(true);
    setMessage(null);
    try {
      await API.post(`/rooms/${roomId}/invite`, { email, role });
      setMessage({ type: 'success', text: 'Invitation sent!' });
      setEmail('');
      onUpdate();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to send invitation' });
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await API.put(`/rooms/${roomId}/collaborators/${userId}`, { role: newRole });
      onUpdate();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update role' });
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    try {
      await API.delete(`/rooms/${roomId}/collaborators/${userId}`);
      onUpdate();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to remove collaborator' });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in font-geist">
      <div className="w-full max-w-md glass-surface border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-on-surface tracking-tight">Share Workspace</h2>
            <p className="text-[12px] text-on-surface-variant font-mono uppercase mt-1">{roomName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Invite Form */}
        <div className="p-6 space-y-6">
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative group">
                <input 
                  type="email"
                  placeholder="Invite by email..."
                  className="w-full bg-surface-container border border-outline-variant rounded-xl py-2.5 px-4 text-[14px] text-on-surface focus:outline-none focus:border-primary transition-all placeholder:text-outline/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <select 
                className="bg-surface-container border border-outline-variant rounded-xl px-3 text-[12px] font-mono text-on-surface focus:outline-none focus:border-primary"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                <option value="Viewer">Viewer</option>
                <option value="Editor">Editor</option>
                <option value="Admin">Admin</option>
              </select>
              <button 
                type="submit" 
                disabled={isInviting}
                className="bg-primary text-on-primary px-4 rounded-xl font-bold font-mono text-[11px] uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
              >
                {isInviting ? <span className="material-symbols-outlined animate-spin text-[16px]">sync</span> : 'Invite'}
              </button>
            </div>
            {message && (
              <p className={`text-[11px] font-mono uppercase font-bold ${message.type === 'success' ? 'text-secondary' : 'text-error'}`}>
                {message.text}
              </p>
            )}
          </form>

          {/* Sharing Links & Identifiers */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold text-on-surface-variant uppercase tracking-widest">Workspace Link</label>
              <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-2 pl-4">
                <span className="text-[13px] text-on-surface-variant truncate flex-1 font-mono">{inviteLink}</span>
                <button 
                  onClick={() => handleCopy(inviteLink, 'link')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all font-mono text-[11px] font-bold uppercase ${copiedLink ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">{copiedLink ? 'check' : 'content_copy'}</span>
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold text-on-surface-variant uppercase tracking-widest">Room ID</label>
                <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-2 pl-4">
                  <span className="text-[13px] text-on-surface-variant truncate flex-1 font-mono">{roomId}</span>
                  <button 
                    onClick={() => handleCopy(roomId, 'id')}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${copiedId ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'}`}
                    title="Copy Room ID"
                  >
                    <span className="material-symbols-outlined text-[16px]">{copiedId ? 'check' : 'content_copy'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold text-on-surface-variant uppercase tracking-widest">Invite Code</label>
                <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-2 pl-4">
                  <span className="text-[13px] text-on-surface-variant truncate flex-1 font-mono">{inviteCode}</span>
                  <button 
                    onClick={() => handleCopy(inviteCode, 'code')}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${copiedCode ? 'bg-secondary/10 text-secondary' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'}`}
                    title="Copy Invite Code"
                  >
                    <span className="material-symbols-outlined text-[16px]">{copiedCode ? 'check' : 'content_copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Collaborators List */}
          <div className="space-y-4 pt-2">
            <label className="text-[11px] font-mono font-bold text-on-surface-variant uppercase tracking-widest">Collaborators</label>
            <div className="space-y-1 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
              {collaborators.map((collab, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-surface-container transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-outline-variant bg-surface-container-high overflow-hidden">
                      <img 
                        alt={collab.user.name} 
                        className="w-full h-full object-cover" 
                        src={collab.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(collab.user.name)}&background=1d2026&color=adc6ff&size=64`}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-on-surface truncate w-32">{collab.user.name}</span>
                      {collab.role === 'Admin' ? (
                        <span className="text-[10px] font-mono text-secondary uppercase font-bold">{collab.role}</span>
                      ) : (
                        <select 
                          className="bg-transparent border-none p-0 text-[10px] font-mono text-on-surface-variant uppercase focus:outline-none focus:text-primary cursor-pointer"
                          value={collab.role}
                          onChange={(e) => handleUpdateRole(collab.user._id, e.target.value)}
                        >
                          <option value="Viewer">Viewer</option>
                          <option value="Editor">Editor</option>
                          <option value="Admin">Admin</option>
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {collab.role !== 'Admin' && (
                      <button 
                        onClick={() => handleRemoveCollaborator(collab.user._id)}
                        className="material-symbols-outlined text-[16px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity hover:text-error"
                      >
                        delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/20 bg-surface-container-low flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-primary text-on-primary font-bold font-mono text-[11px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default ShareModal;
