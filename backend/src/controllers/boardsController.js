import mongoose from 'mongoose';

import { Board } from '../models/Board.js';
import { Card } from '../models/Card.js';
import { List } from '../models/List.js';
import { broadcastToBoard } from '../socket/index.js';

const { Types } = mongoose;

const defaultBackground = { type: 'color', value: '#0f172a', thumbnail: '' };

const sanitizeBackground = (background = {}) => {
  if (typeof background !== 'object' || background === null) {
    return { ...defaultBackground };
  }

  const type = background.type === 'image' ? 'image' : 'color';
  const value =
    typeof background.value === 'string' && background.value.trim().length > 0
      ? background.value.trim()
      : defaultBackground.value;
  const thumbnail =
    typeof background.thumbnail === 'string'
      ? background.thumbnail.trim()
      : defaultBackground.thumbnail;

  return { type, value, thumbnail: type === 'image' ? thumbnail : '' };
};

// Activity entry builder
const buildActivityEntry = ({
  action,
  entityType,
  actorId,
  entityId = null,
  entityTitle = null,
  details = null,
}) => ({
  id: new Types.ObjectId().toString(),
  actor: actorId ?? null,
  action,
  entityType,
  entityId,
  entityTitle,
  details,
  createdAt: new Date(),
});

// Map activity entry for API response
const mapActivityEntry = (entry = {}) => ({
  id: entry.id ?? entry._id?.toString() ?? '',
  actor: entry.actor ? entry.actor.toString() : null,
  action: entry.action ?? '',
  entityType: entry.entityType ?? '',
  entityId: entry.entityId ?? null,
  entityTitle: entry.entityTitle ?? null,
  details: entry.details ?? null,
  createdAt: entry.createdAt ?? null,
});

// Export activity helpers for use in other controllers
export { buildActivityEntry, mapActivityEntry };

const resolveMembershipRole = (board, userId) => {
  const currentUserId = userId?.toString();
  if (!currentUserId) return null;
  if (board.owner?.toString() === currentUserId) return 'owner';

  const member = board.members?.find((entry) => entry.user?.toString() === currentUserId);
  return member?.role ?? null;
};

// Permission levels hierarchy: owner > admin > member > viewer
// Returns true if the user has at least the required role
const hasPermission = (board, userId, requiredRole) => {
  const role = resolveMembershipRole(board, userId);
  if (!role) return false;

  const roleHierarchy = ['viewer', 'member', 'admin', 'owner'];
  const userRoleIndex = roleHierarchy.indexOf(role);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

  return userRoleIndex >= requiredRoleIndex;
};

// Check if user can view the board (any role)
const canView = (board, userId) => hasPermission(board, userId, 'viewer');

// Check if user can edit lists/cards (member or higher)
const canEdit = (board, userId) => hasPermission(board, userId, 'member');

// Check if user can manage board settings/members (admin or higher)
const canManage = (board, userId) => hasPermission(board, userId, 'admin');

// Export permission helpers for use in other controllers
export { resolveMembershipRole, hasPermission, canView, canEdit, canManage };

const toResponse = (board, userId) => ({
  id: board._id.toString(),
  title: board.title,
  description: board.description,
  owner: board.owner?.toString(),
  members: board.members || [],
  background: board.background ?? { ...defaultBackground },
  membershipRole: resolveMembershipRole(board, userId),
});

// Helper to get populated members list
const getPopulatedMembers = async (boardId) => {
  const board = await Board.findById(boardId)
    .populate('members.user', '_id username email avatarUrl')
    .populate('owner', '_id username email avatarUrl');

  if (!board) return [];

  return [
    {
      id: board.owner._id.toString(),
      username: board.owner.username,
      email: board.owner.email,
      avatarUrl: board.owner.avatarUrl,
      role: 'owner',
    },
    ...board.members.map((m) => ({
      id: m.user._id.toString(),
      username: m.user.username,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
    })),
  ];
};

export const createBoard = async (req, res, next) => {
  try {
    const { title, description = '', background } = req.body;
    if (!title) return res.status(400).json({ message: 'title is required' });

    const board = new Board({
      title,
      description,
      owner: req.user._id,
      background: sanitizeBackground(background),
      activity: [
        buildActivityEntry({
          action: 'created',
          entityType: 'board',
          actorId: req.user._id,
          entityTitle: title,
        }),
      ],
    });
    await board.save();

    return res.status(201).json({ board: toResponse(board, req.user._id) });
  } catch (error) {
    next(error);
  }
};

