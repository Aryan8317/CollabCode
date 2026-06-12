import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { useAuth } from '../utils/AuthContext';
import API from '../utils/api';
import ShareModal from '../components/ShareModal';
import Navbar from '../components/Navbar';
import TerminalPanel from '../components/TerminalPanel';
import FileExplorer from '../components/FileExplorer';
import WorkspaceSearch from '../components/WorkspaceSearch';
import VersionHistoryModal from '../components/VersionHistoryModal';
import { getFileIcon } from '../utils/fileUtils';
import { defineMonacoThemes } from '../utils/monacoThemes';

interface Message {
  username: string;
  message: string;
  timestamp: string;
}

const COLORS = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'];

const Workspace: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, socket } = useAuth();
  
  const [roomData, setRoomData] = useState<any>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  
  // Multi-file state
  const [dbFiles, setDbFiles] = useState<any[]>([]); // The source of truth for the tree
  const [activeFilePath, setActiveFilePath] = useState('');
  
  // UI toggles
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalMode, setTerminalMode] = useState<'shell' | 'output' | 'stdin'>('shell');
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [stdin, setStdin] = useState('');
  const isDirtyRef = useRef(false);

  const username = useMemo(() => {
    return user?.name || `User_${Math.floor(Math.random() * 1000)}`;
  }, [user?.name]);

  const escapeRegex = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const editorRef = useRef<any>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const yProviderRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const currentRoomIdRef = useRef<string | null>(null);
  const activeFilePathRef = useRef(activeFilePath);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize/Reset Y.Doc when roomId changes
  useEffect(() => {
    if (roomId && currentRoomIdRef.current !== roomId) {
      if (ydocRef.current) {
        console.log(`[Yjs] Destroying old document for room: ${currentRoomIdRef.current}`);
        ydocRef.current.destroy();
      }
      console.log(`[Yjs] Initializing new document for room: ${roomId}`);
      const newDoc = new Y.Doc();
      ydocRef.current = newDoc;
      setYdoc(newDoc);
      currentRoomIdRef.current = roomId;
    }
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    activeFilePathRef.current = activeFilePath;
  }, [activeFilePath]);

  // Setup Yjs Provider once per room
  useEffect(() => {
    if (!roomId || !ydoc) return;

    const wsBaseUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:5001').trim();
    const wsUrl = `${wsBaseUrl}/yjs`;
    console.log(`[Yjs] Connecting to: ${wsUrl}/${roomId}`);

    const newProvider = new WebsocketProvider(wsUrl, roomId, ydoc);

    newProvider.on('status', (event: any) => {
      console.log(`[Yjs] Connection status for ${roomId}:`, event.status);
      if (event.status === 'connected') {
        setIsConnected(true);
      } else {
        if (event.status === 'disconnected') {
           setIsConnected(false);
        }
      }
    });

    newProvider.on('sync', (isSynced: boolean) => {
      console.log(`[Yjs] Sync status for ${roomId}:`, isSynced);
    });

    newProvider.awareness.setLocalStateField('user', { 
      name: username, 
      color: COLORS[Math.floor(Math.random() * COLORS.length)] 
    });

    yProviderRef.current = newProvider;

    return () => {
      console.log(`[Yjs] Disconnecting for ${roomId}`);
      newProvider.disconnect();
      yProviderRef.current = null;
    };
  }, [roomId, username, ydoc]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Keyboard shortcut: Ctrl+Shift+F to open workspace search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle active file path reset when current file is deleted
  useEffect(() => {
    if (activeFilePath && dbFiles.length > 0) {
      const exists = dbFiles.some(f => f.path === activeFilePath);
      if (!exists) {
        const firstFile = dbFiles.find(f => f.type === 'file');
        setActiveFilePath(firstFile?.path || '');
      }
    }
  }, [dbFiles, activeFilePath]);

  const myRole = useMemo(() => {
    return roomData?.collaborators?.find((c: any) => c.user._id === user?.id)?.role || (roomData?.owner?._id === user?.id ? 'Admin' : 'Viewer');
  }, [roomData, user?.id]);

  const canEdit = useMemo(() => myRole === 'Admin' || myRole === 'Editor', [myRole]);

  const [chatPage, setChatPage] = useState(1);
  const [hasMoreChat, setHasMoreChat] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMessages = async (page: number) => {
    try {
      const { data } = await API.get(`/rooms/${roomId}/messages?page=${page}&limit=50`);
      const msgArray = data.messages || [];
      const formattedMessages = msgArray.map((msg: any) => ({
        username: msg.sender?.name || 'Unknown',
        message: msg.content,
        timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })).reverse();
      
      setMessages(prev => page === 1 ? formattedMessages : [...formattedMessages, ...prev]);
      setHasMoreChat(data.page < data.pages);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  useEffect(() => {
    const fetchRoom = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const { data } = await API.get(`/rooms/${roomId}`);
        setRoomData(data);
        setDbFiles(data.files || []);
        if (data.files?.length > 0) {
          const firstFile = data.files.find((f: any) => f.type === 'file');
          if (firstFile) setActiveFilePath(firstFile.path);
        }
      } catch (err: any) {
        console.error('Error fetching room:', err);
        setFetchError(err.response?.data?.message || 'Failed to load workspace');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRoom();
    fetchMessages(1);

    if (!socket) return;

    const onConnect = () => {
      console.log('Socket connected');
      setIsConnected(true);
      socket.emit('join-room', roomId);
    };
const onDisconnect = () => {
  console.log('[Socket] Disconnected');
  setIsConnected(false);
};

const onRoomState = (payload: any) => {
  const users = payload?.activeUsers || (Array.isArray(payload) ? payload : []);
  setActiveUsers(users);
};

const onPresenceUpdate = (payload: any) => {
  const users = payload?.activeUsers || (Array.isArray(payload) ? payload : []);
  setActiveUsers(users);
};

    const onCollaboratorsUpdated = () => {
      fetchRoom();
    };

    const onFileCreated = (newFile: any) => {
      console.log(`[FileSync] Created: ${newFile.path} (${newFile.type})`);
      setDbFiles(prev => [...prev, newFile]);
    };

    const onFileRenamed = ({ oldPath, newPath, newName }: any) => {
      console.log(`[FileSync] Renamed: ${oldPath} -> ${newPath}`);
      setDbFiles(prev => prev.map(f => {
        if (f.path === oldPath) return { ...f, path: newPath, name: newName };
        if (f.path.startsWith(oldPath + '/')) {
          return { ...f, path: f.path.replace(new RegExp(`^${escapeRegex(oldPath)}/`), `${newPath}/`) };
        }
        return f;
      }));
      
      const currentPath = activeFilePathRef.current;
      if (currentPath === oldPath) {
        console.log(`[FileSync] Updating active file path: ${oldPath} -> ${newPath}`);
        setActiveFilePath(newPath);
      } else if (currentPath.startsWith(oldPath + '/')) {
        const regex = new RegExp(`^${escapeRegex(oldPath)}/`);
        const updatedPath = currentPath.replace(regex, `${newPath}/`);
        console.log(`[FileSync] Updating nested active file path: ${currentPath} -> ${updatedPath}`);
        setActiveFilePath(updatedPath);
      }
    };

    const onFileDeleted = ({ path, type }: { path: string, type: 'file' | 'folder' }) => {
      console.log(`[FileSync] Deleted: ${path} (${type})`);
      setDbFiles(prev => prev.filter(f => f.path !== path && !f.path.startsWith(path + '/')));
      
      // Cleanup Yjs shared types for deleted files
      if (yProviderRef.current && type === 'file') {
        // Destroy binding if it was for this file
        if (activeFilePathRef.current === path) {
           bindingRef.current?.destroy();
           bindingRef.current = null;
        }
      }
    };

    const onVersionRestored = (restoredFiles: any[]) => {
      setDbFiles(restoredFiles);
      if (restoredFiles.length > 0) {
        // Try to keep same active file if it exists, otherwise pick first file
        const currentActive = activeFilePathRef.current;
        const exists = restoredFiles.some(f => f.path === currentActive);
        if (!exists) {
          const firstFile = restoredFiles.find(f => f.type === 'file');
          if (firstFile) setActiveFilePath(firstFile.path);
        }
      }
    };

    const onNewMessage = (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(msg.username);
        return next;
      });
    };

    const onUserTyping = ({ username: typingUser, isTyping }: { username: string, isTyping: boolean }) => {
      if (typingUser === username) return;
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (isTyping) next.add(typingUser);
        else next.delete(typingUser);
        return next;
      });
    };

    const onUserSwitchedFile = ({ path, username: swUsername }: { path: string, username: string }) => {
      if (swUsername !== username) {
        setMessages((prev) => [...prev, { 
          username: 'System', 
          message: `${swUsername} is now viewing ${path.split('/').pop()}`, 
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        }]);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room-state', onRoomState);
    socket.on('presence-update', onPresenceUpdate);
    socket.on('collaborators-updated', onCollaboratorsUpdated);
    socket.on('file-created', onFileCreated);
    socket.on('file-renamed', onFileRenamed);
    socket.on('file-deleted', onFileDeleted);
    socket.on('version-restored', onVersionRestored);
    socket.on('new-message', onNewMessage);
    socket.on('user-typing', onUserTyping);
    socket.on('user-switched-file', onUserSwitchedFile);

    // Join room immediately if already connected
    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.emit('leave-room', roomId);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room-state', onRoomState);
      socket.off('presence-update', onPresenceUpdate);
      socket.off('collaborators-updated', onCollaboratorsUpdated);
      socket.off('file-created', onFileCreated);
      socket.off('file-renamed', onFileRenamed);
      socket.off('file-deleted', onFileDeleted);
      socket.off('version-restored', onVersionRestored);
      socket.off('new-message', onNewMessage);
      socket.off('user-typing', onUserTyping);
      socket.off('user-switched-file', onUserSwitchedFile);
    };
  }, [roomId, username, socket]);

  // Re-bind Monaco when active file changes or editor mounts
  useEffect(() => {
    let binding: MonacoBinding | null = null;
    let awareness: any = null;
    let updateCursors: any = null;
    const cursorDecorations = { ids: [] as string[] };

    if (activeFilePath) {
      socket?.emit('switch-file', { roomId, path: activeFilePath, username });
    }

    if (isEditorReady && editorRef.current && yProviderRef.current && activeFilePath) {
      const ydoc = yProviderRef.current.doc;
      const yText = ydoc.getText(activeFilePath);
      console.log(`[Yjs] Binding Monaco to path: ${activeFilePath} (Type length: ${yText.length})`);

      // Always destroy existing binding before creating a new one
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }

      const seedContentIfEmpty = () => {
        const seededMap = ydoc.getMap('seededFiles');
        if (!seededMap.has(activeFilePath)) {
          const dbFile = dbFiles.find(f => f.path === activeFilePath);
          ydoc.transact(() => {
            seededMap.set(activeFilePath, true);
            if (dbFile?.content && yText.length === 0) {
              console.log(`[Yjs] Seeding ${activeFilePath} from database content`);
              yText.insert(0, dbFile.content);
            }
          });
        }
      };

      if (yProviderRef.current.synced) {
        seedContentIfEmpty();
      } else {
        yProviderRef.current.once('sync', seedContentIfEmpty);
      }

      binding = new MonacoBinding(
        yText,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        yProviderRef.current.awareness
      );
      bindingRef.current = binding;

      // Render remote cursors from Yjs awareness
      awareness = yProviderRef.current.awareness;

      updateCursors = () => {
        const states = awareness.getStates();
        const newDecorations: any[] = [];
        states.forEach((state: any, clientId: number) => {
          if (clientId === awareness.clientID) return;
          if (!state.user) return;
          
          if (state.cursor) {
            try {
              const anchorPos = Y.createAbsolutePositionFromRelativePosition(
                Y.createRelativePositionFromJSON(state.cursor.anchor),
                ydoc
              );
              if (!anchorPos) return;
              const model = editorRef.current?.getModel();
              if (!model) return;
              const pos = model.getPositionAt(anchorPos.index);

              newDecorations.push({
                range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column + 1 },
                options: {
                  className: `remote-cursor-${clientId}`,
                  hoverMessage: { value: state.user.name },
                  before: {
                    content: state.user.name,
                    inlineClassName: 'yRemoteSelectionHead-label'
                  }
                }
              });
            } catch (err) {
              // Stale awareness state — skip
            }
          }
        });
        
        if (editorRef.current) {
          cursorDecorations.ids = editorRef.current.deltaDecorations(cursorDecorations.ids, newDecorations);
        }
      };

      awareness.on('change', updateCursors);
    }

    return () => {
      if (awareness && updateCursors) {
        awareness.off('change', updateCursors);
      }
      if (editorRef.current && cursorDecorations.ids.length > 0) {
        editorRef.current.deltaDecorations(cursorDecorations.ids, []);
      }
      if (binding) {
        binding.destroy();
        if (bindingRef.current === binding) {
          bindingRef.current = null;
        }
      }
    };
  }, [activeFilePath, isEditorReady, socket, dbFiles]);
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    setIsEditorReady(true);
  };

  const handleEditorWillMount = (monaco: any) => {
    defineMonacoThemes(monaco);
  };

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined && canEdit && activeFilePath && yProviderRef.current) {
      // Check if this change is already reflected in Yjs (to avoid feedback loop)
      const currentYText = yProviderRef.current.doc.getText(activeFilePath).toString();
      if (value === currentYText) {
        // Change came from Yjs sync, no need to emit code-change back to server
        return;
      }

      isDirtyRef.current = true;
      setIsSaving(true);
      socket?.emit('code-change', { roomId, fileName: activeFilePath, code: value }, (response: any) => {
        if (response && response.status === 'ok') {
          isDirtyRef.current = false;
          setIsSaving(false);
        } else {
          setIsSaving(false);
        }
      });
    }
  };

  const handleChatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    if (socket && canEdit) {
      socket.emit('typing', { roomId, username, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { roomId, username, isTyping: false });
      }, 1000);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && canEdit) {
      socket?.emit('send-message', { roomId, message: messageInput, username });
      socket?.emit('typing', { roomId, username, isTyping: false });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setMessageInput('');
    }
  };

  const handleCreateFile = (parentPath: string, type: 'file' | 'folder', name: string) => {
    if (!canEdit) return;
    const path = parentPath ? `${parentPath}/${name}` : name;
    const ext = name.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript', 'js': 'javascript', 'py': 'python', 'cpp': 'cpp', 'java': 'java', 'c': 'c', 'go': 'go', 'rs': 'rust', 'cs': 'csharp', 'php': 'php'
    };
    socket?.emit('file-create', { 
      roomId, 
      name, 
      path, 
      type, 
      language: type === 'file' ? (languageMap[ext || ''] || 'plaintext') : undefined 
    });
  };

  const handleRenameFile = (oldPath: string, newName: string) => {
    if (!canEdit) return;
    const parts = oldPath.split('/');
    parts[parts.length - 1] = newName;
    const newPath = parts.join('/');
    socket?.emit('file-rename', { roomId, oldPath, newPath, newName });
  };

  const handleMoveFile = (oldPath: string, newPath: string) => {
    if (!canEdit) return;
    socket?.emit('file-move', { roomId, oldPath, newPath });
  };

  const handleDuplicateFile = (path: string) => {
    if (!canEdit) return;
    socket?.emit('file-duplicate', { roomId, path });
  };

  const handleDeleteFile = (path: string, type: 'file' | 'folder') => {
    if (!canEdit) return;
    socket?.emit('file-delete', { roomId, path, type });
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) return;
    try {
      await API.delete(`/rooms/${roomId}`);
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete room');
    }
  };

  const handleSelectSearchResult = (path: string, lineNumber: number) => {
    setActiveFilePath(path);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.revealLineInCenter(lineNumber);
        editorRef.current.setPosition({ lineNumber, column: 1 });
        editorRef.current.focus();
      }
    }, 100);
  };

  const handleRunCode = async () => {
    if (!activeFile) return;
    setIsExecuting(true);
    setShowTerminal(true);
    setTerminalMode('output');
    setExecutionResult({ status: 'Executing...', stdout: '', stderr: '', compile: '' });

    const code = editorRef.current?.getValue() || activeFile.content || '';
    const payload = {
      fileName: activeFile.name,
      language: activeFile.language || 'javascript',
      code,
      roomId,
      stdin
    };

    console.log('Execution Request Payload:', payload);

    try {
      const { data } = await API.post('/rooms/execute', payload);
      setExecutionResult(data);
    } catch (err: any) {
      console.error('Execution failed:', err);
      setExecutionResult({ 
        stderr: err.response?.data?.details || err.response?.data?.message || 'Execution failed to start. Check your language selection.',
        status: 'Error'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const activeFile = dbFiles.find(f => f.path === activeFilePath);

  if (isLoading) {
    return (
      <div className="bg-background text-on-surface h-screen flex flex-col items-center justify-center gap-4 font-mono">
        <span className="material-symbols-outlined animate-spin text-[48px] text-primary">sync</span>
        <p className="uppercase tracking-[0.2em] text-[14px]">Initializing Workspace...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="bg-background text-on-surface h-screen flex flex-col items-center justify-center gap-6 font-mono text-center p-8">
        <span className="material-symbols-outlined text-[64px] text-error">error</span>
        <div>
          <h2 className="text-[20px] font-bold uppercase tracking-widest mb-2">Workspace Error</h2>
          <p className="text-on-surface-variant text-[14px]">{fetchError}</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          className="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all text-[12px]"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-surface font-geist selection:bg-primary/30 h-screen flex flex-col overflow-hidden">
      {isShareModalOpen && roomData && (
        <ShareModal 
          roomId={roomId!}
          roomName={roomData.name}
          inviteCode={roomData.inviteCode}
          collaborators={roomData.collaborators}
          onClose={() => setIsShareModalOpen(false)}
          onUpdate={() => {
            API.get(`/rooms/${roomId}`).then(({ data }) => setRoomData(data));
          }}
        />
      )}

      {isVersionModalOpen && (
        <VersionHistoryModal
          roomId={roomId!}
          onClose={() => setIsVersionModalOpen(false)}
          canEdit={canEdit}
        />
      )}

      <Navbar 
        leftContent={
          <div className="flex items-center gap-4">
            <div className="h-4 w-px bg-outline-variant"></div>
            <span className="font-mono text-[12px] text-on-surface-variant flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">terminal</span>
              {roomData?.name?.toUpperCase() || roomId?.toUpperCase() || 'COLLAB_ROOM'}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest ${myRole === 'Admin' ? 'bg-secondary/10 text-secondary' : myRole === 'Editor' ? 'bg-primary/10 text-primary' : 'bg-outline/10 text-outline'}`}>
              {myRole}
            </span>
          </div>
        }
        rightContent={
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRunCode}
              disabled={isExecuting || !activeFile}
              className="flex items-center gap-1.5 px-4 py-1 bg-secondary text-on-secondary font-bold font-mono text-[11px] rounded-lg hover:brightness-110 active:scale-95 transition-all uppercase tracking-wider disabled:opacity-50"
            >
              {isExecuting ? <span className="material-symbols-outlined animate-spin text-[16px]">sync</span> : <span className="material-symbols-outlined text-[16px]">play_arrow</span>}
              Run
            </button>
            <button 
              onClick={() => setIsVersionModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1 bg-surface-container-highest text-on-surface font-bold font-mono text-[11px] rounded-lg hover:brightness-110 active:scale-95 transition-all uppercase tracking-wider border border-outline-variant"
            >
              <span className="material-symbols-outlined text-[16px]">history</span>
              Versions
            </button>
            <button
              onClick={() => setIsSearchOpen(prev => !prev)}
              className={`flex items-center gap-2 px-3 py-1 font-bold font-mono text-[11px] rounded-lg hover:brightness-110 active:scale-95 transition-all uppercase tracking-wider border border-outline-variant ${isSearchOpen ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface'}`}
              title="Search workspace (Ctrl+Shift+F)"
            >
              <span className="material-symbols-outlined text-[16px]">search</span>
              Search
            </button>
            {!myRole && roomData?.visibility === 'Public' && (
              <button 
                onClick={async () => {
                  try {
                    await API.post('/rooms/join', { inviteCode: roomId });
                    const { data } = await API.get(`/rooms/${roomId}`);
                    setRoomData(data);
                  } catch (err: any) {
                    alert(err.response?.data?.message || 'Failed to join');
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-1 bg-primary text-on-primary font-bold font-mono text-[11px] rounded-lg hover:brightness-110 active:scale-95 transition-all uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                Join
              </button>
            )}
            {myRole === 'Admin' && (
              <button 
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1 bg-primary text-on-primary font-bold font-mono text-[11px] rounded-lg hover:brightness-110 active:scale-95 transition-all uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-[16px]">share</span>
                Share
              </button>
            )}
          </div>
        }
      />

      <main className="flex flex-1 pt-[40px] pb-[24px] overflow-hidden relative">
        <WorkspaceSearch 
          files={dbFiles} 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
          onSelectResult={handleSelectSearchResult} 
          ydoc={ydoc || undefined}
        />
        <aside className="flex flex-col h-full w-[260px] bg-surface-container-low border-r border-outline-variant">
          <div className="flex-1 border-b border-outline-variant/30 flex flex-col min-h-0">
            <FileExplorer 
              files={dbFiles} 
              activeFile={activeFilePath}
              onSelectFile={setActiveFilePath}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
              onRenameFile={handleRenameFile}
              onMoveFile={handleMoveFile}
              onDuplicateFile={handleDuplicateFile}
              canEdit={canEdit}
            />
          </div>
          <div className="h-[200px] flex flex-col overflow-y-auto p-4 space-y-4 shrink-0">
             <div>
                <h3 className="font-mono text-[11px] font-bold text-on-surface-variant mb-4 uppercase tracking-widest flex items-center justify-between">
                  Online Now 
                  <span className="text-secondary">{activeUsers.length}</span>
                </h3>
                <div className="space-y-3">
                  {activeUsers.map((u, i) => (
                     <div key={i} className="flex items-center gap-3">
                        <div className="relative">
                          <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&size=32`} className="w-5 h-5 rounded-full bg-surface-container" alt="" />
                          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-secondary border-2 border-surface-container-low rounded-full"></div>
                        </div>
                        <span className="font-mono text-[11px] truncate">{u.name} {u.id === user?.id ? '(You)' : ''}</span>
                     </div>
                  ))}
                </div>
             </div>

             <div className="mt-auto space-y-1">
              {roomData?.owner?._id === user?.id && (
                <div onClick={handleDeleteRoom} className="text-error hover:bg-error/10 px-2 py-1.5 flex items-center gap-3 cursor-pointer rounded transition-all">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  <span className="font-mono text-[11px]">Delete Room</span>
                </div>
              )}
              <div onClick={() => navigate('/dashboard')} className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container px-2 py-1.5 flex items-center gap-3 cursor-pointer rounded transition-all">
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span className="font-mono text-[11px]">Leave Room</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex-1 flex flex-col bg-surface-container-lowest relative min-w-0">
          <div className="flex bg-surface-container-low border-b border-outline-variant h-[36px] overflow-x-auto custom-scrollbar shrink-0">
            {dbFiles.filter(f => f.type === 'file').map((f) => (
               <div 
                 key={f.path} 
                 onClick={() => setActiveFilePath(f.path)}
                 className={`flex items-center px-4 border-r border-outline-variant gap-2 cursor-pointer whitespace-nowrap ${activeFilePath === f.path ? 'bg-surface-container-lowest border-t-2 border-t-primary text-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-highest border-t-2 border-t-transparent'}`}
               >
                 <span className="material-symbols-outlined text-[16px]">{getFileIcon(f.name)}</span>
                 <span className="font-mono text-[12px]">{f.name}</span>
               </div>
            ))}
          </div>
          
          <div className="flex-1 overflow-hidden text-left relative">
            {activeFilePath ? (
              <Editor
                height="100%"
                path={activeFilePath}
                language={activeFile?.language || 'plaintext'}
                theme={user?.editorSettings?.theme || 'vs-dark'}
                beforeMount={handleEditorWillMount}
                onMount={handleEditorDidMount}
                onChange={handleCodeChange}
                options={{
                  readOnly: !canEdit,
                  fontSize: user?.editorSettings?.fontSize || 14,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontLigatures: user?.editorSettings?.fontLigatures || false,
                  lineNumbers: (user?.editorSettings?.lineNumbers || 'on') as any,
                  minimap: { enabled: user?.editorSettings?.minimap !== false },
                  scrollBeyondLastLine: false,
                  padding: { top: 16 },
                  automaticLayout: true
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-on-surface-variant opacity-30 flex-col gap-4">
                <span className="material-symbols-outlined text-[64px]">code_off</span>
                <p className="font-mono text-[14px] uppercase tracking-widest">No active file</p>
              </div>
            )}
          </div>

          {showTerminal && (
            <div className="h-64 shrink-0 border-t border-outline-variant bg-surface-container-lowest relative flex flex-col">
               <div className="flex items-center justify-between px-4 py-1 bg-surface-container-low border-b border-outline-variant">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setTerminalMode('shell')}
                      className={`font-mono text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded ${terminalMode === 'shell' ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      Terminal
                    </button>
                    <button 
                      onClick={() => setTerminalMode('stdin')}
                      className={`font-mono text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded ${terminalMode === 'stdin' ? 'bg-surface-container-highest text-tertiary' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      Stdin
                    </button>
                    <button 
                      onClick={() => setTerminalMode('output')}
                      className={`font-mono text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded ${terminalMode === 'output' ? 'bg-surface-container-highest text-secondary' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      Output
                    </button>
                  </div>
                  <button onClick={() => setShowTerminal(false)} className="material-symbols-outlined text-on-surface-variant hover:text-error text-[18px]">close</button>
               </div>
               <div className="flex-1 relative">
                 <div className={`absolute inset-0 ${terminalMode === 'shell' ? 'block' : 'hidden'}`}>
                   <TerminalPanel socket={socket} roomId={roomId!} visible={showTerminal && terminalMode === 'shell'} canEdit={canEdit} />
                 </div>
                 <div className={`absolute inset-0 overflow-y-auto p-4 font-mono text-[13px] ${terminalMode === 'stdin' ? 'block' : 'hidden'}`}>
                    <div className="flex flex-col h-full gap-2">
                      <p className="text-on-surface-variant font-bold uppercase text-[10px] tracking-widest">Standard Input (stdin)</p>
                      <textarea 
                        className="flex-1 w-full bg-surface-container border border-outline-variant rounded-lg p-3 text-[13px] font-mono text-on-surface focus:outline-none focus:border-secondary transition-all resize-none placeholder:text-outline/30"
                        placeholder="Type input that will be sent to the program..."
                        value={stdin}
                        onChange={(e) => setStdin(e.target.value)}
                      />
                      <p className="text-[10px] text-on-surface-variant opacity-50 italic">Note: Input is sent when you click "Run".</p>
                    </div>
                 </div>
                 <div className={`absolute inset-0 overflow-y-auto p-4 font-mono text-[13px] ${terminalMode === 'output' ? 'block' : 'hidden'}`}>
                   {isExecuting ? (
                     <div className="text-secondary animate-pulse">Running {activeFile?.name}...</div>
                   ) : executionResult ? (
                     <div className="space-y-4">
                       {executionResult.compile && executionResult.compile.stderr && (
                         <div>
                           <p className="text-error font-bold mb-1 border-b border-error/30 inline-block uppercase text-[11px] tracking-widest">Compilation Error</p>
                           <pre className="text-error/80 whitespace-pre-wrap mt-2">{executionResult.compile.stderr}</pre>
                         </div>
                       )}
                       
                       {executionResult.run && (
                         <div className="space-y-4">
                            {executionResult.run.stdout || executionResult.run.stderr || (executionResult.compile && executionResult.compile.stderr) ? (
                              <>
                                {executionResult.run.stdout && (
                                  <div>
                                    <p className="text-secondary font-bold mb-1 border-b border-secondary/30 inline-block uppercase text-[10px] tracking-widest">stdout</p>
                                    <pre className="text-on-surface whitespace-pre-wrap mt-2">{executionResult.run.stdout}</pre>
                                  </div>
                                )}
                                
                                {executionResult.run.stderr && (
                                  <div>
                                    <p className="text-error font-bold mb-1 border-b border-error/30 inline-block uppercase text-[10px] tracking-widest">stderr</p>
                                    <pre className="text-error/80 whitespace-pre-wrap mt-2">{executionResult.run.stderr}</pre>
                                  </div>
                                )}
                              </>
                            ) : (
                               <span className="text-on-surface-variant italic">Program executed successfully with no console output.</span>
                            )}

                            <div className="mt-8 pt-4 border-t border-outline-variant/20 flex flex-wrap gap-x-8 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                               <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[14px]">timer</span>
                                  <span>Time: {executionResult.run.time || 0}s</span>
                               </div>
                               <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[14px]">memory</span>
                                  <span>Memory: {Math.round((executionResult.run.memory || 0) / 1024 / 1024)}MB</span>
                               </div>
                               <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[14px]">flag</span>
                                  <span>Status: {executionResult.run.code === 0 ? 'Success' : `Exit Code ${executionResult.run.code}`}</span>
                               </div>
                               {executionResult.version && (
                                 <div className="flex items-center gap-1.5 ml-auto">
                                    <span className="material-symbols-outlined text-[14px]">build</span>
                                    <span>{executionResult.language} v{executionResult.version}</span>
                                 </div>
                               )}
                            </div>
                         </div>
                       )}
                       
                       {!executionResult.run && !executionResult.compile && executionResult.status !== 'Executing...' && (
                         <div className="text-error font-mono text-[13px]">
                           {executionResult.stderr || 'Execution failed to start. Check your language selection.'}
                         </div>
                       )}                     </div>
                   ) : (
                     <div className="text-on-surface-variant opacity-50 flex items-center justify-center h-full flex-col gap-2">
                        <span className="material-symbols-outlined text-[32px]">play_circle</span>
                        <p className="uppercase text-[11px] tracking-widest font-bold">Run a file to see output here.</p>
                     </div>
                   )}
                 </div>
               </div>
            </div>
          )}
        </section>

        <aside className="w-[280px] flex flex-col bg-surface-container border-l border-outline-variant shrink-0">
          <div className="h-[36px] flex items-center px-4 border-b border-outline-variant">
            <span className="font-mono text-[11px] font-bold text-on-surface uppercase tracking-widest">Collaboration Chat</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {hasMoreChat && (
              <button 
                onClick={() => {
                  const nextPage = chatPage + 1;
                  setChatPage(nextPage);
                  fetchMessages(nextPage);
                }}
                className="w-full py-1 text-[10px] font-mono uppercase tracking-widest text-primary hover:bg-primary/10 rounded transition-colors"
              >
                Load Older Messages
              </button>
            )}
            {messages.map((msg, index) => (
              <div key={index} className="flex flex-col gap-1 text-left">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[11px] font-bold ${msg.username === username ? 'text-primary' : msg.username === 'System' ? 'text-outline' : 'text-secondary'}`}>
                    {msg.username}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">{msg.timestamp}</span>
                </div>
                <div className={`p-2.5 rounded-xl rounded-tl-none text-[12px] text-on-surface glass-panel ${msg.username === username ? 'border border-primary/20' : ''}`}>
                  {msg.message}
                </div>
              </div>
            ))}
            {typingUsers.size > 0 && (
              <div className="text-[10px] text-on-surface-variant italic text-left px-2">
                {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t border-outline-variant bg-surface-container-low">
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input 
                disabled={!canEdit}
                className="w-full bg-surface-container-highest border border-outline-variant rounded-lg px-4 py-2 pr-10 text-[12px] text-on-surface focus:outline-none focus:border-primary transition-all placeholder:text-outline/50 disabled:opacity-50" 
                placeholder={canEdit ? "Send a message..." : "Viewers cannot chat"} 
                type="text"
                value={messageInput}
                onChange={handleChatChange}
              />
              <button disabled={!canEdit} type="submit" className="absolute right-2 text-primary hover:text-primary-container transition-colors disabled:opacity-50">
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </form>
          </div>
        </aside>
      </main>

      <footer className="fixed bottom-0 w-full z-50 h-[24px] flex justify-between items-center px-4 bg-surface-container-lowest border-t border-outline-variant">
        <div className="flex items-center gap-4">
          <div className="text-on-surface flex items-center gap-1.5 font-mono text-[11px]">
            <span className="material-symbols-outlined text-[14px]">account_tree</span>
            main
          </div>
          <button 
            onClick={() => setShowTerminal(!showTerminal)}
            className={`flex items-center gap-1.5 font-mono text-[11px] hover:text-primary transition-colors cursor-pointer ${showTerminal ? 'text-primary' : 'text-on-surface-variant'}`}
          >
            <span className="material-symbols-outlined text-[14px]">terminal</span>
            Terminal
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-on-surface flex items-center gap-1.5 font-mono text-[11px]">
            <span className="material-symbols-outlined text-[14px]">code</span>
            {activeFilePath.split('.').pop()?.toUpperCase() || 'TXT'}
          </div>
          <div className={`flex items-center gap-1.5 font-mono text-[11px] ${isSaving ? 'text-secondary' : 'text-on-surface-variant'}`}>
            <span className={`material-symbols-outlined text-[14px] ${isSaving ? 'animate-spin' : ''}`}>
              {isSaving ? 'sync' : 'cloud_done'}
            </span>
            {isSaving ? 'Saving...' : 'Saved'}
          </div>
          <div className={`flex items-center gap-1.5 font-mono text-[11px] ${isConnected ? 'text-secondary' : 'text-error'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-secondary animate-pulse' : 'bg-error'}`}></span>
            <span className="material-symbols-outlined text-[14px]">{isConnected ? 'wifi_tethering' : 'wifi_off'}</span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>        </div>
      </footer>
    </div>
  );
};

export default Workspace;
