import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import { env } from '../config/env.js';

const signToken = (user) => {
  return jwt.sign({ sub: user._id.toString() }, env.JWT_SECRET, { expiresIn: '7d' });
};

export const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email and password are required' });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] }).lean();
    if (existing) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashed = await hashPassword(password);

    const user = new User({ username, email, password: hashed });
    await user.save();

    const token = signToken(user);

    return res.status(201).json({ token, user: { id: user._id.toString(), username: user.username, email: user.email } });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);

    return res.status(200).json({ token, user: { id: user._id.toString(), username: user.username, email: user.email } });
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    return res.status(200).json({ user: { id: user._id.toString(), username: user.username, email: user.email } });
  } catch (error) {
    next(error);
  }
};
