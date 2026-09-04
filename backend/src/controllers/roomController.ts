import axios from 'axios';
import { Request, Response } from 'express';
import Room from '../models/Room.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Invitation from '../models/Invitation.js';
import Activity from '../models/Activity.js';
import Message from '../models/Message.js';
import Version from '../models/Version.js';
import mongoose from 'mongoose';
import { sendEmail } from '../utils/sendEmail.js';
import { deleteRoomState } from '../server.js';

// @desc    Execute code using Judge0 API
// @route   POST /api/rooms/execute
// @access  Private
export const executeCode = async (req: any, res: Response) => {
  try {
    const { language, code, fileName, roomId, stdin } = req.body;

    if (!code || !language) {
      return res.status(400).json({ message: 'Code and language are required' });
    }

    // Security: Check if user is a collaborator in this room
    if (roomId) {
      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }
      const isOwner = room.owner.toString() === req.user.id;
      const isCollaborator = room.collaborators.some(c => c.user.toString() === req.user.id);
      if (!isOwner && !isCollaborator) {
        return res.status(403).json({ message: 'Access denied: You are not a collaborator in this room' });
      }
    }

    // Paiza.io Language Mapping
    const paizaLanguageMap: Record<string, string> = {
      'javascript': 'javascript',
      'typescript': 'typescript',
      'python': 'python3',
      'cpp': 'cpp',
      'c': 'c',
      'java': 'java',
      'go': 'go',
      'rust': 'rust',
      'csharp': 'csharp',
      'php': 'php'
    };

    const paizaLang = paizaLanguageMap[language];

    if (!paizaLang) {
      return res.status(400).json({ message: `Language ${language} not supported for execution` });
    }

    // Call Paiza.io API (Truly Free, no key required)
    // 1. Create Runner
    const createResponse = await axios.post('https://api.paiza.io/runners/create', {
      source_code: code,
      language: paizaLang,
      input: stdin || '',
      api_key: 'guest'
    });

    const { id } = createResponse.data;
    let result: any = null;
    let attempts = 0;
    const maxAttempts = 10;

    // 2. Poll for results
    while (attempts < maxAttempts) {
      const detailsResponse = await axios.get(`https://api.paiza.io/runners/get_details?id=${id}&api_key=guest`);
      const details = detailsResponse.data;

      if (details.status === 'completed') {
        result = details;
        break;
      }

      // Wait 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!result) {
      return res.status(504).json({ message: 'Execution timed out on Paiza.io' });
    }

    // Map Paiza result to our format
    res.json({
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      compile: {
        stderr: result.build_stderr || ''
      },
      run: {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        code: result.exit_code,
        time: result.time,
        memory: result.memory
      },
      status: result.result === 'success' ? 'Success' : (result.result === 'failure' ? 'Runtime Error' : 'Error'),
      language: language,
      version: '' // Paiza doesn't return version in details
    });

    if (roomId) {
      try {
        await Activity.create({
          user: req.user.id,
          type: 'WORKSPACE_EDITED',
          description: `Executed ${language} code in workspace`,
          link: `/workspace/${roomId}`,
          metadata: { roomId }
        });
      } catch (err) {
        console.error('Error logging activity:', err);
      }
    }
  } catch (error: any) {
    console.error('Execution error details:', error.response?.data || error.message);
    
    // Do NOT forward HTTP errors that break the frontend. Instead, return a graceful error payload.
    const externalStatus = error.response?.status;
    const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
    
    res.json({ 
      stdout: '',
      stderr: `Execution Service Error (${externalStatus || 'N/A'}): ${errorMsg}\n\nNote: The free execution engine (Paiza) might be rate-limited. Please try again in a few seconds.`,
      compile: { stderr: '' },
      run: { stdout: '', stderr: '', code: 1, time: '0', memory: '0' },
      status: 'Execution Service Error',
      language: req.body.language || 'unknown',
      version: ''
    });
  }
};

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Private
export const createRoom = async (req: any, res: Response) => {
  try {
    const { name, description, language, visibility } = req.body;

    // Language-aware default files
    const defaultFiles: Record<string, { name: string, language: string, content: string }> = {
      javascript: { name: 'index.js', language: 'javascript', content: '// Happy coding!\nconsole.log("Hello CollabCode");' },
      typescript: { name: 'main.ts', language: 'typescript', content: '// Start collaborating...\nconst hello: string = "world";' },
      python: { name: 'main.py', language: 'python', content: '# Welcome to Python\nprint("Hello from CollabCode")' },
      cpp: { name: 'main.cpp', language: 'cpp', content: '#include <iostream>\n\nint main() {\n    std::cout << "Hello CollabCode" << std::endl;\n    return 0;\n}' },
      java: { name: 'Main.java', language: 'java', content: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello CollabCode");\n    }\n}' },
      c: { name: 'main.c', language: 'c', content: '#include <stdio.h>\n\nint main() {\n    printf("Hello CollabCode\\n");\n    return 0;\n}' },
      go: { name: 'main.go', language: 'go', content: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello CollabCode")\n}' },
      rust: { name: 'main.rs', language: 'rust', content: 'fn main() {\n    println!("Hello CollabCode");\n}' },
      csharp: { name: 'Program.cs', language: 'csharp', content: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello CollabCode");\n    }\n}' },
      php: { name: 'index.php', language: 'php', content: '<?php\necho "Hello CollabCode";' },
    };

    const defaultFile = defaultFiles[language] || defaultFiles.javascript;

    const room = await Room.create({
      name,
      description,
      language,
      visibility,
      owner: req.user.id,
      collaborators: [{ user: req.user.id, role: 'Admin' }],
      files: [{
        name: defaultFile.name,
        path: defaultFile.name,
        type: 'file',
        content: defaultFile.content,
        language: defaultFile.language,
        createdBy: req.user.id
      }]
    });

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.roomsCreated': 1, 'stats.contributions': 5 }
    });

    // Log Activity
    await Activity.create({
      user: req.user.id,
      type: 'ROOM_CREATED',
      description: `Created a new workspace: ${name}`,
      link: `/workspace/${room._id}`,
      metadata: { roomId: room._id }
    });

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating room' });
  }
};

// @desc    Get all rooms for the user
// @route   GET /api/rooms
// @access  Private
export const getMyRooms = async (req: any, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const rooms = await Room.find({
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id }
      ]
    }).populate('owner', 'name avatar')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Room.countDocuments({
      $or: [
        { owner: req.user.id },
        { 'collaborators.user': req.user.id }
      ]
    });

    res.json({
      rooms,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching rooms' });
  }
};

