import express from 'express';

import {
  createBoard,
  listBoards,
  getBoard,
  updateBoard,
  deleteBoard,
} from '../controllers/boardsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createBoard);
router.get('/', listBoards);
router.get('/:id', getBoard);
router.patch('/:id', updateBoard);
router.delete('/:id', deleteBoard);

export default router;
