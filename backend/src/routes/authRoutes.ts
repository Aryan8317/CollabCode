import express from 'express';
import {
  register,
  login,
  getProfile,
  githubLogin,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/signup', register);
router.post('/login', login);
router.post('/github', githubLogin);
router.get('/profile', protect, getProfile);

export default router;
