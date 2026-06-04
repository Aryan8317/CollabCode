import React, { useState } from 'react';
import API from '../utils/api';

interface CreateRoomModalProps {
  onClose: () => void;
  onSuccess: (room: any) => void;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [visibility, setVisibility] = useState<'Public' | 'Private'>('Private');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await API.post('/rooms', { name, description, language, visibility });
      onSuccess(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in font-geist">
      <div className="w-full max-w-lg glass-surface border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-on-surface tracking-tight">Initialize Workspace</h2>
            <p className="text-[12px] text-on-surface-variant font-mono uppercase mt-1">Setup your collaboration environment</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-error-container text-on-error-container text-[12px] font-mono border border-error/20 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error.toUpperCase()}
            </div>
          )}

          <div className="space-y-2">
            <label className="font-mono text-[11px] font-bold text-on-surface-variant block tracking-wider uppercase">Room Name</label>
            <input 
              className="w-full bg-surface-container border border-outline-variant rounded-xl py-3 px-4 text-on-surface font-geist text-[14px] focus:outline-none focus:border-primary transition-all placeholder:text-outline/30" 
              placeholder="e.g. quantum-flux-engine" 
              required 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-[11px] font-bold text-on-surface-variant block tracking-wider uppercase">Description</label>
            <textarea 
              className="w-full bg-surface-container border border-outline-variant rounded-xl py-3 px-4 text-on-surface font-geist text-[14px] focus:outline-none focus:border-primary transition-all placeholder:text-outline/30 min-h-[80px]" 
              placeholder="What are you building together?" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-mono text-[11px] font-bold text-on-surface-variant block tracking-wider uppercase">Language</label>
              <select 
                className="w-full bg-surface-container border border-outline-variant rounded-xl py-3 px-4 text-on-surface font-geist text-[14px] focus:outline-none focus:border-primary transition-all appearance-none"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
                <option value="c">C</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="csharp">C#</option>
                <option value="php">PHP</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="font-mono text-[11px] font-bold text-on-surface-variant block tracking-wider uppercase">Visibility</label>
              <div className="flex bg-surface-container border border-outline-variant rounded-xl p-1">
                <button 
                  type="button"
                  onClick={() => setVisibility('Private')}
                  className={`flex-1 py-2 rounded-lg font-mono text-[11px] font-bold uppercase transition-all ${visibility === 'Private' ? 'bg-background text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Private
                </button>
                <button 
                  type="button"
                  onClick={() => setVisibility('Public')}
                  className={`flex-1 py-2 rounded-lg font-mono text-[11px] font-bold uppercase transition-all ${visibility === 'Public' ? 'bg-background text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  Public
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-primary text-on-primary font-mono text-[12px] font-bold py-4 rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${isLoading ? 'opacity-50' : ''}`}
            >
              {isLoading ? (
                <><span className="material-symbols-outlined animate-spin text-[18px]">sync</span> INITIALIZING...</>
              ) : (
                <>CREATE_WORKSPACE <span className="material-symbols-outlined text-[18px]">add_box</span></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;
