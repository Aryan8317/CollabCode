import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import WebSocket, { WebSocketServer } from 'ws';
// @ts-ignore
import { setupWSConnection } from 'y-websocket/bin/utils';
import * as pty from 'node-pty';
import os from 'os';
import fs from 'fs';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import communityRoutes from './routes/communityRoutes.js';
import Room from './models/Room.js';
import Message from './models/Message.js';
import Activity from './models/Activity.js';
import User from './models/User.js';
import jwt from 'jsonwebtoken';

dotenv.config();

// Trim critical environment variables to prevent malformed URL/connection errors
const criticalEnvVars = [
  'FRONTEND_URL', 
  'MONGODB_URI', 
  'JWT_SECRET', 
  'GITHUB_CLIENT_ID', 
  'GITHUB_CLIENT_SECRET', 
  'GOOGLE_Client_ID', 
  'GOOGLE_Client_secret',
  'EMAIL_USER',
  'EMAIL_PASS'
];
criticalEnvVars.forEach(key => {
  if (process.env[key]) {
    process.env[key] = process.env[key]?.trim();
  }
});

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = createServer(app);

// CORS configuration - flexible matching
const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').trim();
const allowedOrigins = [frontendUrl, frontendUrl.replace(/\/$/, '')];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => 
      origin === allowed || 
      origin === allowed + '/' || 
      (allowed.includes('vercel.app') && origin.endsWith('.vercel.app'))
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Debug route
app.get('/api/debug', (req, res) => {
  res.json({
    nodeEnv: process.env.NODE_ENV,
    frontendUrl: process.env.FRONTEND_URL,
    allowedOrigins,
    headers: {
      origin: req.headers.origin,
      cookie: !!req.headers.cookie,
    },
    cookies: {
      hasToken: !!req.cookies?.token,
    }
  });
});

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);

// Strict limiter for email sending endpoints
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per hour
  message: { message: 'Too many attempts. Please try again after an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/resend-otp', emailLimiter);
app.use('/api/auth/forgot-password', emailLimiter);

// Setup Socket.IO for general app events (chat, notifications, terminal)
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.some(allowed => 
        origin === allowed || 
        origin === allowed + '/' || 
        (allowed.includes('vercel.app') && origin.endsWith('.vercel.app'))
      );
      if (isAllowed) callback(null, true);
      else callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.IO Middleware for JWT Auth
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.split('token=')[1]?.split(';')[0];

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    const user = await User.findById(decoded.id).select('name avatar');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.data.userId = user._id.toString();
    socket.data.userName = user.name;
    socket.data.userAvatar = user.avatar;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Setup WebSocket server for Yjs
const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', async (request, socket, head) => {
  const url = request.url || '';
  console.log(`Upgrade request for: ${url}`);

  if (url.startsWith('/yjs/')) {
    const cookieHeader = request.headers.cookie || '';
    let token = cookieHeader.split('token=')[1]?.split(';')[0];
    
    // Fallback to query param for token
    if (!token) {
      const urlObj = new URL(url, `http://${request.headers.host}`);
      token = urlObj.searchParams.get('token') || undefined;
    }
    
    if (!token) {
      console.warn(`[Yjs] Upgrade rejected: No token found for ${url}`);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET as string);
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } catch (err) {
      console.error(`[Yjs] Upgrade rejected: Token verification failed for ${url}`);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  }
});

wss.on('connection', (conn, req) => {
  const url = req.url || '';
  // Extract room name (everything after /yjs/)
  const roomName = url.replace(/^\/yjs\//, '').split('?')[0] || 'default-room';
  
  console.log(`Yjs connection established for room: ${roomName}`);
  
  // Track connections for debugging
  const activeRooms = (wss as any)._activeRooms || new Map();
  activeRooms.set(roomName, (activeRooms.get(roomName) || 0) + 1);
  (wss as any)._activeRooms = activeRooms;
  console.log(`Active Yjs connections for ${roomName}: ${activeRooms.get(roomName)}`);

  setupWSConnection(conn, req, { docName: roomName });

  conn.on('close', () => {
    activeRooms.set(roomName, Math.max(0, (activeRooms.get(roomName) || 0) - 1));
    console.log(`Yjs connection closed for room: ${roomName}. Remaining: ${activeRooms.get(roomName)}`);
  });
});

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());

// Attach io to req
app.use((req: any, res, next) => {
  req.io = io;
  next();
});

