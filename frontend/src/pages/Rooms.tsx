import React from 'react';
import { useNavigate } from 'react-router-dom';

const RoomsPlaceholder: React.FC = () => {
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
      <main className="pt-[40px] flex items-center justify-center min-h-[calc(100vh-40px)]">
        <div className="text-center">
          <span className="material-symbols-outlined text-[64px] text-primary mb-4">meeting_room</span>
          <h2 className="text-[24px] font-bold mb-2">Rooms feature coming soon</h2>
          <p className="text-on-surface-variant">We're working hard to bring you a better way to manage your rooms.</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="mt-6 bg-primary text-on-primary px-6 py-2 rounded-lg font-bold"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
};

export default RoomsPlaceholder;
