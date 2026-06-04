import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import CreateRoomModal from '../components/CreateRoomModal';
import Navbar from '../components/Navbar';

const RoomsExplorer: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchExploreRooms();
  }, [language]);

  const fetchExploreRooms = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/rooms/explore?search=${search}&language=${language}`);
      // Backend returns { rooms, page, pages, total }
      setRooms(data.rooms || []);
    } catch (err) {
      console.error('Error fetching explore rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExploreRooms();
  };

  const handleJoinRoom = async (inviteCode: string) => {
    try {
      const { data } = await API.post('/rooms/join', { inviteCode });
      navigate(`/workspace/${data.roomId}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to join room');
    }
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body-md selection:bg-primary/30 min-h-screen">
      {isCreateModalOpen && (
        <CreateRoomModal 
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(room) => {
            setIsCreateModalOpen(false);
            navigate(`/workspace/${room._id}`);
          }}
        />
      )}

      <Navbar />

      <div className="flex pt-[40px] h-screen overflow-hidden">
        {/* SideNavBar */}
        <aside className="hidden md:flex flex-col h-full w-[260px] bg-surface-container-low border-r border-outline-variant pt-4 shrink-0">
          <div className="px-4 mb-8 text-left">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-container-high border border-outline-variant/30">
              <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">terminal</span>
              </div>
              <div>
                <div className="font-headline-md text-headline-md font-bold text-on-surface text-[14px]">EXPLORER</div>
                <div className="font-code-sm text-code-sm text-on-surface-variant text-[11px]">Public Rooms</div>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-2">
            <div className="flex items-center gap-3 px-3 py-2 bg-surface-container-highest text-primary border-l-2 border-primary transition-all font-code-sm text-code-sm translate-x-1 cursor-pointer">
              <span className="material-symbols-outlined">folder_open</span> Explorer
            </div>
            <div onClick={() => navigate('/community')} className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all font-code-sm text-code-sm cursor-pointer">
              <span className="material-symbols-outlined">group</span> Community
            </div>
          </nav>
          <div className="px-4 py-4">
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full py-2 bg-primary text-on-primary font-bold rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-all font-mono text-[11px] uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-[18px]">add</span> New Room
            </button>
          </div>
          <div className="mt-auto border-t border-outline-variant p-2 space-y-1">
            <div onClick={() => navigate('/settings')} className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all font-code-sm text-code-sm cursor-pointer">
              <span className="material-symbols-outlined">settings</span> Settings
            </div>
            <div onClick={() => navigate('/profile')} className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all font-code-sm text-code-sm cursor-pointer">
              <span className="material-symbols-outlined">account_circle</span> Account
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-surface-container-lowest relative text-left">
          {/* Hero / Search Section */}
          <section className="p-8 pb-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                  <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2 text-[28px] font-bold">Active Collaborative Rooms</h1>
                  <p className="text-on-surface-variant max-w-xl font-body-md text-[14px]">Join real-time sessions or launch a fresh workspace. Your code, synchronized globally with enterprise-grade latency.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-6 py-2.5 bg-primary-container text-on-primary-container font-bold rounded-lg flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg font-mono text-[11px] uppercase tracking-wider"
                  >
                    <span className="material-symbols-outlined">add_box</span> Create New Room
                  </button>
                </div>
              </div>
              
              {/* Search & Filter Bar */}
              <div className="glass-panel border border-outline-variant/30 rounded-xl p-3 flex flex-wrap items-center gap-3 mb-8">
                <form onSubmit={handleSearch} className="flex-1 min-w-[240px] relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                  <input 
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-[14px] placeholder:text-outline/50" 
                    placeholder="Search rooms..." 
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </form>
                <div className="flex items-center gap-2">
                  <select 
                    className="bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-label-caps font-label-caps appearance-none cursor-pointer focus:border-primary outline-none font-mono text-[11px] font-bold uppercase"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="">All Languages</option>
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="rust">Rust</option>
                  </select>
                </div>
              </div>

              {/* Rooms Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="glass-panel border border-outline-variant/30 rounded-xl p-6 h-[220px] animate-pulse"></div>
                  ))
                ) : rooms.map((room) => (
                  <div key={room._id} className="glass-panel border border-outline-variant/30 rounded-xl p-6 flex flex-col hover:border-primary/50 transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center border border-outline-variant group-hover:bg-primary/10 transition-colors">
                        <span className="material-symbols-outlined text-primary">{room.language === 'python' ? 'terminal' : 'code'}</span>
                      </div>
                      <span className="text-secondary font-code-sm text-code-sm flex items-center gap-1 font-mono text-[11px] font-bold">
                        <span className="material-symbols-outlined text-[14px]">group</span> {room.collaborators?.length || 0}
                      </span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-1 text-[18px] font-bold truncate group-hover:text-primary transition-colors">{room.name}</h3>
                    <div className="font-code-sm text-code-sm text-on-surface-variant mb-4 font-mono text-[11px] uppercase tracking-wider">{room.language}</div>
                    <p className="text-body-sm text-on-surface-variant mb-auto text-[13px] line-clamp-2">{room.description || 'Collaborative coding workspace.'}</p>
                    <div className="pt-6">
                      <button 
                        onClick={() => handleJoinRoom(room.inviteCode)}
                        className="w-full py-2 border border-outline-variant text-on-surface hover:bg-surface-container-highest rounded-lg transition-all font-bold font-mono text-[11px] uppercase tracking-wider"
                      >
                        Join Room
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* BottomNavBar */}
      <footer className="fixed bottom-0 w-full z-50 h-[24px] bg-surface-container-lowest border-t border-outline-variant flex justify-between items-center px-4">
        <div className="flex items-center gap-4 h-full">
          <div className="text-on-surface flex items-center gap-2 font-code-sm text-code-sm font-mono text-[11px]">
            <span className="material-symbols-outlined text-[14px]">account_tree</span> main
          </div>
        </div>
        <div className="flex items-center gap-4 h-full">
          <div className="text-secondary flex items-center gap-2 font-code-sm text-code-sm font-mono text-[11px] font-bold uppercase">
            <span className="material-symbols-outlined text-[14px]">wifi_tethering</span> Connected
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RoomsExplorer;