export const listBoards = async (req, res, next) => {
  try {
    const boards = await Board.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
    }).sort({ updatedAt: -1 });

    return res.status(200).json({ boards: boards.map((board) => toResponse(board, req.user._id)) });
  } catch (error) {
    next(error);
  }
};

export const getBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const board = await Board.findById(id);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    // Any role (viewer or higher) can view the board
    if (!canView(board, req.user._id)) return res.status(403).json({ message: 'Forbidden' });

    return res.status(200).json({ board: toResponse(board, req.user._id) });
  } catch (error) {
    next(error);
  }
};

export const updateBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, background } = req.body;

    const board = await Board.findById(id);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    // Only owner and admin can update board settings
    if (!canManage(board, req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const activityEntries = [];

    if (title !== undefined && title !== board.title) {
      activityEntries.push(
        buildActivityEntry({
          action: 'renamed',
          entityType: 'board',
          actorId: req.user._id,
          entityTitle: title,
          details: `from "${board.title}" to "${title}"`,
        }),
      );
      board.title = title;
    }
    if (description !== undefined && description !== board.description) {
      activityEntries.push(
        buildActivityEntry({
          action: 'updated description',
          entityType: 'board',
          actorId: req.user._id,
        }),
      );
      board.description = description;
    }
    if (background !== undefined) {
      activityEntries.push(
        buildActivityEntry({
          action: 'changed background',
          entityType: 'board',
          actorId: req.user._id,
        }),
      );
      board.background = sanitizeBackground(background);
    }

    activityEntries.forEach((entry) => board.activity.push(entry));
    await board.save();

    // Broadcast to other board members
    broadcastToBoard(id, 'board:updated', {
      board: toResponse(board, req.user._id),
      userId: req.user._id.toString(),
    });

    return res.status(200).json({ board: toResponse(board, req.user._id) });
  } catch (error) {
    next(error);
  }
};

export const deleteBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const board = await Board.findById(id);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    if (board.owner?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const boardId = board._id.toString();

    // Broadcast to board members before deletion
    broadcastToBoard(boardId, 'board:deleted', {
      boardId,
      userId: req.user._id.toString(),
    });

    await board.deleteOne();

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const addBoardMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role = 'member' } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const validRoles = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be admin, member, or viewer' });
    }

    const board = await Board.findById(id);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    // Only owner and admin can manage members
    if (!canManage(board, req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Cannot add the owner as a member
    if (board.owner.toString() === userId) {
      return res.status(400).json({ message: 'Cannot add board owner as a member' });
    }

    // Check if user is already a member
    const existingMember = board.members.find((m) => m.user.toString() === userId);
    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member of this board' });
    }

    board.members.push({ user: userId, role });
    await board.save();

    // Get member info for activity log (after save so populate works)
    const members = await getPopulatedMembers(board._id);
    const addedMember = members.find((m) => m.id === userId);
    const memberName = addedMember?.username || 'Unknown user';

    board.activity.push(
      buildActivityEntry({
        action: 'added member',
        entityType: 'member',
        actorId: req.user._id,
        entityId: userId,
        entityTitle: memberName,
        details: `as ${role}`,
      }),
    );

    await board.save();

    // Broadcast to other board members
    broadcastToBoard(id, 'board:member-added', {
      boardId: id,
      members,
      userId: req.user._id.toString(),
    });

    return res.status(200).json({ board: toResponse(board, req.user._id), members });
  } catch (error) {
    next(error);
  }
};

export const updateBoardMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;

    const validRoles = ['admin', 'member', 'viewer'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be admin, member, or viewer' });
    }

    const board = await Board.findById(id);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    // Only owner and admin can manage members
    if (!canManage(board, req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Cannot update owner's role
    if (board.owner.toString() === userId) {
      return res.status(400).json({ message: 'Cannot change owner role' });
    }

    const memberIndex = board.members.findIndex((m) => m.user.toString() === userId);
    if (memberIndex === -1) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const previousRole = board.members[memberIndex].role;
    board.members[memberIndex].role = role;

    // Get member info for activity log
    const members = await getPopulatedMembers(board._id);
    const updatedMember = members.find((m) => m.id === userId);
    const memberName = updatedMember?.username || 'Unknown user';

    board.activity.push(
      buildActivityEntry({
        action: 'changed role',
        entityType: 'member',
        actorId: req.user._id,
        entityId: userId,
        entityTitle: memberName,
        details: `from ${previousRole} to ${role}`,
      }),
    );

    await board.save();

    // Broadcast to other board members
    broadcastToBoard(id, 'board:member-updated', {
      boardId: id,
      members,
      updatedUserId: userId,
      role,
      userId: req.user._id.toString(),
    });

    return res.status(200).json({ board: toResponse(board, req.user._id), members });
  } catch (error) {
    next(error);
  }
};