// @desc    Get room details
// @route   GET /api/rooms/:id
// @access  Private
export const getRoomById = async (req: any, res: Response) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('owner', 'name avatar email')
      .populate('collaborators.user', 'name avatar email');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is owner, collaborator or if it's public
    const isOwner = room.owner._id.toString() === req.user.id;
    const isCollaborator = room.collaborators.some(c => c.user._id.toString() === req.user.id);
    if (room.visibility === 'Private' && !isOwner && !isCollaborator) {
      return res.status(403).json({ message: 'Access denied to this private room' });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching room details' });
  }
};

// @desc    Update room details
// @route   PUT /api/rooms/:id
// @access  Private
export const updateRoom = async (req: any, res: Response) => {
  try {
    const { name, description, visibility, language } = req.body;
    const room = await Room.findById(req.params.id);

    if (!room) return res.status(404).json({ message: 'Room not found' });

    // Only owner or Admin can update room settings
    const isOwner = room.owner.toString() === req.user.id;
    const isAdmin = room.collaborators.some(c => c.user.toString() === req.user.id && c.role === 'Admin');
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this room' });
    }

    room.name = name || room.name;
    room.description = description || room.description;
    room.visibility = visibility || room.visibility;
    room.language = language || room.language;

    await room.save();
    
    if (req.io) {
      req.io.to(room._id.toString()).emit('room-updated', room);
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating room' });
  }
};

