import mongoose from 'mongoose';

import { Board } from '../models/Board.js';
import { Card } from '../models/Card.js';
import { List } from '../models/List.js';
import { broadcastToBoard } from '../socket/index.js';

import { canView, canEdit } from './boardsController.js';

const { Types } = mongoose;

const mapComment = (comment = {}) => ({
  id: comment.id ?? comment._id?.toString() ?? '',
  text: comment.text ?? '',
  author: comment.author ? comment.author.toString() : null,
  createdAt: comment.createdAt ?? null,
});

const mapActivityEntry = (entry = {}) => ({
  id: entry.id ?? entry._id?.toString() ?? '',
  message: entry.message ?? '',
  actor: entry.actor ? entry.actor.toString() : null,
  createdAt: entry.createdAt ?? null,
});

const buildActivityEntry = (message, actorId) => ({
  id: new Types.ObjectId().toString(),
  message,
  actor: actorId ?? null,
  createdAt: new Date(),
});

const normalizeValue = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (value === null || value === undefined) return value;
  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
};

const didChange = (previous, next) => normalizeValue(previous) !== normalizeValue(next);

const toResponse = (card) => ({
  id: card._id.toString(),
  title: card.title,
  description: card.description,
  list: card.list?.toString(),
  position: card.position,
  labels: card.labels || [],
  dueDate: card.dueDate || null,
  checklist: card.checklist || [],
  assignedMembers: (card.assignedMembers || []).map((member) =>
    member?.toString ? member.toString() : member,
  ),
  comments: (card.comments || []).map(mapComment),
  activity: (card.activity || []).map(mapActivityEntry),
  archived: card.archived || false,
});

