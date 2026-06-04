import { Request, Response } from 'express';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';

import Room from '../models/Room.js';

// @desc    Get community leaderboard
// @route   GET /api/community/leaderboard
// @access  Public
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    // We still need to calculate score, but we can limit users with contributions > 0
    const users = await User.find({ 'stats.contributions': { $gt: 0 } })
      .select('name avatar username stats')
      .sort({ 'stats.contributions': -1 }) // Sort by contributions first as proxy
      .limit(50) // Limit to top candidates for ranking
      .lean();

    // Calculate score: (roomsCreated * 5) + (collaborators * 3) + contributions
    const rankedUsers = users.map((u: any) => {
      const score = (u.stats?.roomsCreated || 0) * 5 + (u.stats?.collaborators || 0) * 3 + (u.stats?.contributions || 0);
      return { ...u, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // Final Top 10

    res.json(rankedUsers);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching leaderboard' });
  }
};

// @desc    Get community stats
// @route   GET /api/community/stats
// @access  Public
export const getCommunityStats = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const publicRooms = await Room.countDocuments({ visibility: 'Public' });
    const totalPosts = await Post.countDocuments();
    
    res.json({
      totalUsers,
      totalPosts: totalPosts + publicRooms, // Aggregated active threads/rooms
      activeRegions: 24, // Keep this hardcoded as we don't have regional data yet
      latency: '14ms',   // Keep this hardcoded for aesthetic
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching stats' });
  }
};

// @desc    Create a post
// @route   POST /api/community/posts
// @access  Private
export const createPost = async (req: any, res: Response) => {
  try {
    const { content, tags } = req.body;
    const post = await Post.create({
      author: req.user.id,
      content,
      tags,
    });

    const populatedPost = await post.populate('author', 'name avatar username');
    res.status(201).json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating post' });
  }
};

// @desc    Get community posts (feed)
// @route   GET /api/community/posts
// @access  Public
export const getPosts = async (req: Request, res: Response) => {
  try {
    const { sort, page: pageQuery, limit: limitQuery } = req.query;
    const page = parseInt(pageQuery as string) || 1;
    const limit = parseInt(limitQuery as string) || 20;
    const skip = (page - 1) * limit;

    if (sort === 'popular') {
      const posts = await Post.aggregate([
        {
          $addFields: {
            likeCount: { $size: "$likes" }
          }
        },
        {
          $sort: { likeCount: -1, createdAt: -1 }
        },
        {
          $skip: skip
        },
        {
          $limit: limit
        },
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "author"
          }
        },
        {
          $unwind: "$author"
        },
        {
          $project: {
            "author.password": 0,
            "author.email": 0,
            "author.otp": 0,
            "author.otpExpires": 0,
            "author.resetPasswordToken": 0,
            "author.resetPasswordExpires": 0
          }
        }
      ]);

      const total = await Post.countDocuments();

      return res.json({
        posts,
        page,
        pages: Math.ceil(total / limit),
        total
      });
    }

    const posts = await Post.find()
      .populate('author', 'name avatar username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments();

    res.json({
      posts,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching posts' });
  }
};

// @desc    Like/Unlike a post
// @route   PUT /api/community/posts/:id/like
// @access  Private
export const likePost = async (req: any, res: Response) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const likeIndex = post.likes.indexOf(req.user.id);
    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(req.user.id);
    }

    await post.save();
    res.json(post.likes);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add comment to post
// @route   POST /api/community/posts/:id/comments
// @access  Private
export const addComment = async (req: any, res: Response) => {
  try {
    const { content } = req.body;
    const comment = await Comment.create({
      post: req.params.id,
      author: req.user.id,
      content,
    });

    await Post.findByIdAndUpdate(req.params.id, { $inc: { commentCount: 1 } });

    const populatedComment = await comment.populate('author', 'name avatar username');
    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ message: 'Server error adding comment' });
  }
};

// @desc    Delete a post
// @route   DELETE /api/community/posts/:id
// @access  Private
export const deletePost = async (req: any, res: Response) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.id);
    // Cascade delete comments
    await Comment.deleteMany({ post: req.params.id });

    res.json({ message: 'Post removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting post' });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/community/posts/:id/comments/:commentId
// @access  Private
export const deleteComment = async (req: any, res: Response) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the author
    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    await Comment.findByIdAndDelete(req.params.commentId);
    await Post.findByIdAndUpdate(req.params.id, { $inc: { commentCount: -1 } });

    res.json({ message: 'Comment removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting comment' });
  }
};

// @desc    Get comments for a post
// @route   GET /api/community/posts/:id/comments
// @access  Public
export const getComments = async (req: Request, res: Response) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .populate('author', 'name avatar username')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
