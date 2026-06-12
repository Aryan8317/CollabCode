import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import crypto from 'crypto';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Invitation from '../models/Invitation.js';
import Room from '../models/Room.js';
import Activity from '../models/Activity.js';
import { sendEmail } from '../utils/sendEmail.js';
import { formatUser } from '../utils/formatters.js';

// Generate JWT
const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: '30d',
  });
};

const sendTokenResponse = (user: any, statusCode: number, res: Response) => {
  const token = generateToken(user._id.toString());

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      token,
      user: formatUser(user),
    });
};

/**
 * Links any pending invitations (by email) to the user after registration/social login.
 * Creates notifications for the user so they can accept/decline.
 */
const linkPendingInvitations = async (user: any) => {
  try {
    const pendingInvitations = await Invitation.find({
      receiverEmail: user.email.toLowerCase(),
      status: 'pending',
    });

    for (const invitation of pendingInvitations) {
      const room = await Room.findById(invitation.roomId);
      if (!room) continue;

      // Check if notification already exists for this invitation
      const existingNotification = await Notification.findOne({
        recipient: user._id,
        'data.invitationId': invitation._id
      });

      if (!existingNotification) {
        await Notification.create({
          recipient: user._id,
          sender: invitation.sender,
          type: 'INVITE',
          message: `You have been invited to join ${room.name}`,
          link: `/notifications`,
          data: { 
            roomId: room._id, 
            invitationId: invitation._id, 
            role: invitation.role, 
            status: 'pending' 
          }
        });
      }
    }
  } catch (err) {
    console.error('Error linking pending invitations:', err);
  }
};

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
      $or: [{ githubId: githubUser.id.toString() }, { email }],
    });

    if (!user) {
      user = await User.create({
        name: githubUser.name || githubUser.login,
        email,
        githubId: githubUser.id.toString(),
        avatar: githubUser.avatar_url,
        isVerified: true,
      });
    } else {
      user.githubId = githubUser.id.toString();
      user.avatar = githubUser.avatar_url || user.avatar;
      user.isVerified = true;
      await user.save();
    }

    await linkPendingInvitations(user);

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('GitHub Auth Error:', error);
    res.status(500).json({ message: 'GitHub authentication failed' });
  }
};

// @desc    Google OAuth
// @route   POST /api/auth/google
// @access  Public
export const googleLogin = async (req: Request, res: Response) => {
  const { code } = req.body;

  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // 1. Exchange code for access token
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_Client_ID,
      client_secret: process.env.GOOGLE_Client_secret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${frontendUrl}/auth/google/callback`,
    });

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      return res.status(400).json({ message: 'Google authorization failed' });
    }

    // 2. Get user info from Google
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const googleUser = userResponse.data;

    // 3. Find or create user in DB
    let user = await User.findOne({
      $or: [{ googleId: googleUser.sub }, { email: googleUser.email }],
    });

    if (!user) {
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.sub,
        avatar: googleUser.picture,
        isVerified: true,
      });
    } else {
      user.googleId = googleUser.sub;
      user.avatar = googleUser.picture || user.avatar;
      user.isVerified = true;
      await user.save();
    }

    await linkPendingInvitations(user);

    sendTokenResponse(user, 200, res);
  } catch (error: any) {
    console.error('Google Auth Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Google authentication failed' });
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

    // Generate 6-digit OTP and hash it before storing
    const otpPlain = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHashed = crypto.createHash('sha256').update(otpPlain).digest('hex');
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({
      name,
      email,
      password,
      otp: otpHashed,
      otpExpires,
      isVerified: false,
    });

    if (user) {
      try {
        await sendEmail({
          email: user.email,
          subject: 'CollabCode - Verify your email',
          message: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
              <h2 style="color: #6200ee; text-align: center;">Welcome to CollabCode!</h2>
              <p>Thank you for registering. To complete your signup, please use the following One-Time Password (OTP) to verify your email address:</p>
              <div style="background-color: #f3f3f3; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 5px;">
                ${otpPlain}
              </div>
              <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #888; text-align: center;">CollabCode - Engineering the future of real-time collaboration.</p>
            </div>
          `,
        });

        res.status(201).json({
          message: 'OTP sent to email',
          email: user.email,
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        await User.findByIdAndDelete(user._id);
        res.status(500).json({ message: 'Error sending verification email. Please try again.' });
      }
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  try {
    // Use generic message to avoid user enumeration
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    if (user.emailOtpAttempts && user.emailOtpAttempts >= 5) {
      return res.status(429).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    const hashedInput = crypto.createHash('sha256').update(otp).digest('hex');

    if (user.otp !== hashedInput || (user.otpExpires && user.otpExpires < new Date())) {
      user.emailOtpAttempts = (user.emailOtpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.emailOtpAttempts = 0;
    await user.save();

    await linkPendingInvitations(user);

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ message: 'Server error during verification' });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
export const resendOTP = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    const otpPlain = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHashed = crypto.createHash('sha256').update(otpPlain).digest('hex');
    user.otp = otpHashed;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.emailOtpAttempts = 0;
    await user.save();

    await sendEmail({
      email: user.email,
      subject: 'CollabCode - New OTP Request',
      message: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #6200ee; text-align: center;">New OTP Requested</h2>
          <p>You requested a new verification code. Please use the following One-Time Password (OTP):</p>
          <div style="background-color: #f3f3f3; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 5px;">
            ${otpPlain}
          </div>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `,
    });

    res.json({ message: 'New OTP sent to email' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      // Generic message to avoid user enumeration
      return res.json({ message: 'If an account exists with this email, a reset code has been sent.' });
    }

    const resetOTP = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedToken = crypto.createHash('sha256').update(resetOTP).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.passwordResetOtpAttempts = 0;

    await user.save();

    try {
      await sendEmail({
        email: user.email,
        subject: 'CollabCode - Reset Your Password',
        message: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #6200ee; text-align: center;">Password Reset Request</h2>
            <p>You requested a password reset. Please use the following One-Time Password (OTP) to reset your password:</p>
            <div style="background-color: #f3f3f3; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 5px;">
              ${resetOTP}
            </div>
            <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
      });

      res.json({ message: 'Reset OTP sent to email' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(500).json({ message: 'Email could not be sent' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req: Request, res: Response) => {
  const { email, otp, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    if (user.passwordResetOtpAttempts && user.passwordResetOtpAttempts >= 5) {
      return res.status(429).json({ message: 'Too many failed attempts. Please request a new password reset.' });
    }

    const hashedToken = crypto.createHash('sha256').update(otp).digest('hex');

    if (
      user.resetPasswordToken !== hashedToken ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      user.passwordResetOtpAttempts = (user.passwordResetOtpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.passwordResetOtpAttempts = 0;
    user.isVerified = true;

    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    const user: any = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.password) {
      const methods = [];
      if (user.googleId) methods.push('Google');
      if (user.githubId) methods.push('GitHub');
      return res.status(401).json({
        message: `This account was created using ${methods.join(' or ')}. Please use social login.`,
      });
    }

    if (await user.matchPassword(password)) {
      if (!user.isVerified) {
        return res.status(401).json({
          message: 'Please verify your email first',
          unverified: true,
        });
      }

      await linkPendingInvitations(user);

      sendTokenResponse(user, 200, res);
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      res.json(formatUser(user));
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Public
export const logout = async (req: Request, res: Response) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  });

  res.status(200).json({ message: 'Logged out successfully' });
};
