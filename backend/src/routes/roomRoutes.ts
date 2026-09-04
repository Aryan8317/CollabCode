import express from 'express';
import { 
  createRoom, 
  getMyRooms, 
  getRoomById, 
  inviteToRoom, 
  getExploreRooms, 
  joinRoomByCode, 
  deleteRoom, 
  executeCode, 
  removeCollaborator,
  getMyInvitations,
  acceptInvitation,
  declineInvitation,
  getRoomMessages,
  saveRoomVersion,
  getRoomVersions,
  restoreRoomVersion,
  updateRoom,
  generateInviteCode,
  updateCollaboratorRole
} from '../controllers/roomController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/explore', getExploreRooms);
router.post('/join', protect, joinRoomByCode);
router.post('/execute', protect, executeCode);
router.post('/', protect, createRoom);
router.get('/', protect, getMyRooms);
router.get('/invitations/me', protect, getMyInvitations);
router.post('/invitations/:id/accept', protect, acceptInvitation);
router.post('/invitations/:id/decline', protect, declineInvitation);
router.get('/:id', protect, getRoomById);
router.put('/:id', protect, updateRoom);
router.get('/:id/messages', protect, getRoomMessages);
router.post('/:id/invite-code', protect, generateInviteCode);
router.post('/:id/versions', protect, saveRoomVersion);
router.get('/:id/versions', protect, getRoomVersions);
router.post('/:id/versions/:versionId/restore', protect, restoreRoomVersion);
router.delete('/:id', protect, deleteRoom);
router.post('/:id/invite', protect, inviteToRoom);
router.put('/:id/collaborators/:userId', protect, updateCollaboratorRole);
router.delete('/:id/collaborators/:userId', protect, removeCollaborator);

export default router;
