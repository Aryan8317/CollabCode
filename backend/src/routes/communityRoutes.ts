import express from 'express';
import { 
  getLeaderboard, 
  createPost, 
  getPosts, 
  likePost, 
  addComment, 
  getComments, 
  getCommunityStats,
  deletePost,
  deleteComment
} from '../controllers/communityController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/leaderboard', getLeaderboard);
router.get('/stats', getCommunityStats);
router.get('/posts', getPosts);
router.post('/posts', protect, createPost);
router.delete('/posts/:id', protect, deletePost);
router.put('/posts/:id/like', protect, likePost);
router.get('/posts/:id/comments', getComments);
router.post('/posts/:id/comments', protect, addComment);
router.delete('/posts/:id/comments/:commentId', protect, deleteComment);

export default router;
