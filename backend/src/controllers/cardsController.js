import mongoose from 'mongoose';

import { Board } from '../models/Board.js';
import { Card } from '../models/Card.js';
import { List } from '../models/List.js';
import { broadcastToBoard } from '../socket/index.js';

import { canView, canEdit, addBoardActivity } from './boardsController.js';
import {
  createNotifications,
  extractMentions,
  resolveUsernames,
} from './notificationsController.js';

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
    if (!canEdit(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

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

    // Track activity on the board
    await addBoardActivity(board._id, {
      action: 'created card',
      entityType: 'card',
      actorId: req.user._id,
      entityId: card._id.toString(),
      entityTitle: title,
      details: `in "${list.title}"`,
    });

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
    if (!canEdit(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    const previousAssignedMembers = (card.assignedMembers || []).map((m) => m.toString());
    const previousArchived = card.archived;

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

    // Track card updates in board activity
    for (const message of activityMessages) {
      let action = 'updated card';
      let details = '';

      if (message === 'Title updated') {
        action = 'renamed card';
        details = `to "${card.title}"`;
      } else if (message === 'Description updated') {
        action = 'updated card description';
      } else if (message === 'Due date set') {
        action = 'set due date on card';
        details = new Date(card.dueDate).toLocaleDateString();
      } else if (message === 'Due date cleared') {
        action = 'removed due date from card';
      } else if (message === 'Labels updated') {
        action = 'updated labels on card';
      } else if (message === 'Checklist updated') {
        action = 'updated checklist on card';
      } else if (message === 'Assignees updated') {
        action = 'updated assignees on card';
      } else if (message === 'Card reordered') {
        // Skip reorder within same list - too noisy
        continue;
      }

      await addBoardActivity(board._id, {
        action,
        entityType: 'card',
        actorId: req.user._id,
        entityId: card._id.toString(),
        entityTitle: card.title,
        details,
      });
    }

    // Track archive/unarchive separately
    if (updates.archived !== undefined && updates.archived !== previousArchived) {
      await addBoardActivity(board._id, {
        action: updates.archived ? 'archived card' : 'unarchived card',
        entityType: 'card',
        actorId: req.user._id,
        entityId: card._id.toString(),
        entityTitle: card.title,
      });
    }

    if (updates.assignedMembers) {
      const newAssignedMembers = updates.assignedMembers.filter(
        (memberId) => !previousAssignedMembers.includes(memberId),
      );

      if (newAssignedMembers.length > 0) {
        await createNotifications({
          recipientIds: newAssignedMembers,
          type: 'card_assigned',
          title: 'You were assigned to a card',
          message: `You were assigned to "${card.title}"`,
          boardId: board._id,
          cardId: card._id,
          actorId: req.user._id,
        });
      }
    }

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
    if (!canEdit(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    const cardId = card._id.toString();
    const cardTitle = card.title;
    const listId = card.list.toString();
    const boardId = board._id.toString();

    await card.deleteOne();

    // Track activity on the board
    await addBoardActivity(boardId, {
      action: 'deleted card',
      entityType: 'card',
      actorId: req.user._id,
      entityId: cardId,
      entityTitle: cardTitle,
      details: `from "${list.title}"`,
    });

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

    const moveToNegativeBulkOps = [];

    moveToNegativeBulkOps.push({
      updateOne: {
        filter: { _id: id },
        update: { $set: { list: targetListId, position: -1 } },
      },
    });

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

    const setFinalPositionBulkOps = [];

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
    setFinalPositionBulkOps.push({
      updateOne: {
        filter: { _id: id },
        update: { $set: { position } },
      },
    });

    await Card.bulkWrite(setFinalPositionBulkOps, { ordered: false });

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

    // Track movement in board activity (only when moving between lists)
    if (!sameList) {
      await addBoardActivity(sourceBoard._id, {
        action: 'moved card',
        entityType: 'card',
        actorId: req.user._id,
        entityId: updatedCard._id.toString(),
        entityTitle: updatedCard.title,
        details: `from "${sourceList.title}" to "${targetList.title}"`,
      });
    }

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

export const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const card = await Card.findById(id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const list = await List.findById(card.list);
    if (!list) return res.status(404).json({ message: 'List not found' });

    const board = await Board.findById(list.board);
    if (!canEdit(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    const comment = {
      id: new Types.ObjectId().toString(),
      text: text.trim(),
      author: req.user._id,
      createdAt: new Date(),
    };

    card.comments.push(comment);
    card.activity.push(buildActivityEntry('Comment added', req.user._id));
    await card.save();

    // Track comment in board activity
    await addBoardActivity(board._id, {
      action: 'commented on card',
      entityType: 'card',
      actorId: req.user._id,
      entityId: card._id.toString(),
      entityTitle: card.title,
    });

    const assignedMemberIds = (card.assignedMembers || []).map((m) => m.toString());
    if (assignedMemberIds.length > 0) {
      await createNotifications({
        recipientIds: assignedMemberIds,
        type: 'comment',
        title: 'New comment on your card',
        message: `${req.user.username} commented on "${card.title}"`,
        boardId: board._id,
        cardId: card._id,
        actorId: req.user._id,
      });
    }

    const mentionedUsernames = extractMentions(text);
    if (mentionedUsernames.length > 0) {
      const mentionedUsers = await resolveUsernames(mentionedUsernames);
      const mentionedUserIds = mentionedUsers
        .map((u) => u.id)
        .filter((uid) => !assignedMemberIds.includes(uid));

      if (mentionedUserIds.length > 0) {
        await createNotifications({
          recipientIds: mentionedUserIds,
          type: 'mention',
          title: 'You were mentioned',
          message: `${req.user.username} mentioned you in "${card.title}"`,
          boardId: board._id,
          cardId: card._id,
          actorId: req.user._id,
        });
      }
    }

    broadcastToBoard(board._id.toString(), 'card:updated', {
      card: toResponse(card),
      userId: req.user._id.toString(),
    });

    return res.status(201).json({ card: toResponse(card), comment: mapComment(comment) });
  } catch (error) {
    next(error);
  }
};
