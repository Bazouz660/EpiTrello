import express from 'express';

import {
  createList,
  listLists,
  getList,
  updateList,
  deleteList,
} from '../controllers/listsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createList);
router.get('/', listLists);
router.get('/:id', getList);
router.patch('/:id', updateList);
router.delete('/:id', deleteList);

export default router;
