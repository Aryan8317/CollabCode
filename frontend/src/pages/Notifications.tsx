import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import API from '../utils/api';
import Navbar from '../components/Navbar';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { user, socket } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();

    if (socket) {
      const onNewNotification = (notification: any) => {
        setNotifications(prev => [notification, ...prev]);
      };

      socket.on('new-notification', onNewNotification);

      return () => {
        socket.off('new-notification', onNewNotification);
      };
    }
  }, [user, socket]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/notifications');
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleAcceptInvite = async (e: React.MouseEvent, invitationId: string, notificationId: string) => {
    e.stopPropagation();
    try {
      await API.post(`/rooms/invitations/${invitationId}/accept`);
      await handleMarkAsRead(notificationId);
      // Refresh notifications to show updated state
      fetchNotifications();
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      alert(err.response?.data?.message || 'Error accepting invitation');
    }
  };

  const handleDeclineInvite = async (e: React.MouseEvent, invitationId: string, notificationId: string) => {
    e.stopPropagation();
    try {
      await API.post(`/rooms/invitations/${invitationId}/decline`);
      await handleMarkAsRead(notificationId);
      fetchNotifications();
    } catch (err: any) {
      console.error('Error declining invitation:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await API.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'INVITE': return 'meeting_room';
      case 'JOIN': return 'person_add';
      case 'MENTION': return 'alternate_email';
      case 'COMMENT': return 'chat';
      default: return 'notifications';
    }
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface selection:bg-primary/30 min-h-screen">
      <Navbar />

      <div className="flex pt-[40px] h-screen overflow-hidden">
        {/* SideNavBar */}
        <aside className="hidden md:flex flex-col h-full w-[260px] bg-surface-container-low border-r border-outline-variant pt-4 shrink-0">
          <div className="px-4 py-4 text-left">
            <div className="flex flex-col gap-1 mb-6">
              <span className="font-headline-md text-headline-md font-bold text-on-surface text-[14px]">NOTIFICATIONS</span>
              <span className="font-code-sm text-code-sm text-on-surface-variant text-[11px]">User Updates</span>
            </div>
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full py-2 bg-primary text-on-primary rounded font-mono text-[11px] font-bold uppercase flex items-center justify-center gap-2 mb-6 hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-[18px]">dashboard</span>
              Dashboard
            </button>
            <nav className="space-y-1">
              <div onClick={() => navigate('/rooms-explorer')} className="flex items-center gap-3 px-3 py-2 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer font-mono text-[11px] uppercase">
                <span className="material-symbols-outlined">folder_open</span>
                Explorer
              </div>
              <div onClick={() => navigate('/community')} className="flex items-center gap-3 px-3 py-2 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer font-mono text-[11px] uppercase">
                <span className="material-symbols-outlined">group</span>
                Community
              </div>
            </nav>
          </div>
          <div className="mt-auto border-t border-outline-variant p-4 space-y-1">
            <div onClick={() => navigate('/settings')} className="flex items-center gap-3 px-3 py-2 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer font-mono text-[11px] uppercase">
              <span className="material-symbols-outlined">settings</span>
              Settings
            </div>
            <div onClick={() => navigate('/profile')} className="flex items-center gap-3 px-3 py-2 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer font-mono text-[11px] uppercase">
              <span className="material-symbols-outlined">account_circle</span>
              Account
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-surface-container-lowest p-6 pb-24 text-left">
          <div className="max-w-4xl mx-auto">
            {/* Header Action Row */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface text-[28px] font-bold">Notification Center</h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1 text-[14px]">Manage your mentions, invites, and system alerts.</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleMarkAllAsRead}
                  className="font-mono text-[10px] font-bold text-primary hover:underline transition-all flex items-center gap-2 uppercase tracking-widest"
                >
                  <span className="material-symbols-outlined text-[16px]">done_all</span>
                  Mark all as read
                </button>
              </div>
            </div>

            {/* Bento Notification Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {loading ? (
                 <div className="col-span-12 space-y-4">
                   {[1, 2].map(i => (
                     <div key={i} className="glass-panel border border-outline-variant p-5 rounded-xl animate-pulse h-24"></div>
                   ))}
                 </div>
              ) : notifications.length > 0 ? (
                notifications.map((n) => (
                  <div 
                    key={n._id} 
                    onClick={() => {
                      handleMarkAsRead(n._id);
                      if (n.link) navigate(n.link);
                    }}
                    className={`col-span-12 md:col-span-12 glass-panel border border-outline-variant p-5 rounded-xl transition-all hover:border-primary/50 relative overflow-hidden group ${n.isRead ? 'opacity-70' : ''}`}
                  >
                    {!n.isRead && <div className="absolute top-0 right-0 p-4">
                      <span className="font-code-sm text-code-sm text-secondary bg-secondary/10 px-2 py-1 rounded font-mono text-[10px] font-bold uppercase">New {n.type}</span>
                    </div>}
                    <div className="flex gap-4 items-start">
                      <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined text-[32px]">{getTypeIcon(n.type)}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-body-md text-body-md text-on-surface mb-1 text-[15px]">
                          {n.message}
                        </p>
                        <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mb-2">{new Date(n.createdAt).toLocaleString()}</p>
                        
                        {n.type === 'INVITE' && n.data?.invitationId && n.data?.status !== 'accepted' && n.data?.status !== 'declined' && (
                          <div className="flex gap-2 mt-4">
                            <button 
                              onClick={(e) => handleAcceptInvite(e, n.data.invitationId, n._id)}
                              className="px-4 py-1.5 bg-primary text-on-primary rounded font-mono text-[10px] font-bold uppercase hover:opacity-90 transition-opacity"
                            >
                              Accept
                            </button>
                            <button 
                              onClick={(e) => handleDeclineInvite(e, n.data.invitationId, n._id)}
                              className="px-4 py-1.5 bg-surface-container-highest text-on-surface rounded font-mono text-[10px] font-bold uppercase hover:opacity-90 transition-opacity border border-outline-variant"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-12 py-20 text-center opacity-40">
                  <span className="material-symbols-outlined text-[64px] mb-4">notifications_off</span>
                  <p className="font-mono text-[14px] uppercase tracking-widest text-outline">No notifications yet</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Notifications;
