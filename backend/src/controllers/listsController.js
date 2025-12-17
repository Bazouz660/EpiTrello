import { Board } from '../models/Board.js';
import { Card } from '../models/Card.js';
import { List } from '../models/List.js';
import { canView, canEdit } from './boardsController.js';

const toResponse = (list) => ({
  id: list._id.toString(),
  title: list.title,
  board: list.board?.toString(),
  position: list.position,
  archived: list.archived,
});

export const createList = async (req, res, next) => {
  try {
    const { title, board: boardId, position } = req.body;
    if (!title || !boardId)
      return res.status(400).json({ message: 'title and board are required' });

    const board = await Board.findById(boardId);
    // Only members or higher can create lists (viewers cannot)
    if (!canEdit(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    // Determine position: if not provided, append at end
    let pos = position;
    if (pos === undefined || pos === null) {
      const max = await List.find({ board: boardId }).sort({ position: -1 }).limit(1).lean();
      pos = max.length ? max[0].position + 1 : 0;
    }

    const list = new List({ title, board: boardId, position: pos });
    await list.save();

    return res.status(201).json({ list: toResponse(list) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Position conflict' });
    }
    next(error);
  }
};

export const listLists = async (req, res, next) => {
  try {
    const { board: boardId } = req.query;
    if (!boardId) return res.status(400).json({ message: 'board query parameter is required' });

    const board = await Board.findById(boardId);
    // Any role can view lists
    if (!canView(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    const lists = await List.find({ board: boardId }).sort({ position: 1 });
    return res.status(200).json({ lists: lists.map(toResponse) });
  } catch (error) {
    next(error);
  }
};

export const getList = async (req, res, next) => {
  try {
    const { id } = req.params;
    const list = await List.findById(id);
    if (!list) return res.status(404).json({ message: 'List not found' });

    const board = await Board.findById(list.board);
    // Any role can view a list
    if (!canView(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    return res.status(200).json({ list: toResponse(list) });
  } catch (error) {
    next(error);
  }
};

export const updateList = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, position, archived } = req.body;

    const list = await List.findById(id);
    if (!list) return res.status(404).json({ message: 'List not found' });

    const board = await Board.findById(list.board);
    // Only members or higher can update lists (viewers cannot)
    if (!canEdit(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    if (title !== undefined) list.title = title;
    if (archived !== undefined) list.archived = Boolean(archived);
    if (position !== undefined) list.position = position;

    await list.save();

    return res.status(200).json({ list: toResponse(list) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Position conflict' });
    next(error);
  }
};

export const deleteList = async (req, res, next) => {
  try {
    const { id } = req.params;
    const list = await List.findById(id);
    if (!list) return res.status(404).json({ message: 'List not found' });

    const board = await Board.findById(list.board);
    // Only members or higher can delete lists (viewers cannot)
    if (!canEdit(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    // remove cards in this list
    await Card.deleteMany({ list: list._id });
    await list.deleteOne();

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const reorderLists = async (req, res, next) => {
  try {
    const { boardId, listIds } = req.body;
    if (!boardId || !Array.isArray(listIds)) {
      return res.status(400).json({ message: 'boardId and listIds array are required' });
    }

    const board = await Board.findById(boardId);
    // Only members or higher can reorder lists (viewers cannot)
    if (!canEdit(board, req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Two-phase update to avoid unique constraint violations:
    // Phase 1: Set all positions to temporary negative values
    const tempBulkOps = listIds.map((listId, index) => ({
      updateOne: {
        filter: { _id: listId, board: boardId },
        update: { $set: { position: -(index + 1) } },
      },
    }));
    await List.bulkWrite(tempBulkOps, { ordered: false });

    // Phase 2: Set final positions
    const finalBulkOps = listIds.map((listId, index) => ({
      updateOne: {
        filter: { _id: listId, board: boardId },
        update: { $set: { position: index } },
      },
    }));
    await List.bulkWrite(finalBulkOps, { ordered: false });

    // Fetch updated lists
    const lists = await List.find({ board: boardId }).sort({ position: 1 });
    return res.status(200).json({ lists: lists.map(toResponse) });
  } catch (error) {
    next(error);
  }
};
