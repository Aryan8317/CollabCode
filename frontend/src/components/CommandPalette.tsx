import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import API from '../utils/api';

const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Fetch rooms for search
      API.get('/rooms').then(({ data }) => setRooms(data.rooms || [])).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredRooms = rooms.filter(r => r.name.toLowerCase().includes(query.toLowerCase()) || r.inviteCode.toLowerCase().includes(query.toLowerCase())).slice(0, 5);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 bg-background/80 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-2xl bg-surface-container-high border border-outline-variant rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-outline-variant/30 flex items-center gap-3">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input 
            autoFocus
            type="text"
            className="w-full bg-transparent border-none outline-none text-on-surface text-[18px] font-geist placeholder:text-outline/50"
            placeholder="Search rooms, navigate, or run commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="px-2 py-1 bg-surface-container rounded border border-outline-variant/50 text-[10px] font-mono text-on-surface-variant uppercase font-bold tracking-widest">ESC</div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
          {query.length > 0 && filteredRooms.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-1 font-mono text-[10px] uppercase font-bold text-primary tracking-widest mb-1">Workspaces</div>
              {filteredRooms.map(room => (
                <div 
                  key={room._id}
                  onClick={() => handleAction(() => navigate(`/workspace/${room._id}`))}
                  className="px-3 py-3 hover:bg-surface-container rounded-lg cursor-pointer flex items-center gap-3 group transition-colors"
                >
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[18px]">terminal</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[14px] text-on-surface group-hover:text-primary transition-colors">{room.name}</p>
                    <p className="font-mono text-[10px] text-on-surface-variant uppercase">{room.language}</p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="px-3 py-1 font-mono text-[10px] uppercase font-bold text-secondary tracking-widest mb-1">Navigation</div>
            
            <div onClick={() => handleAction(() => navigate('/dashboard'))} className="px-3 py-3 hover:bg-surface-container rounded-lg cursor-pointer flex items-center gap-3 group transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary">dashboard</span>
              <span className="font-bold text-[14px]">Dashboard</span>
            </div>
            
            <div onClick={() => handleAction(() => navigate('/rooms-explorer'))} className="px-3 py-3 hover:bg-surface-container rounded-lg cursor-pointer flex items-center gap-3 group transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary">explore</span>
              <span className="font-bold text-[14px]">Global Explorer</span>
            </div>
            
            <div onClick={() => handleAction(() => navigate('/community'))} className="px-3 py-3 hover:bg-surface-container rounded-lg cursor-pointer flex items-center gap-3 group transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary">group</span>
              <span className="font-bold text-[14px]">Community Hub</span>
            </div>
            
            <div onClick={() => handleAction(() => navigate('/profile'))} className="px-3 py-3 hover:bg-surface-container rounded-lg cursor-pointer flex items-center gap-3 group transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary">account_circle</span>
              <span className="font-bold text-[14px]">My Profile</span>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-outline-variant/20">
            <div onClick={() => handleAction(() => { logout(); navigate('/login'); })} className="px-3 py-3 hover:bg-error/10 rounded-lg cursor-pointer flex items-center gap-3 group transition-colors">
              <span className="material-symbols-outlined text-error">logout</span>
              <span className="font-bold text-[14px] text-error">Terminate Session</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
