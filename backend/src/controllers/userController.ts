import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import { formatUser } from '../utils/formatters.js';

// @desc    Get user profile by ID
// @route   GET /api/users/profile/:id
// @access  Public
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password -otp -otpExpires -resetPasswordToken -resetPasswordExpires');

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.username = req.body.username || user.username;
      user.title = req.body.title || user.title;
      user.bio = req.body.bio || user.bio;
      user.skills = req.body.skills || user.skills;
      user.socialLinks = req.body.socialLinks || user.socialLinks;
      user.avatar = req.body.avatar || user.avatar;
      
      if (req.body.editorSettings) {
        user.editorSettings = { ...user.editorSettings, ...req.body.editorSettings };
      }

      if (req.body.notificationSettings) {
        user.notificationSettings = { ...user.notificationSettings, ...req.body.notificationSettings };
      }

      const updatedUser = await user.save();

      res.json(formatUser(updatedUser));
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username already taken' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
export const changePassword = async (req: any, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user: any = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'Social login users cannot change password' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user activity
// @route   GET /api/users/activity/:id
// @access  Public
export const getUserActivity = async (req: Request, res: Response) => {
  try {
    const activities = await Activity.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching activity' });
  }
};
