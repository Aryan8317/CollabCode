import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import API from '../utils/api';
import CreateRoomModal from '../components/CreateRoomModal';
import Navbar from '../components/Navbar';

const RoomDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    fetchMyRooms();
    fetchInvitations();
  }, []);

  const fetchMyRooms = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/rooms');
      setRooms(data.rooms || []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const { data } = await API.get('/rooms/invitations/me');
      setInvitations(data);
    } catch (err) {
      console.error('Error fetching invitations:', err);
    }
  };

  const handleAcceptInvite = async (invitationId: string) => {
    try {
      await API.post(`/rooms/invitations/${invitationId}/accept`);
      setInvitations(invitations.filter(inv => inv._id !== invitationId));
      fetchMyRooms();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error accepting invitation');
    }
  };

  const handleDeclineInvite = async (invitationId: string) => {
    try {
      await API.post(`/rooms/invitations/${invitationId}/decline`);
      setInvitations(invitations.filter(inv => inv._id !== invitationId));
    } catch (err) {
      console.error('Error declining invitation:', err);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode) return;
    try {
      const { data } = await API.post('/rooms/join', { inviteCode });
      navigate(`/workspace/${data.roomId}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to join room');
    }
  };

  const handleDeleteRoom = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) return;
    
    try {
      await API.delete(`/rooms/${roomId}`);
      setRooms(rooms.filter(r => r._id !== roomId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete room');
    }
  };

  return (
    <div className="bg-background text-on-surface font-geist selection:bg-primary/30 min-h-screen">
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

      <main className="pt-[40px]">
        <div className="max-w-7xl mx-auto px-gutter py-6">
          {/* Top Row: Hero & Join */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
            <div 
              onClick={() => setIsCreateModalOpen(true)}
              className="lg:col-span-8 group relative overflow-hidden rounded-xl bg-primary-container p-6 flex flex-col justify-between min-h-[160px] cursor-pointer transition-all hover:brightness-110 active:scale-[0.99]"
            >
              <div className="relative z-10 text-left">
                <h2 className="font-geist text-[24px] font-bold text-on-primary-container mb-1">Initialize Workspace</h2>
                <p className="text-on-primary-container/80 max-w-md text-[13px]">Launch a fresh collaborative room for React, Python, or Java.</p>
              </div>
              <div className="relative z-10 mt-4">
                <button className="bg-on-primary-container text-white px-4 py-2 rounded font-bold flex items-center gap-2 transition-transform group-hover:translate-x-1 font-mono text-[11px] uppercase tracking-wider">
                  Create New Room
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                </button>
              </div>
              <div className="absolute right-[-10px] bottom-[-10px] opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                <span className="material-symbols-outlined text-[160px]">terminal</span>
              </div>
            </div>

            <div className="lg:col-span-4 bg-surface-container border border-outline-variant rounded-xl p-6 flex flex-col justify-center text-left">
              <h3 className="font-geist text-[16px] font-bold text-on-surface mb-3 uppercase tracking-tight">Join Room</h3>
              <form onSubmit={handleJoinRoom} className="space-y-3">
                <div className="relative">
                  <input 
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded p-2.5 font-mono text-[13px] text-on-surface focus:outline-none focus:border-primary transition-all placeholder:text-on-surface-variant/40" 
                    placeholder="ENTER INVITE CODE OR ROOM ID" 
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                  />
                </div>
                <button type="submit" className="w-full bg-secondary text-on-secondary px-4 py-2.5 rounded font-bold hover:opacity-90 transition-opacity font-mono text-[11px] uppercase tracking-wider">
                  Join Session
                </button>
              </form>
            </div>
          </section>

          {/* Stats & Header Row */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="glass-panel p-3 rounded-lg border border-outline-variant/30 flex flex-col items-center justify-center">
                <span className="font-mono text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Created</span>
                <span className="text-[18px] font-bold text-primary font-mono">{user?.stats?.roomsCreated || 0}</span>
              </div>
              <div className="glass-panel p-3 rounded-lg border border-outline-variant/30 flex flex-col items-center justify-center">
                <span className="font-mono text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Collabs</span>
                <span className="text-[18px] font-bold text-secondary font-mono">{user?.stats?.collaborators || 0}</span>
              </div>
              <div className="glass-panel p-3 rounded-lg border border-outline-variant/30 flex flex-col items-center justify-center">
                <span className="font-mono text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Score</span>
                <span className="text-[18px] font-bold text-on-surface font-mono">{user?.stats?.contributions || 0}</span>
              </div>
              <div className="glass-panel p-3 rounded-lg border border-outline-variant/30 flex flex-col items-center justify-center">
                <span className="font-mono text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Active</span>
                <span className="text-[18px] font-bold text-tertiary font-mono">{rooms.length}</span>
              </div>
            </div>
          </div>

          {/* Pending Invitations Section */}
          {invitations.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4 border-b border-outline-variant/30 pb-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">mail</span>
                <h2 className="font-geist text-[18px] font-bold">Pending Invitations</h2>
                <span className="bg-secondary text-on-secondary px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">{invitations.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {invitations.map((inv) => (
                  <div key={inv._id} className="glass-panel border-2 border-secondary/30 rounded-lg p-5 flex flex-col justify-between bg-secondary/5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={inv.sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(inv.sender.name)}`} 
                          alt={inv.sender.name} 
                          className="w-10 h-10 rounded-lg border border-outline-variant"
                        />
                        <div>
                          <p className="font-geist text-[15px] font-bold text-on-surface">{inv.sender.name}</p>
                          <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">Invited you</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-surface-container-lowest/50 p-3 rounded-lg border border-outline-variant/30 mb-4">
                      <p className="font-geist text-[14px] font-bold text-on-surface truncate">{inv.roomId.name}</p>
                      <div className="flex items-center gap-1 mt-1 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[12px]">code</span>
                        <span className="font-mono text-[10px] uppercase">{inv.roomId.language}</span>
                        <span className="mx-1">•</span>
                        <span className="font-mono text-[10px] uppercase">{inv.role}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAcceptInvite(inv._id)}
                        className="flex-1 bg-primary text-on-primary py-2 rounded font-mono text-[10px] font-bold uppercase hover:opacity-90 transition-opacity"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => handleDeclineInvite(inv._id)}
                        className="flex-1 bg-surface-container-highest text-on-surface py-2 rounded font-mono text-[10px] font-bold uppercase hover:opacity-90 transition-opacity border border-outline-variant"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="flex items-center justify-between mb-4 border-b border-outline-variant/30 pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">history</span>
              <h2 className="font-geist text-[18px] font-bold">Recent Rooms</h2>
            </div>
            <div 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 text-primary cursor-pointer hover:underline font-mono text-[11px] font-bold uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Room
            </div>
          </div>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* New Room Card (Inline) */}
            <div 
              className="border-2 border-dashed border-outline-variant rounded-lg p-5 flex flex-col items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-all cursor-pointer group min-h-[160px]"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <span className="material-symbols-outlined text-[32px] mb-1 group-hover:scale-110 transition-transform">add</span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Initialize New Room</span>
            </div>

            {loading ? (
               [1, 2, 3].map(i => (
                <div key={i} className="glass-surface border border-outline-variant rounded-lg p-5 h-[160px] animate-pulse"></div>
               ))
            ) : (
              rooms.map((room) => (
                <div 
                  key={room._id} 
                  onClick={() => navigate(`/workspace/${room._id}`)}
                  className="glass-panel border border-outline-variant rounded-lg p-5 group hover:border-primary/50 transition-all cursor-pointer presence-glow-blue text-left flex flex-col justify-between min-h-[160px]"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="font-mono text-[10px] text-on-surface-variant mb-1 uppercase tracking-tighter truncate w-32">ID: {room.inviteCode}</span>
                      <h3 className="font-geist text-[18px] font-bold text-on-surface group-hover:text-primary transition-colors truncate w-40">{room.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {room.collaborators.slice(0, 2).map((c: any, i: number) => (
                          <img key={i} className="w-6 h-6 rounded-full border-2 border-surface bg-surface-container-highest" src={c.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user.name)}&size=24`} alt="" />
                        ))}
                      </div>
                      {room.owner._id === user?.id && (
                        <button 
                          onClick={(e) => handleDeleteRoom(e, room._id)}
                          className="p-1 text-on-surface-variant hover:text-error transition-colors rounded hover:bg-error/10"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-1 bg-surface-container-highest px-2 py-0.5 rounded">
                        <span className="material-symbols-outlined text-[14px] text-blue-400">code</span>
                        <span className="font-mono text-[10px] uppercase">{room.language}</span>
                      </div>
                      <div className="flex items-center gap-1 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        <span className="font-geist text-[11px]">{new Date(room.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-outline-variant/30">
                      <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <span className="font-mono text-[9px] uppercase font-bold tracking-wider">Access: {room.visibility}</span>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform text-[18px]">arrow_forward</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <footer className="md:hidden fixed bottom-0 w-full z-50 h-[24px] bg-surface-container-lowest border-t border-outline-variant px-4 flex justify-between items-center">
        <div className="flex items-center gap-2 text-on-surface">
          <span className="material-symbols-outlined text-[14px]">dashboard</span>
          <span className="font-mono text-[10px]">Dashboard</span>
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-[14px]">person</span>
          <span className="font-mono text-[10px]">{user?.name}</span>
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className={`w-1.5 h-1.5 rounded-full bg-secondary`}></span>
          <span className="font-mono text-[10px]">Online</span>
        </div>
      </footer>
    </div>
  );
};

export default RoomDashboard;
