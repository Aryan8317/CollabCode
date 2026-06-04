import express from 'express';
import {
  register,
  login,
  getProfile,
  githubLogin,
  googleLogin,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
  logout,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/signup', register);
router.post('/login', login);
router.post('/github', githubLogin);
router.post('/google', googleLogin);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', protect, getProfile);
router.get('/logout', logout);

export default router;
