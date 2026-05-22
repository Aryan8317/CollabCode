import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // In production, replace with your frontend URL
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('CollabCode API is running!');
});

// Store room states (simplified for now)
const roomCode: Record<string, string> = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId: string, username: string) => {
    socket.join(roomId);
    console.log(`${username} joined room: ${roomId}`);
    
    // Send existing code in the room to the new user
    if (roomCode[roomId]) {
      socket.emit('code-update', roomCode[roomId]);
    }

    socket.to(roomId).emit('user-joined', { username, socketId: socket.id });
  });

  socket.on('code-change', ({ roomId, code }: { roomId: string; code: string }) => {
    roomCode[roomId] = code;
    socket.to(roomId).emit('code-update', code);
  });

  socket.on('send-message', ({ roomId, message, username }: { roomId: string; message: string; username: string }) => {
    io.to(roomId).emit('new-message', { username, message, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  });

  socket.on('cursor-move', ({ roomId, cursor, username }: { roomId: string; cursor: any; username: string }) => {
    socket.to(roomId).emit('cursor-update', { username, cursor, socketId: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