// @desc    Update collaborator role
// @route   PUT /api/rooms/:id/collaborators/:userId
// @access  Private
export const updateCollaboratorRole = async (req: any, res: Response) => {
  try {
    const { role } = req.body;
    const room = await Room.findById(req.params.id);

    if (!room) return res.status(404).json({ message: 'Room not found' });

    const isOwner = room.owner.toString() === req.user.id;
    const isAdmin = room.collaborators.some(c => c.user.toString() === req.user.id && c.role === 'Admin');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Only Admins can update roles' });
    }

    const collabIndex = room.collaborators.findIndex(c => c.user.toString() === req.params.userId);
    if (collabIndex === -1) return res.status(404).json({ message: 'Collaborator not found' });

    // Cannot change owner's role
    if (room.owner.toString() === req.params.userId) {
      return res.status(400).json({ message: 'Cannot change owner role' });
    }

    room.collaborators[collabIndex].role = role;
    await room.save();

    if (req.io) {
      req.io.to(room._id.toString()).emit('collaborators-updated');
    }

    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating role' });
  }
};

// @desc    Get room messages
// @route   GET /api/rooms/:id/messages
// @access  Private
export const generateInviteCode = async (req: any, res: Response) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    // Check if user is Admin
    const collaborator = room.collaborators.find(c => c.user.toString() === req.user.id);
    if (!collaborator || collaborator.role !== 'Admin') {
      return res.status(403).json({ message: 'Only Admins can generate an invite code' });
    }

    room.inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    await room.save();

    res.json({ message: 'Invite code generated', inviteCode: room.inviteCode });
  } catch (error) {
    res.status(500).json({ message: 'Server error generating invite code', error });
  }
};

