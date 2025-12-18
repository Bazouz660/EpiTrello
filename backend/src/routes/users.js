import express from 'express';
import multer from 'multer';

import { changePassword, getProfile, updateProfile, searchUsers } from '../controllers/usersController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.get('/search', authenticate, searchUsers);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, upload.single('avatar'), updateProfile);
router.put('/password', authenticate, changePassword);

export default router;
