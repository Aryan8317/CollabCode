import express from 'express';
import { getUserProfile, updateUserProfile, changePassword, getUserActivity } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/profile/:id', getUserProfile);
router.get('/activity/:id', getUserActivity);
router.put('/profile', protect, updateUserProfile);
router.put('/change-password', protect, changePassword);

export default router;