export const getRoomMessages = async (req: any, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is owner or collaborator
    const isOwner = room.owner.toString() === req.user.id;
    const isCollaborator = room.collaborators.some(c => c.user.toString() === req.user.id);
    if (room.visibility === 'Private' && !isOwner && !isCollaborator) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const total = await Message.countDocuments({ room: room._id });
    const messages = await Message.find({ room: room._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name avatar');

    res.json({
      messages,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
};

// @desc    Save a workspace version snapshot
// @route   POST /api/rooms/:id/versions
// @access  Private
export const saveRoomVersion = async (req: any, res: Response) => {
  try {
    const { name } = req.body;
    const room = await Room.findById(req.params.id);

    if (!room) return res.status(404).json({ message: 'Room not found' });

    const isOwner = room.owner.toString() === req.user.id;
    const isCollaborator = room.collaborators.some(c => c.user.toString() === req.user.id && (c.role === 'Admin' || c.role === 'Editor'));
    if (!isOwner && !isCollaborator) return res.status(403).json({ message: 'Only Admins and Editors can save versions' });

    const version = await Version.create({
      room: room._id,
      createdBy: req.user.id,
      name: name || `Snapshot ${new Date().toLocaleString()}`,
      files: room.files
    });

    res.status(201).json(version);
  } catch (error) {
    res.status(500).json({ message: 'Server error saving version' });
  }
};

// @desc    Get workspace versions
// @route   GET /api/rooms/:id/versions
// @access  Private
export const getRoomVersions = async (req: any, res: Response) => {
  try {
    const versions = await Version.find({ room: req.params.id })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name');
    res.json(versions);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching versions' });
  }
};

// @desc    Restore a workspace version
// @route   POST /api/rooms/:id/versions/:versionId/restore
// @access  Private
export const restoreRoomVersion = async (req: any, res: Response) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const isOwner = room.owner.toString() === req.user.id;
    const isCollaborator = room.collaborators.some(c => c.user.toString() === req.user.id && (c.role === 'Admin' || c.role === 'Editor'));
    if (!isOwner && !isCollaborator) return res.status(403).json({ message: 'Only Admins and Editors can restore versions' });

    const version = await Version.findById(req.params.versionId);
    if (!version) return res.status(404).json({ message: 'Version not found' });

    room.files = version.files as typeof room.files;
    await room.save();

    if (req.io) {
      req.io.to(room._id.toString()).emit('version-restored', version.files);
    }

    res.json({ message: 'Version restored successfully', files: room.files });
  } catch (error) {
    res.status(500).json({ message: 'Server error restoring version' });
  }
};

// @desc    Invite user to room by email
// @route   POST /api/rooms/:id/invite
// @access  Private
export const inviteToRoom = async (req: any, res: Response) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const { email, role } = req.body;

    // Basic email validation
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!email || !emailRegex.test(email)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const room = await Room.findById(req.params.id).session(session);

    if (!room) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if current user is Owner or Admin
    const isOwner = room.owner.toString() === req.user.id;
    const currentUserRole = room.collaborators.find(c => c.user.toString() === req.user.id)?.role;
    
    if (!isOwner && currentUserRole !== 'Admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'Only Admins can invite collaborators' });
    }

    // Check if user is already a collaborator
    const invitedUser = await User.findOne({ email }).session(session);
    if (invitedUser && room.collaborators.some(c => c.user.toString() === invitedUser._id.toString())) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'User is already a collaborator' });
    }

    // Check for existing pending invitation
    const existingInvitation = await Invitation.findOne({ 
      receiverEmail: email.toLowerCase(), 
      roomId: room._id, 
      status: 'pending' 
    }).session(session);

    if (existingInvitation) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'A pending invitation already exists for this email' });
    }

    // 1. Create Invitation
    const invitation = await Invitation.create([{
      sender: req.user.id,
      receiverEmail: email.toLowerCase(),
      roomId: room._id,
      role: role || 'Viewer'
    }], { session });

    // 2. If user exists, create DB Notification
    if (invitedUser) {
      const notification = await Notification.create([{
        recipient: invitedUser._id,
        sender: req.user.id,
        type: 'INVITE',
        message: `${req.user.name} invited you to join ${room.name}`,
        link: `/notifications`,
        data: { roomId: room._id, invitationId: invitation[0]._id, role, status: 'pending' }
      }], { session });

      if (req.io) {
        req.io.to(`user_${invitedUser._id}`).emit('new-notification', {
          ...notification[0].toObject(),
          sender: { _id: req.user.id, name: req.user.name, avatar: req.user.avatar }
        });
        
        // Push unread count update
        const unreadCount = await Notification.countDocuments({ recipient: invitedUser._id, isRead: false }).session(session);
        req.io.to(`user_${invitedUser._id}`).emit('notification-count-update', { count: unreadCount });
      }
    }

    await session.commitTransaction();
    session.endSession();

    // 3. Send Email (Post-transaction, non-blocking)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    sendEmail({
      email: email,
      subject: `Invitation to join ${room.name}`,
      message: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #6200ee;">You've been invited!</h2>
          <p>${req.user.name} has invited you to collaborate on the room <strong>${room.name}</strong> as a <strong>${role}</strong>.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${frontendUrl}/workspace/${room._id}" style="background-color: #6200ee; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Open Workspace</a>
          </div>
          <p>If you don't have an account, please sign up using this email.</p>
        </div>
      `,
    }).catch(emailErr => console.error('Email invitation failed to send:', emailErr));

    return res.json({ message: 'Invitation sent successfully' });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error('Invitation error:', error);
    return res.status(500).json({ message: 'Server error during invitation' });
  }
};

// @desc    Accept an invitation
// @route   POST /api/rooms/invitations/:id/accept
// @access  Private
export const acceptInvitation = async (req: any, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const invitation = await Invitation.findById(req.params.id).session(session);
    if (!invitation || invitation.status !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Invitation not found or already processed' });
    }

    if (invitation.receiverEmail !== req.user.email.toLowerCase()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'This invitation was not sent to you' });
    }

    const room = await Room.findById(invitation.roomId).session(session);
    if (!room) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Room not found' });
    }

    // Add/Update collaborator
    const collabIndex = room.collaborators.findIndex(c => c.user.toString() === req.user.id);
    if (collabIndex === -1) {
       room.collaborators.push({ user: req.user.id, role: invitation.role });
    } else {
       room.collaborators[collabIndex].role = invitation.role;
    }
    await room.save({ session });

    // Update invitation
    invitation.status = 'accepted';
    await invitation.save({ session });

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.collaborators': 1, 'stats.contributions': 3 }
    }).session(session);

    // Create activity
    await Activity.create([{
      user: req.user.id,
      type: 'ROOM_JOINED',
      description: `Accepted invitation to join ${room.name}`,
      link: `/workspace/${room._id}`,
      metadata: { roomId: room._id }
    }], { session });

    // Mark related notification as read and update data status
    await Notification.updateMany(
      { 
        recipient: req.user.id, 
        'data.invitationId': invitation._id 
      },
      { 
        $set: { 
          isRead: true, 
          'data.status': 'accepted' 
        } 
      }
    ).session(session);

    await session.commitTransaction();
    session.endSession();

    if (req.io) {
      req.io.to(room._id.toString()).emit('collaborators-updated');
      req.io.to(`user_${req.user.id}`).emit('notification-updated');
    }

    res.json({ message: 'Invitation accepted successfully', roomId: room._id });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error accepting invitation:', error);
    res.status(500).json({ message: 'Server error accepting invitation' });
  }
};

// @desc    Decline an invitation
// @route   POST /api/rooms/invitations/:id/decline
// @access  Private
export const declineInvitation = async (req: any, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const invitation = await Invitation.findById(req.params.id).session(session);
    if (!invitation || invitation.status !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Invitation not found or already processed' });
    }

    if (invitation.receiverEmail !== req.user.email.toLowerCase()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ message: 'This invitation was not sent to you' });
    }

    invitation.status = 'declined';
    await invitation.save({ session });

    // Create activity
    await Activity.create([{
      user: req.user.id,
      type: 'ROOM_JOINED',
      description: `Declined invitation to join workspace`,
      metadata: { roomId: invitation.roomId }
    }], { session });

    // Mark notification as read
    await Notification.updateMany(
      { 
        recipient: req.user.id, 
        'data.invitationId': invitation._id 
      },
      { 
        $set: { 
          isRead: true, 
          'data.status': 'declined' 
        } 
      }
    ).session(session);

    await session.commitTransaction();
    session.endSession();

    if (req.io) {
      req.io.to(`user_${req.user.id}`).emit('notification-updated');
    }

    res.json({ message: 'Invitation declined successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'Server error declining invitation' });
  }
};

// @desc    Get user's pending invitations
// @route   GET /api/rooms/invitations/me
// @access  Private
export const getMyInvitations = async (req: any, res: Response) => {
  try {
    const invitations = await Invitation.find({
      receiverEmail: req.user.email.toLowerCase(),
      status: 'pending'
    }).populate('sender', 'name avatar').populate('roomId', 'name language');

    res.json(invitations);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching invitations' });
  }
};

// @desc    Remove collaborator from room
// @route   DELETE /api/rooms/:id/collaborators/:userId
// @access  Private
export const removeCollaborator = async (req: any, res: Response) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if current user is Admin
    const currentUserRole = room.collaborators.find(c => c.user.toString() === req.user.id)?.role;
    const isOwner = room.owner.toString() === req.user.id;
    
    if (!isOwner && currentUserRole !== 'Admin') {
      return res.status(403).json({ message: 'Only Admins can remove collaborators' });
    }

    // Cannot remove the owner
    if (room.owner.toString() === req.params.userId) {
      return res.status(400).json({ message: 'Cannot remove the room owner' });
    }

    room.collaborators = room.collaborators.filter(c => c.user.toString() !== req.params.userId) as typeof room.collaborators;
    await room.save();
    
    if (req.io) {
      req.io.to(room._id.toString()).emit('collaborators-updated');
    }

    res.json({ message: 'Collaborator removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error removing collaborator' });
  }
};
// @desc    Get public rooms for explorer
// @route   GET /api/rooms/explore
// @access  Public
export const getExploreRooms = async (req: Request, res: Response) => {
  try {
    const { search, language } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const skip = (page - 1) * limit;

    let query: any = { visibility: 'Public' };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (language) {
      query.language = language;
    }

    const rooms = await Room.find(query)
      .populate('owner', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Room.countDocuments(query);

    res.json({
      rooms,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching explorer rooms' });
  }
};

// @desc    Join a room using invite code or room ID
// @route   POST /api/rooms/join
// @access  Private
export const joinRoomByCode = async (req: any, res: Response) => {
  try {
    const { inviteCode } = req.body;
    let room;

    if (!inviteCode) {
      return res.status(400).json({ message: 'Invite code or Room ID is required' });
    }

    // Try finding by Room ID first if it looks like a MongoDB ObjectId (24 chars)
    if (inviteCode.length === 24 && /^[0-9a-fA-F]+$/.test(inviteCode)) {
      room = await Room.findById(inviteCode);
    }

    // If not found by ID, try finding by inviteCode
    if (!room) {
      room = await Room.findOne({ inviteCode: inviteCode.toUpperCase() });
    }

    if (!room) {
      return res.status(404).json({ message: 'Room not found with that code or ID' });
    }

    // Check if already a collaborator
    const isCollaborator = room.collaborators.some(c => c.user.toString() === req.user.id);
    if (isCollaborator) {
      return res.json({ message: 'Already a collaborator', roomId: room._id });
    }

    // Check visibility
    if (room.visibility === 'Private' && !room.inviteCode) {
        // This is a sanity check, usually private rooms have codes if shared
    }

    room.collaborators.push({ user: req.user.id, role: 'Viewer' });
    await room.save();

    // Notify owner that someone joined
    await Notification.create({
      recipient: room.owner,
      sender: req.user.id,
      type: 'JOIN',
      message: `${req.user.name} joined your room ${room.name}`,
      link: `/workspace/${room._id}`,
      data: { roomId: room._id }
    });

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.collaborators': 1, 'stats.contributions': 3 }
    });

    // Log Activity
    await Activity.create({
      user: req.user.id,
      type: 'ROOM_JOINED',
      description: `Joined collaboration session in ${room.name}`,
      link: `/workspace/${room._id}`,
      metadata: { roomId: room._id }
    });
    
    if (req.io) {
      req.io.to(room._id.toString()).emit('collaborators-updated');
    }

    res.json({ message: 'Joined room successfully', roomId: room._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error joining room' });
  }
};

// @desc    Delete a room
// @route   DELETE /api/rooms/:id
// @access  Private
export const deleteRoom = async (req: any, res: Response) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if current user is owner
    if (room.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the room owner can delete this room' });
    }

    // Cascade delete related data
    await Activity.deleteMany({ 'metadata.roomId': room._id });
    await Notification.deleteMany({ 'data.roomId': room._id });
    await Message.deleteMany({ room: room._id });
    await Version.deleteMany({ room: room._id });
    await Invitation.deleteMany({ roomId: room._id });

    await Room.findByIdAndDelete(req.params.id);

    deleteRoomState(req.params.id);

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ message: 'Server error deleting room' });
  }
};