export const createCard = async (req, res, next) => {
  try {
    const { title, list: listId, position, description = '' } = req.body;
    if (!title || !listId) return res.status(400).json({ message: 'title and list are required' });

    const list = await List.findById(listId);
    if (!list) return res.status(404).json({ message: 'List not found' });

    const board = await Board.findById(list.board);
    // Only members or higher can create cards (viewers cannot)
    if (!canEdit(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    // compute position if not provided
    let pos = position;
    if (pos === undefined || pos === null) {
      const max = await Card.find({ list: listId }).sort({ position: -1 }).limit(1).lean();
      pos = max.length ? max[0].position + 1 : 0;
    }

    const card = new Card({
      title,
      description,
      list: listId,
      position: pos,
      activity: [buildActivityEntry('Card created', req.user._id)],
    });
    await card.save();

    // Broadcast to other board members
    broadcastToBoard(board._id.toString(), 'card:created', {
      card: toResponse(card),
      listId,
      userId: req.user._id.toString(),
    });

    return res.status(201).json({ card: toResponse(card) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Position conflict' });
    next(error);
  }
};

export const listCards = async (req, res, next) => {
  try {
    const { list: listId } = req.query;
    if (!listId) return res.status(400).json({ message: 'list query parameter is required' });

    const list = await List.findById(listId);
    if (!list) return res.status(404).json({ message: 'List not found' });

    const board = await Board.findById(list.board);
    // Any role can view cards
    if (!canView(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    const cards = await Card.find({ list: listId }).sort({ position: 1 });
    return res.status(200).json({ cards: cards.map(toResponse) });
  } catch (error) {
    next(error);
  }
};

export const getCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const card = await Card.findById(id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const list = await List.findById(card.list);
    if (!list) return res.status(404).json({ message: 'List not found' });

    const board = await Board.findById(list.board);
    // Any role can view a card
    if (!canView(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    return res.status(200).json({ card: toResponse(card) });
  } catch (error) {
    next(error);
  }
};

export const updateCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const card = await Card.findById(id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const list = await List.findById(card.list);
    if (!list) return res.status(404).json({ message: 'List not found' });

    const board = await Board.findById(list.board);
    // Only members or higher can update cards (viewers cannot)
    if (!canEdit(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    // allow moving to another list
    if (updates.list && updates.list !== card.list.toString()) {
      const newList = await List.findById(updates.list);
      if (!newList) return res.status(404).json({ message: 'Target list not found' });
      const newBoard = await Board.findById(newList.board);
      if (!canEdit(newBoard, req.user._id))
        return res.status(403).json({ message: 'Forbidden to move to target list' });
      card.list = updates.list;
    }

    const activityMessages = [];

    const fields = [
      'title',
      'description',
      'position',
      'labels',
      'dueDate',
      'checklist',
      'assignedMembers',
      'archived',
    ];
    for (const f of fields) {
      if (updates[f] === undefined) continue;
      if (
        [
          'title',
          'description',
          'labels',
          'dueDate',
          'checklist',
          'assignedMembers',
          'position',
        ].includes(f)
      ) {
        if (didChange(card[f], updates[f])) {
          const message =
            f === 'title'
              ? 'Title updated'
              : f === 'description'
                ? 'Description updated'
                : f === 'dueDate'
                  ? updates[f]
                    ? 'Due date set'
                    : 'Due date cleared'
                  : f === 'labels'
                    ? 'Labels updated'
                    : f === 'checklist'
                      ? 'Checklist updated'
                      : f === 'assignedMembers'
                        ? 'Assignees updated'
                        : f === 'position'
                          ? 'Card reordered'
                          : null;
          if (message) {
            activityMessages.push(message);
          }
        }
      }
      card[f] = updates[f];
    }

    activityMessages.forEach((message) => {
      card.activity.push(buildActivityEntry(message, req.user._id));
    });

    await card.save();

    // Broadcast to other board members
    broadcastToBoard(board._id.toString(), 'card:updated', {
      card: toResponse(card),
      userId: req.user._id.toString(),
    });

    return res.status(200).json({ card: toResponse(card) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Position conflict' });
    next(error);
  }
};

export const deleteCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const card = await Card.findById(id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const list = await List.findById(card.list);
    if (!list) return res.status(404).json({ message: 'List not found' });

    const board = await Board.findById(list.board);
    // Only members or higher can delete cards (viewers cannot)
    if (!canEdit(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    const cardId = card._id.toString();
    const listId = card.list.toString();
    const boardId = board._id.toString();

    await card.deleteOne();

    // Broadcast to other board members
    broadcastToBoard(boardId, 'card:deleted', {
      cardId,
      listId,
      userId: req.user._id.toString(),
    });

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const moveCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetListId, position, sourceListCardIds, targetListCardIds } = req.body;

    const card = await Card.findById(id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const sourceList = await List.findById(card.list);
    if (!sourceList) return res.status(404).json({ message: 'Source list not found' });

    const sourceBoard = await Board.findById(sourceList.board);
    // Only members or higher can move cards (viewers cannot)
    if (!canEdit(sourceBoard, req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const targetList = await List.findById(targetListId);
    if (!targetList) return res.status(404).json({ message: 'Target list not found' });

    const targetBoard = await Board.findById(targetList.board);
    if (!canEdit(targetBoard, req.user._id)) {
      return res.status(403).json({ message: 'Forbidden to move to target list' });
    }

    const originalListId = card.list.toString();
    const sameList = originalListId === targetListId;

    // Step 1: Move ALL affected cards to negative positions to avoid unique constraint conflicts
    const moveToNegativeBulkOps = [];

    // Move the dragged card to negative position and update its list
    moveToNegativeBulkOps.push({
      updateOne: {
        filter: { _id: id },
        update: { $set: { list: targetListId, position: -1 } },
      },
    });

    // Move source list cards to negative positions (for cross-list moves)
    if (!sameList && sourceListCardIds && Array.isArray(sourceListCardIds)) {
      sourceListCardIds.forEach((cardId, index) => {
        if (cardId !== id) {
          moveToNegativeBulkOps.push({
            updateOne: {
              filter: { _id: cardId },
              update: { $set: { position: -(index + 2) } }, // -2, -3, -4, etc.
            },
          });
        }
      });
    }

    // Move target list cards to negative positions
    if (targetListCardIds && Array.isArray(targetListCardIds)) {
      targetListCardIds.forEach((cardId, index) => {
        if (cardId !== id) {
          moveToNegativeBulkOps.push({
            updateOne: {
              filter: { _id: cardId },
              update: { $set: { position: -(index + 100) } }, // -100, -101, etc. to avoid overlap
            },
          });
        }
      });
    }

    await Card.bulkWrite(moveToNegativeBulkOps, { ordered: false });

    // Step 2: Set all cards to their final positions
    const setFinalPositionBulkOps = [];

    // Set source list cards to final positions
    if (!sameList && sourceListCardIds && Array.isArray(sourceListCardIds)) {
      sourceListCardIds.forEach((cardId, index) => {
        if (cardId !== id) {
          setFinalPositionBulkOps.push({
            updateOne: {
              filter: { _id: cardId },
              update: { $set: { position: index } },
            },
          });
        }
      });
    }

    // Set target list cards to final positions
    if (targetListCardIds && Array.isArray(targetListCardIds)) {
      targetListCardIds.forEach((cardId, index) => {
        if (cardId !== id) {
          setFinalPositionBulkOps.push({
            updateOne: {
              filter: { _id: cardId },
              update: { $set: { position: index } },
            },
          });
        }
      });
    }

    // Set the moved card's final position
    setFinalPositionBulkOps.push({
      updateOne: {
        filter: { _id: id },
        update: { $set: { position } },
      },
    });

    await Card.bulkWrite(setFinalPositionBulkOps, { ordered: false });

    // Step 3: Add activity entry
    const activityEntry = !sameList
      ? buildActivityEntry(
          `Moved from "${sourceList.title}" to "${targetList.title}"`,
          req.user._id,
        )
      : buildActivityEntry('Card reordered', req.user._id);

    const updatedCard = await Card.findByIdAndUpdate(
      id,
      { $push: { activity: activityEntry } },
      { new: true },
    );

    // Broadcast to other board members
    broadcastToBoard(sourceBoard._id.toString(), 'card:moved', {
      card: toResponse(updatedCard),
      sourceListId: originalListId,
      targetListId,
      sourceListCardIds: sourceListCardIds || [],
      targetListCardIds: targetListCardIds || [],
      userId: req.user._id.toString(),
    });

    return res.status(200).json({ card: toResponse(updatedCard) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Position conflict' });
    next(error);
  }
};
