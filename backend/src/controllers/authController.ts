import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import User from '../models/User.js';

// @desc    GitHub OAuth
// @route   POST /api/auth/github
// @access  Public
export const githubLogin = async (req: Request, res: Response) => {
  const { code } = req.body;

  try {
    // 1. Exchange code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      return res.status(400).json({ message: 'GitHub authorization failed' });
    }

    // 2. Get user info from GitHub
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const githubUser = userResponse.data;

    // 3. Get user email (might be private)
    let email = githubUser.email;
    if (!email) {
      const emailsResponse = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const primaryEmail = emailsResponse.data.find((e: any) => e.primary);
      email = primaryEmail ? primaryEmail.email : `${githubUser.login}@github.com`;
    }

    // 4. Find or create user in DB
    let user = await User.findOne({ 
      $or: [{ githubId: githubUser.id.toString() }, { email }] 
    });

    if (!user) {
      user = await User.create({
        name: githubUser.name || githubUser.login,
        email,
        githubId: githubUser.id.toString(),
        avatar: githubUser.avatar_url,
      });
    } else if (!user.githubId) {
      // Link existing account if not already linked
      user.githubId = githubUser.id.toString();
      if (!user.avatar) user.avatar = githubUser.avatar_url;
      await user.save();
    }

    res.json({
      token: generateToken(user._id.toString()),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('GitHub Auth Error:', error);
    res.status(500).json({ message: 'GitHub authentication failed' });
  }
};

// @desc    Register user
// @route   POST /api/auth/signup
// @access  Public
export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      res.status(201).json({
        token: generateToken(user._id.toString()),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user: any = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      res.json({
        token: generateToken(user._id.toString()),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req: any, res: Response) => {
  const user = await User.findById(req.user.id);

  if (user) {
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// Generate JWT
const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: '30d',
  });
};
