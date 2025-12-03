import mongoose from 'mongoose';

import { Board } from '../models/Board.js';
import { Card } from '../models/Card.js';
import { List } from '../models/List.js';

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

const ensureBoardAccess = (board, userId) => {
  if (!board) return false;
  const isOwner = board.owner?.toString() === userId.toString();
  const isMember = board.members?.some((m) => m.user?.toString() === userId.toString());
  return isOwner || isMember;
};

export const createCard = async (req, res, next) => {
  try {
    const { title, list: listId, position, description = '' } = req.body;
    if (!title || !listId) return res.status(400).json({ message: 'title and list are required' });

    const list = await List.findById(listId);
    if (!list) return res.status(404).json({ message: 'List not found' });

    const board = await Board.findById(list.board);
    if (!ensureBoardAccess(board, req.user._id))
      return res.status(403).json({ message: 'Forbidden' });

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
    if (!ensureBoardAccess(board, req.user._id))
      return res.status(403).json({ message: 'Forbidden' });

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
    if (!ensureBoardAccess(board, req.user._id))
      return res.status(403).json({ message: 'Forbidden' });

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
    if (!ensureBoardAccess(board, req.user._id))
      return res.status(403).json({ message: 'Forbidden' });

    // allow moving to another list
    if (updates.list && updates.list !== card.list.toString()) {
      const newList = await List.findById(updates.list);
      if (!newList) return res.status(404).json({ message: 'Target list not found' });
      const newBoard = await Board.findById(newList.board);
      if (!ensureBoardAccess(newBoard, req.user._id))
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
    if (!ensureBoardAccess(board, req.user._id))
      return res.status(403).json({ message: 'Forbidden' });

    await card.deleteOne();
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};