export const removeBoardMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    const board = await Board.findById(id);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    // Only owner can remove members
    if (board.owner?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Cannot remove the owner
    if (board.owner.toString() === userId) {
      return res.status(400).json({ message: 'Cannot remove board owner' });
    }

    const memberIndex = board.members.findIndex((m) => m.user.toString() === userId);
    if (memberIndex === -1) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Get member info for activity log before removal
    const membersBeforeRemoval = await getPopulatedMembers(board._id);
    const removedMember = membersBeforeRemoval.find((m) => m.id === userId);
    const memberName = removedMember?.username || 'Unknown user';

    board.members.splice(memberIndex, 1);

    board.activity.push(
      buildActivityEntry({
        action: 'removed member',
        entityType: 'member',
        actorId: req.user._id,
        entityId: userId,
        entityTitle: memberName,
      }),
    );

    await board.save();

    // Remove the user from all cards in this board where they are assigned
    const boardLists = await List.find({ board: board._id });
    const listIds = boardLists.map((l) => l._id);
    if (listIds.length > 0) {
      const updateResult = await Card.updateMany(
        { list: { $in: listIds }, assignedMembers: userId },
        { $pull: { assignedMembers: new Types.ObjectId(userId) } },
      );

      // Broadcast card updates if any cards were modified
      if (updateResult.modifiedCount > 0) {
        const updatedCards = await Card.find({
          list: { $in: listIds },
        });
        for (const card of updatedCards) {
          broadcastToBoard(id, 'card:updated', {
            card: {
              id: card._id.toString(),
              title: card.title,
              description: card.description,
              list: card.list?.toString(),
              position: card.position,
              labels: card.labels || [],
              dueDate: card.dueDate || null,
              checklist: card.checklist || [],
              assignedMembers: (card.assignedMembers || []).map((m) => m.toString()),
              comments: (card.comments || []).map((c) => ({
                id: c.id ?? c._id?.toString() ?? '',
                text: c.text ?? '',
                author: c.author ? c.author.toString() : null,
                createdAt: c.createdAt ?? null,
              })),
              activity: (card.activity || []).map((a) => ({
                id: a.id ?? a._id?.toString() ?? '',
                message: a.message ?? '',
                actor: a.actor ? a.actor.toString() : null,
                createdAt: a.createdAt ?? null,
              })),
              archived: card.archived || false,
            },
            listId: card.list?.toString(),
            userId: req.user._id.toString(),
          });
        }
      }
    }

    const members = await getPopulatedMembers(board._id);

    // Broadcast to other board members
    broadcastToBoard(id, 'board:member-removed', {
      boardId: id,
      members,
      removedUserId: userId,
      userId: req.user._id.toString(),
    });

    return res.status(200).json({ board: toResponse(board, req.user._id), members });
  } catch (error) {
    next(error);
  }
};

export const getBoardMembers = async (req, res, next) => {
  try {
    const { id } = req.params;

    const board = await Board.findById(id);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    // Any role can view members
    if (!canView(board, req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const members = await getPopulatedMembers(id);
    return res.status(200).json({ members });
  } catch (error) {
    next(error);
  }
};

export const getBoardActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 50, before } = req.query;

    const board = await Board.findById(id);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    // Any role can view activity
    if (!canView(board, req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    let activity = (board.activity || []).map(mapActivityEntry);

    // Sort by createdAt descending (most recent first)
    activity.sort((a, b) => {
      const aTime = new Date(a.createdAt ?? 0).getTime();
      const bTime = new Date(b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });

    // Filter by 'before' timestamp for pagination
    if (before) {
      const beforeTime = new Date(before).getTime();
      activity = activity.filter((entry) => new Date(entry.createdAt).getTime() < beforeTime);
    }

    // Limit results
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 50), 100);
    activity = activity.slice(0, limitNum);

    return res.status(200).json({ activity });
  } catch (error) {
    next(error);
  }
};

// Helper to add activity to a board (exported for use in other controllers)
export const addBoardActivity = async (boardId, activityData) => {
  const entry = buildActivityEntry(activityData);
  await Board.findByIdAndUpdate(boardId, { $push: { activity: entry } });
  return entry;
};
