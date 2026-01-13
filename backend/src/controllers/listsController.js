import { Board } from '../models/Board.js';
import { Card } from '../models/Card.js';
import { List } from '../models/List.js';
import { broadcastToBoard } from '../socket/index.js';

import { canView, canEdit, addBoardActivity } from './boardsController.js';

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
    if (!canEdit(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    let pos = position;
    if (pos === undefined || pos === null) {
      const max = await List.find({ board: boardId }).sort({ position: -1 }).limit(1).lean();
      pos = max.length ? max[0].position + 1 : 0;
    }

    const list = new List({ title, board: boardId, position: pos });
    await list.save();

    // Track activity on the board
    await addBoardActivity(boardId, {
      action: 'created list',
      entityType: 'list',
      actorId: req.user._id,
      entityId: list._id.toString(),
      entityTitle: title,
    });

    broadcastToBoard(boardId, 'list:created', {
      list: toResponse(list),
      userId: req.user._id.toString(),
    });

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
    if (!canEdit(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    const previousTitle = list.title;

    if (title !== undefined && title !== previousTitle) {
      list.title = title;
      await addBoardActivity(list.board, {
        action: 'renamed list',
        entityType: 'list',
        actorId: req.user._id,
        entityId: list._id.toString(),
        entityTitle: title,
        details: `from "${previousTitle}" to "${title}"`,
      });
    }
    if (archived !== undefined) {
      const wasArchived = list.archived;
      list.archived = Boolean(archived);
      if (wasArchived !== list.archived) {
        await addBoardActivity(list.board, {
          action: list.archived ? 'archived list' : 'unarchived list',
          entityType: 'list',
          actorId: req.user._id,
          entityId: list._id.toString(),
          entityTitle: list.title,
        });
      }
    }
    if (position !== undefined) list.position = position;

    await list.save();

    broadcastToBoard(list.board.toString(), 'list:updated', {
      list: toResponse(list),
      userId: req.user._id.toString(),
    });

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
    if (!canEdit(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    const boardId = list.board.toString();
    const listId = list._id.toString();
    const listTitle = list.title;

    await Card.deleteMany({ list: list._id });
    await list.deleteOne();

    // Track activity on the board
    await addBoardActivity(boardId, {
      action: 'deleted list',
      entityType: 'list',
      actorId: req.user._id,
      entityId: listId,
      entityTitle: listTitle,
    });

    broadcastToBoard(boardId, 'list:deleted', {
      listId,
      boardId,
      userId: req.user._id.toString(),
    });

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
    if (!canEdit(board, req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const tempBulkOps = listIds.map((listId, index) => ({
      updateOne: {
        filter: { _id: listId, board: boardId },
        update: { $set: { position: -(index + 1) } },
      },
    }));
    await List.bulkWrite(tempBulkOps, { ordered: false });

    const finalBulkOps = listIds.map((listId, index) => ({
      updateOne: {
        filter: { _id: listId, board: boardId },
        update: { $set: { position: index } },
      },
    }));
    await List.bulkWrite(finalBulkOps, { ordered: false });

    const lists = await List.find({ board: boardId }).sort({ position: 1 });

    // Track list reorder in board activity
    await addBoardActivity(boardId, {
      action: 'reordered lists',
      entityType: 'list',
      actorId: req.user._id,
      entityId: boardId,
      entityTitle: 'Lists',
    });

    broadcastToBoard(boardId, 'lists:reordered', {
      boardId,
      lists: lists.map(toResponse),
      userId: req.user._id.toString(),
    });

    return res.status(200).json({ lists: lists.map(toResponse) });
  } catch (error) {
    next(error);
  }
};