// Helper to check room permissions for socket events
const checkPermissions = async (socket: any, roomId: string, requiredRoles: string[]) => {
  try {
    if (!socket.data.userId || !roomId) return false;
    
    const room = await Room.findById(roomId);
    if (!room) return false;

    const userId = socket.data.userId;
    const isOwner = room.owner.toString() === userId;
    
    if (isOwner) {
      console.log(`Permission granted: User ${userId} is owner of room ${roomId}`);
      return true;
    }

    const collaborator = room.collaborators.find(c => c.user.toString() === userId);
    if (!collaborator) {
      console.warn(`Permission denied: User ${userId} is not a collaborator in room ${roomId}`);
      return false;
    }

    const hasPermission = requiredRoles.includes(collaborator.role);
    if (hasPermission) {
      console.log(`Permission granted: User ${userId} has role ${collaborator.role} in room ${roomId}`);
    } else {
      console.warn(`Permission denied: User ${userId} has role ${collaborator.role} but needs ${requiredRoles.join(' or ')}`);
    }

    return hasPermission;
  } catch (err) {
    console.error('Permission check error:', err);
    return false;
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/community', communityRoutes);

app.get('/', (req, res) => {
  res.send('CollabCode API is running!');
});

// Store room states, save timeouts, and terminals
const MAX_IN_MEMORY_ROOMS = 100;
const roomState: Record<string, { files: Record<string, string>, activeUsers: Record<string, any> }> = {};
const saveTimeouts: Record<string, NodeJS.Timeout> = {};
const socketTerminals: Record<string, { terminal: pty.IPty, roomId: string }> = {};

const flushRoomFilesToDB = async (roomId: string) => {
  if (!roomState[roomId]) return;
  try {
    const room = await Room.findById(roomId);
    if (room && room.files) {
      for (const [path, content] of Object.entries(roomState[roomId].files)) {
        const fileIndex = room.files.findIndex(f => f.path === path);
        if (fileIndex > -1) {
          room.files[fileIndex].content = content;
        } else {
          const name = path.split('/').pop() || path;
          const ext = name.split('.').pop()?.toLowerCase();
          let lang = 'plaintext';
          if (ext === 'ts' || ext === 'tsx') lang = 'typescript';
          else if (ext === 'js' || ext === 'jsx') lang = 'javascript';
          else if (ext === 'py') lang = 'python';
          else if (ext === 'java') lang = 'java';
          else if (ext === 'cpp' || ext === 'c') lang = 'cpp';
          else if (ext === 'go') lang = 'go';
          else if (ext === 'rs') lang = 'rust';
          else if (ext === 'php') lang = 'php';
          else if (ext === 'cs') lang = 'csharp';
          else if (ext === 'html') lang = 'html';
          else if (ext === 'css') lang = 'css';
          else if (ext === 'json') lang = 'json';

          room.files.push({ 
            name, 
            path, 
            content, 
            language: lang 
          });
        }
      }
      await room.save();
    }
  } catch (err) {
    console.error(`Error flushing files to DB for room ${roomId}:`, err);
  }
};

export const deleteRoomState = (roomId: string) => {
  delete roomState[roomId];
  if (saveTimeouts[roomId]) {
    clearTimeout(saveTimeouts[roomId]);
    delete saveTimeouts[roomId];
  }
};

const shell = os.platform() === 'win32' ? 'powershell.exe' : (os.platform() === 'darwin' ? '/bin/zsh' : '/bin/bash');

const escapeRegex = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getLanguageTemplate = (language?: string) => {
  switch (language) {
    case 'cpp':
      return '#include <iostream>\n\nint main() {\n    std::cout << "Hello World!" << std::endl;\n    return 0;\n}';
    case 'java':
      return 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}';
    case 'python':
      return 'print("Hello World!")';
    case 'javascript':
    case 'typescript':
      return 'console.log("Hello World!");';
    case 'c':
      return '#include <stdio.h>\n\nint main() {\n    printf("Hello World!\\n");\n    return 0;\n}';
    case 'go':
      return 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello World!")\n}';
    case 'rust':
      return 'fn main() {\n    println!("Hello World!");\n}';
    default:
      return '// New file...';
  }
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', async (roomId: string) => {
    console.log(`User ${socket.data.userId} joining room: ${roomId}`);
    socket.join(roomId);
    if (socket.data.userId) {
      socket.join(`user_${socket.data.userId}`);
    }
    
    // Kill existing terminal if user joins a different room
    if (socketTerminals[socket.id] && socketTerminals[socket.id].roomId !== roomId) {
      socketTerminals[socket.id].terminal.kill();
      delete socketTerminals[socket.id];
      socket.data.canEditTerminal = false;
    }

    // Skip roomState logic for private user rooms (e.g. notifications)
    if (roomId.startsWith('user_') || roomId === 'notifications') {
      return;
    }

    try {
      if (!roomState[roomId]) {
        // Prevent unbounded memory growth
        if (Object.keys(roomState).length >= MAX_IN_MEMORY_ROOMS) {
          console.warn('Max in-memory rooms reached. Skipping state initialization for:', roomId);
          // Still allow joining for basic communication, but no file state management
        } else {
          roomState[roomId] = { files: {}, activeUsers: {} };
          
          // Load initial state from DB only if it's a valid Room ID
          if (mongoose.Types.ObjectId.isValid(roomId)) {
            const room = await Room.findById(roomId);
            if (room && room.files) {
              room.files.forEach(f => {
                roomState[roomId].files[f.path] = f.content;
              });
              console.log(`Loaded ${room.files.length} files from DB for room ${roomId}`);
            }
          }
        }
      }

      if (roomState[roomId]) {
        roomState[roomId].activeUsers[socket.id] = {
          id: socket.data.userId,
          name: socket.data.userName,
          avatar: socket.data.userAvatar
        };

        console.log(`Room ${roomId} now has ${Object.keys(roomState[roomId].activeUsers).length} active users`);

        socket.emit('room-state', { activeUsers: Object.values(roomState[roomId].activeUsers) });
        io.to(roomId).emit('presence-update', { activeUsers: Object.values(roomState[roomId].activeUsers) });
        }
        } catch (err) {
        console.error('Error joining room:', err);
        }
        });

        socket.on('leave-room', (roomId: string) => {
        socket.leave(roomId);
        if (roomState[roomId] && roomState[roomId].activeUsers[socket.id]) {
        delete roomState[roomId].activeUsers[socket.id];
        io.to(roomId).emit('presence-update', { activeUsers: Object.values(roomState[roomId].activeUsers) });
        }
        });

  socket.on('terminal-init', async (roomId: string) => {
    if (!socket.data.userId) {
      console.warn('terminal-init called before userId was set');
      return;
    }

    if (socketTerminals[socket.id]) {
      socketTerminals[socket.id].terminal.kill();
      delete socketTerminals[socket.id];
    }

    try {
      const room = await Room.findById(roomId);
      if (!room) return;

      const isOwner = room.owner.toString() === socket.data.userId;
      const collab = room.collaborators.find(c => c.user.toString() === socket.data.userId);
      const canEdit = isOwner || (collab && (collab.role === 'Admin' || collab.role === 'Editor'));
      
      if (!canEdit) return;

      socket.data.canEditTerminal = true;
      socket.data.currentTerminalRoomId = roomId;

      // Find shell path dynamically
      const shells = [
        process.env.SHELL, 
        os.platform() === 'win32' ? 'powershell.exe' : 'sh', 
        'bash', 
        'zsh',
        '/bin/sh',
        '/bin/bash',
        '/bin/zsh'
      ].filter(Boolean) as string[];
      let terminal: any = null;
      let spawnError: any = null;
      
      // Sanitize environment
      const safeEnv: Record<string, string> = {
        PATH: process.env.PATH || '',
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        LANG: 'en_US.UTF-8',
        HOME: process.env.HOME || '/tmp'
      };

      for (const selectedShell of shells) {
        try {
          console.log(`[Terminal] Attempting to spawn shell: "${selectedShell}" with cwd: "${process.cwd()}"`);
          terminal = pty.spawn(selectedShell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 24,
            cwd: process.cwd(),
            env: safeEnv,
          });
          if (terminal) {
            console.log(`[Terminal] Successfully spawned: ${selectedShell} (PID: ${terminal.pid})`);
            break;
          }
        } catch (err: any) {
          spawnError = err;
          console.error(`[Terminal] Failed to spawn "${selectedShell}":`, err.message);
          if (err.stack) console.error(err.stack);
        }
      }

      if (!terminal) {
        throw spawnError || new Error('No compatible shell found');
      }

      socketTerminals[socket.id] = { terminal, roomId };

      terminal.onData((data: string) => {
        socket.emit('terminal-data', data);
      });

      terminal.onExit(() => {
        delete socketTerminals[socket.id];
        socket.data.canEditTerminal = false;
      });
    } catch (err) {
      console.error('Failed to spawn terminal:', err);
    }
  });

  socket.on('terminal-input', ({ data }: { data: string }) => {
    if (socketTerminals[socket.id] && socket.data.canEditTerminal) {
      socketTerminals[socket.id].terminal.write(data);
    }
  });

  socket.on('terminal-resize', ({ cols, rows }: { cols: number; rows: number }) => {
    if (socketTerminals[socket.id] && socket.data.canEditTerminal) {
      try {
        socketTerminals[socket.id].terminal.resize(cols, rows);
      } catch (err) {
        console.error('Terminal resize error:', err);
      }
    }
  });

  socket.on('terminal-close', () => {
    if (socketTerminals[socket.id]) {
      socketTerminals[socket.id].terminal.kill();
      delete socketTerminals[socket.id];
      socket.data.canEditTerminal = false;
    }
  });

  socket.on('code-change', async ({ roomId, fileName, code }: { roomId: string; fileName: string; code: string }, callback?: Function) => {
    if (!roomState[roomId] || !fileName || fileName.includes('../')) return;
    if (code && code.length > 500 * 1024) return; // 500KB limit

    const hasPermission = await checkPermissions(socket, roomId, ['Admin', 'Editor']);
    if (!hasPermission) {
      if (callback) callback({ status: 'error', message: 'Unauthorized' });
      return;
    }
    
    roomState[roomId].files[fileName] = code;

    // Debounced save to MongoDB
    if (saveTimeouts[roomId]) clearTimeout(saveTimeouts[roomId]);
    saveTimeouts[roomId] = setTimeout(() => flushRoomFilesToDB(roomId), 2000);

    if (callback) callback({ status: 'ok' });
  });

  socket.on('file-create', async ({ roomId, name, path, type, language }: { roomId: string; name: string, path: string, type: 'file' | 'folder', language?: string }) => {
    if (!roomState[roomId] || !path || path.includes('../')) return;
    if (name.length > 255 || path.length > 1024) return;
    
    const hasPermission = await checkPermissions(socket, roomId, ['Admin', 'Editor']);
    if (!hasPermission) return;

    const content = type === 'file' ? getLanguageTemplate(language) : '';
    if (type === 'file') {
      roomState[roomId].files[path] = content;
    }

    try {
      await Room.findByIdAndUpdate(roomId, {
        $push: { files: { name, path, type, content, language, createdBy: socket.data.userId } }
      });
    } catch (err) {
      console.error('Error creating file in DB:', err);
    }
    io.to(roomId).emit('file-created', { name, path, type, content, language });
  });

  socket.on('file-rename', async ({ roomId, oldPath, newPath, newName }: { roomId: string; oldPath: string, newPath: string, newName: string }) => {
    if (!roomState[roomId]) return;
    
    const hasPermission = await checkPermissions(socket, roomId, ['Admin', 'Editor']);
    if (!hasPermission) return;

    // Update in-memory state
    if (roomState[roomId].files[oldPath]) {
      roomState[roomId].files[newPath] = roomState[roomId].files[oldPath];
      delete roomState[roomId].files[oldPath];
    }

    try {
      const room = await Room.findById(roomId);
      if (room) {
        // Handle nested renames (if folder) — use escapeRegex to avoid regex injection
        room.files.forEach(f => {
          if (f.path === oldPath) {
            f.path = newPath;
            f.name = newName;
          } else if (f.path.startsWith(oldPath + '/')) {
            f.path = f.path.replace(new RegExp(`^${escapeRegex(oldPath)}/`), `${newPath}/`);
          }
        });
        await room.save();
      }
    } catch (err) {
      console.error('Error renaming file in DB:', err);
    }
    io.to(roomId).emit('file-renamed', { oldPath, newPath, newName });
  });

  socket.on('file-move', async ({ roomId, oldPath, newPath }: { roomId: string; oldPath: string, newPath: string }) => {
    if (!roomState[roomId]) return;

    const hasPermission = await checkPermissions(socket, roomId, ['Admin', 'Editor']);
    if (!hasPermission) return;

    // Update in-memory state
    if (roomState[roomId].files[oldPath]) {
      roomState[roomId].files[newPath] = roomState[roomId].files[oldPath];
      delete roomState[roomId].files[oldPath];
    }

    try {
      const room = await Room.findById(roomId);
      if (room) {
        room.files.forEach(f => {
          if (f.path === oldPath) {
            f.path = newPath;
          } else if (f.path.startsWith(oldPath + '/')) {
            f.path = f.path.replace(new RegExp(`^${escapeRegex(oldPath)}/`), `${newPath}/`);
          }
        });
        await room.save();
      }
    } catch (err) {
      console.error('Error moving file in DB:', err);
    }
    // file-moved can be handled exactly like file-renamed on the frontend
    const newName = newPath.split('/').pop() || '';
    io.to(roomId).emit('file-renamed', { oldPath, newPath, newName });
  });

  socket.on('file-duplicate', async ({ roomId, path }: { roomId: string; path: string }) => {
    if (!roomState[roomId]) return;

    const hasPermission = await checkPermissions(socket, roomId, ['Admin', 'Editor']);
    if (!hasPermission) return;

    try {
      const room = await Room.findById(roomId);
      if (room) {
        const fileToDuplicate = room.files.find(f => f.path === path);
        if (fileToDuplicate && fileToDuplicate.type === 'file') {
          const parts = path.split('/');
          const originalName = parts.pop() || '';
          const nameParts = originalName.split('.');
          const ext = nameParts.length > 1 ? `.${nameParts.pop()}` : '';
          const baseName = nameParts.join('.');
          const newName = `${baseName}_copy${ext}`;
          
          parts.push(newName);
          const newPath = parts.join('/');
          
          roomState[roomId].files[newPath] = roomState[roomId].files[path] || '';

          const newFile = {
            name: newName,
            path: newPath,
            type: 'file' as 'file',
            content: roomState[roomId].files[newPath],
            language: fileToDuplicate.language,
            createdBy: socket.data.userId
          };

          room.files.push(newFile);
          await room.save();
          
          io.to(roomId).emit('file-created', newFile);
        }
      }
    } catch (err) {
      console.error('Error duplicating file in DB:', err);
    }
  });

  socket.on('file-delete', async ({ roomId, path, type }: { roomId: string; path: string, type: 'file' | 'folder' }) => {
    if (!roomState[roomId] || path.includes('../')) return;

    const hasPermission = await checkPermissions(socket, roomId, ['Admin', 'Editor']);
    if (!hasPermission) return;

    if (type === 'file') {
      delete roomState[roomId].files[path];
    } else {
      // Delete all nested files from memory
      Object.keys(roomState[roomId].files).forEach(fPath => {
        if (fPath.startsWith(path + '/')) delete roomState[roomId].files[fPath];
      });
    }

    try {
      if (type === 'file') {
        await Room.updateOne({ _id: roomId }, { $pull: { files: { path } } });
      } else {
        // Delete folder and all its contents
        await Room.updateOne({ _id: roomId }, { 
          $pull: { files: { $or: [{ path: path }, { path: new RegExp('^' + escapeRegex(path) + '/') }] } } 
        });
      }
      await Activity.create({
        user: socket.data.userId,
        type: 'WORKSPACE_EDITED',
        description: `Deleted ${type} ${path.split('/').pop()} from workspace`,
        link: `/workspace/${roomId}`,
        metadata: { roomId }
      });
    } catch (err) {
      console.error('Error deleting file in DB:', err);
    }
    io.to(roomId).emit('file-deleted', { path, type });
  });

  socket.on('send-message', async ({ roomId, message, username }: { roomId: string; message: string; username: string }) => {
    if (!message || message.length > 2000) return; // 2KB limit

    // Only Admin/Editor can send messages
    const hasPermission = await checkPermissions(socket, roomId, ['Admin', 'Editor']);
    if (!hasPermission) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    io.to(roomId).emit('new-message', { username, message, timestamp });

    try {
      if (mongoose.Types.ObjectId.isValid(roomId) && socket.data.userId) {
        await Message.create({
          room: roomId,
          sender: socket.data.userId,
          username,
          message,
        });
      }
    } catch (err) {
      console.error('Error saving message to DB:', err);
    }
  });

  socket.on('typing', ({ roomId, username, isTyping }: { roomId: string, username: string, isTyping: boolean }) => {
    socket.to(roomId).emit('user-typing', { username, isTyping });
  });

  socket.on('switch-file', ({ roomId, path, username }: { roomId: string, path: string, username: string }) => {
    socket.to(roomId).emit('user-switched-file', { path, username });
  });

  socket.on('disconnecting', async () => {
    // Kill user terminal if exists
    if (socketTerminals[socket.id]) {
      socketTerminals[socket.id].terminal.kill();
      delete socketTerminals[socket.id];
    }

    for (const roomId of socket.rooms) {
      if (roomState[roomId] && roomState[roomId].activeUsers[socket.id]) {
        const userName = roomState[roomId].activeUsers[socket.id].name;
        delete roomState[roomId].activeUsers[socket.id];
        console.log(`User ${userName} (${socket.id}) left room: ${roomId}`);

        io.to(roomId).emit('presence-update', { activeUsers: Object.values(roomState[roomId].activeUsers) });

        // Clean up if no users left
        if (Object.keys(roomState[roomId].activeUsers).length === 0) {
          if (saveTimeouts[roomId]) {
            clearTimeout(saveTimeouts[roomId]);
            delete saveTimeouts[roomId];
            // Flush any pending unsaved changes before deleting room state
            await flushRoomFilesToDB(roomId);
          }
          delete roomState[roomId];
        }
      }
    }
  });
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
