import { Board } from '../models/Board.js';

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

    if (title !== undefined) board.title = title;
    if (description !== undefined) board.description = description;
    if (background !== undefined) board.background = sanitizeBackground(background);

    await board.save();

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

    const members = await getPopulatedMembers(board._id);
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

    board.members[memberIndex].role = role;
    await board.save();

    const members = await getPopulatedMembers(board._id);
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

    board.members.splice(memberIndex, 1);
    await board.save();

    const members = await getPopulatedMembers(board._id);
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
