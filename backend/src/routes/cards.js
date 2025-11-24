import express from 'express';
import {
  createCard,
  listCards,
  getCard,
  updateCard,
  deleteCard,
} from '../controllers/cardsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createCard);
router.get('/', listCards);
router.get('/:id', getCard);
router.patch('/:id', updateCard);
router.delete('/:id', deleteCard);

export default router;
