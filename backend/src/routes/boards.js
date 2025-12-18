import express from 'express';

import {
  createBoard,
  listBoards,
  getBoard,
  updateBoard,
  deleteBoard,
  addBoardMember,
  updateBoardMember,
  removeBoardMember,
  getBoardMembers,
} from '../controllers/boardsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createBoard);
router.get('/', listBoards);
router.get('/:id', getBoard);
router.patch('/:id', updateBoard);
router.delete('/:id', deleteBoard);

// Member management routes
router.get('/:id/members', getBoardMembers);
router.post('/:id/members', addBoardMember);
router.patch('/:id/members/:userId', updateBoardMember);
router.delete('/:id/members/:userId', removeBoardMember);

export default router;
