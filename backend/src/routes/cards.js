import express from 'express';

import {
  createCard,
  listCards,
  getCard,
  updateCard,
  deleteCard,
  moveCard,
  addComment,
  getMyCards,
  getDashboardStats,
} from '../controllers/cardsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// Dashboard endpoints (must come before :id routes)
router.get('/my-cards', getMyCards);
router.get('/dashboard-stats', getDashboardStats);

router.post('/', createCard);
router.get('/', listCards);
router.post('/:id/move', moveCard);
router.post('/:id/comments', addComment);
router.get('/:id', getCard);
router.patch('/:id', updateCard);
router.delete('/:id', deleteCard);

export default router;
