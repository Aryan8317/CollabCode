import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../utils/AuthContext';

interface Message {
  username: string;
  message: string;
  timestamp: string;
}

const Workspace: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [code, setCode] = useState<string>("// Start coding...\n\nfunction hello() {\n  console.log('Hello CollabCode!');\n}");
  const [messages, setMessages] = useState<Message[]>([
    { username: 'System', message: 'Welcome to the room!', timestamp: '12:00' }
  ]);
  const [messageInput, setMessageInput] = useState('');
  const username = user?.username || `User_${Math.floor(Math.random() * 1000)}`;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to backend
    socketRef.current = io('http://localhost:5001');

    socketRef.current.emit('join-room', roomId, username);

    socketRef.current.on('code-update', (newCode: string) => {
      setCode(newCode);
    });

    socketRef.current.on('new-message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socketRef.current.on('user-joined', ({ username }: { username: string }) => {
      setMessages((prev) => [...prev, { username: 'System', message: `${username} joined the room`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomId, username]);

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      socketRef.current?.emit('code-change', { roomId, code: value });
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      socketRef.current?.emit('send-message', { roomId, message: messageInput, username });
      setMessageInput('');
    }
  };

  return (
    <div className="bg-background text-on-surface font-geist selection:bg-primary/30 h-screen flex flex-col overflow-hidden">
      {/* TopAppBar */}
      <header className="bg-surface-container-low border-b border-outline-variant flex justify-between items-center w-full px-gutter h-tab-height max-w-full fixed top-0 z-50">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <h1 className="font-geist text-[20px] font-bold text-primary tracking-tight">CollabCode</h1>
          <div className="h-4 w-px bg-outline-variant"></div>
          <span className="font-mono text-[12px] text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">terminal</span>
            {roomId?.toUpperCase() || 'COLLAB_ROOM'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1 bg-primary text-on-primary font-bold font-mono text-[11px] rounded-lg hover:brightness-110 active:scale-95 transition-all uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px]">share</span>
            Share
          </button>
          <div className="flex items-center gap-1 ml-4">
            <div className="flex -space-x-2 mr-2">
               <div className="w-7 h-7 rounded-full border-2 border-surface bg-primary text-on-primary flex items-center justify-center text-[10px] font-bold">A</div>
               <div className="w-7 h-7 rounded-full border-2 border-surface bg-secondary text-on-secondary flex items-center justify-center text-[10px] font-bold">U</div>
            </div>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-highest transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">settings</span>
            </button>
            <div className="ml-2 relative">
              <img 
                alt="User profile" 
                className="w-7 h-7 rounded-full ring-2 ring-secondary" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1KQuYYMAexZ7RlZNm3691dTJhyNVrDaY0s1cuJMvN9k1kbSw9TVDrvpJN69RW-cP5lzQMhrdgQCAMyb7kiFeskvfhkf5Ht3Omk9a3JVZue1BlBCo_GQalFl6nlnDeGiKphHvph25i3xctwbT_zxn08qv1CyLvOfKCvjVpEgFNwjHSYQHvNAk8wyDLr8uZ9k4rNiKFmHZdcuNiglax0_eGFY4gicEH2rOi9CtrwUrONnfVuxWdaHbgnEepwxolNqwCpwwnkYxJM_w"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 pt-[40px] pb-[24px] overflow-hidden">
        {/* SideNavBar */}
        <aside className="flex flex-col h-full w-sidebar-width pt-4 bg-surface-container-low border-r border-outline-variant">
          <div className="px-4 mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[20px]">account_tree</span>
              </div>
              <div>
                <h2 className="font-geist text-[14px] font-bold text-on-surface leading-tight uppercase truncate w-40">{roomId}</h2>
                <p className="font-geist text-[11px] text-on-surface-variant">TypeScript / React</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1">
            <div className="bg-surface-container-highest text-primary border-l-2 border-primary px-4 py-2 flex items-center gap-3 cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">folder_open</span>
              <span className="font-mono text-[12px]">Explorer</span>
            </div>
            <div className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container px-4 py-2 flex items-center gap-3 cursor-pointer transition-all hover:translate-x-1">
              <span className="material-symbols-outlined text-[18px]">group</span>
              <span className="font-mono text-[12px]">Collaborators</span>
            </div>
            {/* Members List Section */}
            <div className="mt-8 px-4">
              <h3 className="font-mono text-[11px] font-bold text-on-surface-variant mb-4 opacity-50 uppercase tracking-widest">MEMBERS</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 group cursor-pointer">
                  <div className="relative">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] text-on-primary">A</div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary border-2 border-surface-container-low rounded-full"></div>
                  </div>
                  <span className="font-mono text-[12px] text-on-surface">{username} (You)</span>
                </div>
              </div>
            </div>
          </nav>
          <div className="mt-auto p-4 space-y-1">
            <div className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container px-2 py-1.5 flex items-center gap-3 cursor-pointer rounded transition-all">
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span className="font-mono text-[12px]" onClick={() => navigate('/dashboard')}>Leave Room</span>
            </div>
          </div>
        </aside>

        {/* Center: Monaco Code Editor */}
        <section className="flex-1 flex flex-col bg-surface-container-lowest relative group">
          {/* Tabs */}
          <div className="flex bg-surface-container-low border-b border-outline-variant h-[36px]">
            <div className="flex items-center px-4 bg-surface-container-lowest border-t-2 border-primary text-primary border-r border-outline-variant gap-2 cursor-pointer">
              <span className="material-symbols-outlined text-[16px]">description</span>
              <span className="font-mono text-[12px]">main.ts</span>
            </div>
          </div>
          {/* Editor Surface */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="typescript"
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              options={{
                fontSize: 14,
                fontFamily: 'JetBrains Mono',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                roundedSelection: false,
                padding: { top: 16 },
                automaticLayout: true,
                backgroundColor: '#0b0e14'
              }}
            />
          </div>
        </section>

        {/* Right: Integrated Chat Panel */}
        <aside className="w-panel-width flex flex-col bg-surface-container border-l border-outline-variant">
          <div className="h-tab-height flex items-center px-4 border-b border-outline-variant">
            <span className="font-mono text-[11px] font-bold text-on-surface uppercase tracking-widest">Collaboration Chat</span>
            <span className="ml-auto w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
          </div>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[12px] font-bold ${msg.username === username ? 'text-primary' : msg.username === 'System' ? 'text-outline' : 'text-secondary'}`}>
                    {msg.username}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">{msg.timestamp}</span>
                </div>
                <div className={`p-3 rounded-xl rounded-tl-none text-[13px] text-on-surface glass-panel ${msg.username === username ? 'border border-primary/20' : ''}`}>
                  {msg.message}
                </div>
              </div>
            ))}
          </div>
          {/* Input */}
          <div className="p-4 border-t border-outline-variant bg-surface-container-low">
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input 
                className="w-full bg-surface-container-highest border border-outline-variant rounded-lg px-4 py-2 pr-10 text-[13px] text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline/50" 
                placeholder="Send a message..." 
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
              />
              <button type="submit" className="absolute right-2 text-primary hover:text-primary-container transition-colors">
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
          </div>
        </aside>
      </main>

      {/* BottomNavBar (Status Bar) */}
      <footer className="fixed bottom-0 w-full z-50 h-[24px] flex justify-between items-center px-4 bg-surface-container-lowest border-t border-outline-variant">
        <div className="flex items-center gap-4">
          <div className="text-on-surface flex items-center gap-1.5 font-mono text-[12px]">
            <span className="material-symbols-outlined text-[14px]">account_tree</span>
            main
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-on-surface flex items-center gap-1.5 font-mono text-[12px]">
            <span className="material-symbols-outlined text-[14px]">code</span>
            TypeScript
          </div>
          <div className="text-secondary flex items-center gap-1.5 font-mono text-[12px]">
            <span className="material-symbols-outlined text-[14px]">wifi_tethering</span>
            Connected
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Workspace;
