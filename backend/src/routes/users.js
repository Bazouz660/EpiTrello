import express from 'express';
import multer from 'multer';

import { authenticate } from '../middleware/auth.js';
import { changePassword, getProfile, updateProfile } from '../controllers/usersController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, upload.single('avatar'), updateProfile);
router.put('/password', authenticate, changePassword);

export default router;
