import express from 'express';

import {
  createCard,
  listCards,
  getCard,
  updateCard,
  deleteCard,
  moveCard,
} from '../controllers/cardsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createCard);
router.get('/', listCards);
router.post('/:id/move', moveCard);
router.get('/:id', getCard);
router.patch('/:id', updateCard);
router.delete('/:id', deleteCard);

export default router;
