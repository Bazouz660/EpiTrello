import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

export const authenticate = async (req, res, next) => {
  try {
    const header = req.get('Authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ message: 'Authorization header missing or malformed' });

    const token = match[1];
    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const userId = payload.sub;
    if (!userId) return res.status(401).json({ message: 'Invalid token payload' });

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};
