import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import User from '../models/User.js';

export const protect = async (req: any, res: Response, next: NextFunction) => {
  let token;

  console.log(`[Auth] Protecting route: ${req.method} ${req.originalUrl}`);
  console.log(`[Auth] Cookie present: ${!!req.cookies?.token}`);
  console.log(`[Auth] Auth header present: ${!!req.headers.authorization}`);

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('[Auth] Using Bearer token');

      // Verify token
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
      console.log(`[Auth] Token verified for user ID: ${decoded.id}`);

      // Get user from the token
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        console.warn(`[Auth] User not found for ID: ${decoded.id}`);
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      req.user = user;
      next();
    } catch (error: any) {
      console.error(`[Auth] Token verification failed: ${error.message}`);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else if (req.cookies.token && req.cookies.token !== 'none') {
    try {
      // Get token from cookie
      token = req.cookies.token;
      console.log('[Auth] Using cookie token');

      // Verify token
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
      console.log(`[Auth] Token verified for user ID: ${decoded.id}`);

      // Get user from the token
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        console.warn(`[Auth] User not found for ID: ${decoded.id}`);
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      req.user = user;
      next();
    } catch (error: any) {
      console.error(`[Auth] Cookie token verification failed: ${error.message}`);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    console.warn('[Auth] No token found in headers or cookies');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};
