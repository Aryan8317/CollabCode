import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

const RoomDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [rooms] = useState([]); // Empty rooms state for now

  const handleJoinRoom = (roomId: string) => {
    navigate(`/workspace/${roomId}`);
  };

  const handleCreateRoom = () => {
    // Generate a random room ID for demo
    const roomId = Math.random().toString(36).substring(7);
    navigate(`/workspace/${roomId}`);
  };

  const handleLogoClick = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="bg-background text-on-surface font-geist min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 z-50 w-full bg-surface-container-low border-b border-outline-variant h-[40px] flex justify-between items-center px-gutter">
        <div className="flex items-center gap-6">
          <span 
            className="font-geist text-[20px] font-bold text-primary tracking-tight cursor-pointer"
            onClick={handleLogoClick}
          >
            CollabCode
          </span>
          <nav className="hidden md:flex gap-4 items-center">
            <Link className="text-on-surface-variant font-medium hover:bg-surface-container-highest transition-colors duration-200 px-2 py-0.5 rounded" to="/rooms">Rooms</Link>
            <Link className="text-on-surface-variant font-medium hover:bg-surface-container-highest transition-colors duration-200 px-2 py-0.5 rounded" to="/community">Community</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              className="text-on-surface-variant hover:bg-surface-container-highest transition-colors duration-200 p-1 rounded flex items-center justify-center"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-64 bg-surface-container border border-outline-variant rounded-lg shadow-xl z-50 p-4">
                <h4 className="text-[14px] font-bold mb-2">Notifications</h4>
                <p className="text-[12px] text-on-surface-variant text-center py-4">No notifications</p>
              </div>
            )}
          </div>
          <button 
            className="text-on-surface-variant hover:bg-surface-container-highest transition-colors duration-200 p-1 rounded flex items-center justify-center"
            onClick={() => navigate('/settings')}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
          <div className="relative">
            <div 
              className="h-6 w-6 rounded-full border border-secondary p-0.5 ml-1 overflow-hidden cursor-pointer"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <img 
                alt="User avatar" 
                className="w-full h-full object-cover rounded-full" 
                src={user?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuBEh_KeIWO5dTERgK2owPYV_F0G_UMgmssS4cOyL89GDQCyZsVojo-RljMwB07HHan7ZE3gJjgCsIdep109qbte83s0xa_xyrf7zww_2dkae724Lg0UL1018Agm6XdlsReg6t_yp6j9bIn43L0VCvdTjhP16yhYIv3F1d7o3J-fGi59xhan6n4-Uddm4X6EljrSCn19PG5F3j4O4d9pJ1vbogzyeLBIXvhs9H7ari8rJ_H0DFZKDuPRbD0M2hmIZr2DVuRj4PLmx_M"}
              />
            </div>
            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-surface-container border border-outline-variant rounded-lg shadow-xl z-50 overflow-hidden">
                <button className="w-full text-left px-4 py-2 text-[14px] hover:bg-surface-container-highest transition-colors">Profile</button>
                <button className="w-full text-left px-4 py-2 text-[14px] hover:bg-surface-container-highest transition-colors" onClick={() => navigate('/settings')}>Account Settings</button>
                <div className="border-t border-outline-variant my-1"></div>
                <button 
                  className="w-full text-left px-4 py-2 text-[14px] text-error hover:bg-surface-container-highest transition-colors"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="pt-[40px] min-h-screen">
        <div className="max-w-7xl mx-auto px-gutter py-8">
          {/* Hero Action Area */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
            {/* Primary CTA: Create New Room */}
            <div 
              className="md:col-span-8 group relative overflow-hidden rounded-xl bg-primary-container p-8 flex flex-col justify-between min-h-[220px] cursor-pointer transition-all hover:brightness-110 active:scale-[0.98]"
              onClick={handleCreateRoom}
            >
              <div className="relative z-10">
                <h2 className="font-geist text-[28px] font-semibold text-on-primary-container mb-2">Initialize Workspace</h2>
                <p className="text-on-primary-container/80 max-w-md">Launch a new real-time collaborative room with optimized environments for React, TypeScript, or Python.</p>
              </div>
              <div className="relative z-10 flex items-center gap-3 mt-4">
                <button className="bg-on-primary-container text-white px-6 py-3 rounded font-bold flex items-center gap-2 transition-transform group-hover:translate-x-1">
                  Create New Room
                  <span className="material-symbols-outlined">add_circle</span>
                </button>
              </div>
              {/* Aesthetic Background Pattern */}
              <div className="absolute right-[-20px] bottom-[-20px] opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                <span className="material-symbols-outlined text-[240px]">terminal</span>
              </div>
            </div>

            {/* Secondary Action: Join via ID */}
            <div className="md:col-span-4 bg-surface-container border border-outline-variant rounded-xl p-8 flex flex-col justify-center">
              <h3 className="font-geist text-[20px] font-semibold text-on-surface mb-4">Join Room</h3>
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded p-3 font-mono text-[14px] text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-on-surface-variant/40" 
                    placeholder="COLLAB_ROOM_XXX" 
                    type="text"
                  />
                  <span className="absolute right-3 top-3.5 material-symbols-outlined text-on-surface-variant text-[18px]">fingerprint</span>
                </div>
                <button className="w-full bg-secondary text-on-secondary px-6 py-3 rounded font-bold hover:opacity-90 transition-opacity">
                  Join Session
                </button>
              </div>
            </div>
          </section>

          {/* Workspace Section Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">history</span>
              <h2 className="font-geist text-[20px] font-semibold">Recent Rooms</h2>
            </div>
            <div className="flex gap-2">
              <button className="p-2 rounded bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
              <button className="p-2 rounded bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant">
                <span className="material-symbols-outlined">grid_view</span>
              </button>
            </div>
          </div>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rooms.length > 0 ? (
              rooms.map((room: any) => (
                <div 
                  key={room.id}
                  className="glass-panel border border-outline-variant rounded-lg p-5 group hover:border-primary/50 transition-all cursor-pointer presence-glow-blue translate-y-0 hover:-translate-y-1"
                  onClick={() => handleJoinRoom(room.id)}
                >
                  {/* Room Card Content Template */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col">
                      <span className="font-mono text-[12px] text-on-surface-variant mb-1">ID: {room.id}</span>
                      <h3 className="font-geist text-[20px] font-semibold text-on-surface group-hover:text-primary transition-colors">{room.name}</h3>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] mb-2 opacity-20">history</span>
                <p className="font-mono text-[14px]">No rooms yet</p>
                <button 
                  onClick={handleCreateRoom}
                  className="mt-4 text-primary font-bold hover:underline"
                >
                  Create your first room
                </button>
              </div>
            )}

            {/* Room Card (Empty Slot / Create Button) */}
            <div 
              className="border-2 border-dashed border-outline-variant rounded-lg p-5 flex flex-col items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-all cursor-pointer group min-h-[180px]"
              onClick={handleCreateRoom}
            >
              <span className="material-symbols-outlined text-[32px] mb-2 group-hover:scale-110 transition-transform">add</span>
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider">New Room</span>
            </div>
          </div>
        </div>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <footer className="md:hidden fixed bottom-0 w-full z-50 h-[24px] bg-surface-container-lowest border-t border-outline-variant px-4 flex justify-between items-center">
        <div className="flex items-center gap-2 text-on-surface">
          <span className="material-symbols-outlined text-[14px]">account_tree</span>
          <span className="font-mono text-[10px]">main</span>
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-[14px]">code</span>
          <span className="font-mono text-[10px]">TypeScript</span>
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-[14px]">wifi_tethering</span>
          <span className="font-mono text-[10px]">Connected</span>
        </div>
      </footer>
    </div>
  );
};

export default RoomDashboard;
