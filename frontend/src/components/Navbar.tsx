import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import API from '../utils/api';

interface NavbarProps {
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

const Navbar: React.FC<NavbarProps> = ({ leftContent, rightContent }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, socket } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  useEffect(() => {
    let isMounted = true;
    const fetchUnreadCount = async () => {
      try {
        const { data } = await API.get('/notifications/unread-count');
        if (isMounted) {
          setUnreadCount(data.count);
        }
      } catch (err) {
        console.error('Error fetching unread count:', err);
      }
    };

    fetchUnreadCount();
    
    if (socket) {
      const onNotificationCountUpdate = ({ count }: { count: number }) => {
        if (isMounted) setUnreadCount(count);
      };

      const onNewNotification = () => {
        fetchUnreadCount();
      };

      socket.on('notification-count-update', onNotificationCountUpdate);
      socket.on('new-notification', onNewNotification);

      return () => {
        socket.off('notification-count-update', onNotificationCountUpdate);
        socket.off('new-notification', onNewNotification);
      };
    }

    const interval = setInterval(fetchUnreadCount, 60000); // Check every 60s as backup
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.id, socket]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 z-50 w-full bg-surface-container-low border-b border-outline-variant h-[40px] flex justify-between items-center px-gutter backdrop-blur-md bg-opacity-80">
      <div className="flex items-center gap-6">
        <span 
          className="font-headline-md text-headline-md font-bold text-primary tracking-tight cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          CollabCode
        </span>
        
        {leftContent ? leftContent : (
          <nav className="hidden md:flex gap-4 items-center font-mono text-[11px] uppercase tracking-wider font-bold">
            <button 
              onClick={() => navigate('/rooms-explorer')} 
              className={`${isActive('/rooms-explorer') ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'} transition-colors`}
            >
              Rooms
            </button>
            <button 
              onClick={() => navigate('/community')} 
              className={`${isActive('/community') ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'} transition-colors`}
            >
              Community
            </button>
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        {rightContent}
        
        <button 
          onClick={() => navigate('/notifications')} 
          className="text-on-surface-variant hover:text-on-surface transition-colors p-1 flex items-center justify-center relative"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-secondary rounded-full border border-surface-container-low"></span>
          )}
        </button>
        
        <div className="relative" ref={dropdownRef}>
          <div 
            className="h-7 w-7 rounded-full border border-secondary p-0.5 ml-1 overflow-hidden cursor-pointer hover:ring-4 hover:ring-secondary/10 transition-all active:scale-95"
            onClick={toggleDropdown}
          >
            <img 
              alt="User avatar" 
              className="w-full h-full object-cover rounded-full" 
              src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=1d2026&color=adc6ff&size=64`}
            />
          </div>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right bg-surface-container-high border border-outline-variant rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-outline-variant bg-surface-container">
                <p className="text-[13px] font-bold text-on-surface truncate">{user?.name}</p>
                <p className="text-[11px] font-mono text-on-surface-variant truncate">@{user?.username || 'user'}</p>
              </div>
              
              <div className="p-1.5">
                <button 
                  onClick={() => { navigate('/profile'); setIsDropdownOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[12px] font-mono uppercase text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-all group"
                >
                  <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">account_circle</span>
                  My Profile
                </button>
                <button 
                  onClick={() => { navigate('/dashboard'); setIsDropdownOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[12px] font-mono uppercase text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-all group"
                >
                  <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">dashboard</span>
                  Dashboard
                </button>
                <button 
                  onClick={() => { navigate('/settings'); setIsDropdownOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[12px] font-mono uppercase text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-all group"
                >
                  <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">settings</span>
                  Settings
                </button>
              </div>

              <div className="p-1.5 border-t border-outline-variant">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[12px] font-mono uppercase text-error hover:bg-error/10 rounded-lg transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Logout Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
