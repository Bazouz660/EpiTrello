import { User } from '../models/User.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import { isPasswordStrongEnough } from '../utils/passwordStrength.js';
import { serializeUser } from '../utils/userSerializer.js';

const emailRegex = /.+@.+\..+/;
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const buildDataUrlFromFile = (file) => {
  const base64 = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${base64}`;
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.status(200).json({ user: serializeUser(user) });
  } catch (error) {
    return next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { username, email } = req.body;
    const removeAvatar = req.body.removeAvatar === 'true';

    if (!username || !email) {
      return res.status(400).json({ message: 'username and email are required' });
    }

    const trimmedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      return res.status(400).json({ message: 'Username must be between 3 and 50 characters' });
    }

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Email is invalid' });
    }

    if (trimmedUsername !== user.username) {
      const existing = await User.findOne({ username: trimmedUsername });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return res.status(409).json({ message: 'Username is already taken' });
      }
      user.username = trimmedUsername;
    }

    if (normalizedEmail !== user.email) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return res.status(409).json({ message: 'Email is already in use' });
      }
      user.email = normalizedEmail;
    }

    if (req.file) {
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: 'Unsupported avatar format' });
      }
      user.avatarUrl = buildDataUrlFromFile(req.file);
    } else if (removeAvatar) {
      user.avatarUrl = null;
    }

    await user.save();

    const safeUser = await User.findById(user._id).select('-password');

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: serializeUser(safeUser),
    });
  } catch (error) {
    return next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const passwordMatches = await verifyPassword(currentPassword, user.password);
    if (!passwordMatches) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const strength = isPasswordStrongEnough(newPassword);
    if (!strength.ok) {
      return res.status(400).json({ message: 'Password is too weak', details: strength.feedback });
    }

    const hashed = await hashPassword(newPassword);
    user.password = hashed;
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    return next(error);
  }
};

export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const query = q.trim();
    const currentUserId = req.user._id;

    // Search by username or email (case-insensitive)
    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    })
      .select('_id username email avatarUrl')
      .limit(10);

    const results = users.map((user) => ({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
    }));

    return res.status(200).json({ users: results });
  } catch (error) {
    return next(error);
  }
};
