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
  if (!currentUserId) return 'viewer';
  if (board.owner?.toString() === currentUserId) return 'owner';

  const member = board.members?.find((entry) => entry.user?.toString() === currentUserId);
  return member?.role ?? 'member';
};

const toResponse = (board, userId) => ({
  id: board._id.toString(),
  title: board.title,
  description: board.description,
  owner: board.owner?.toString(),
  members: board.members || [],
  background: board.background ?? { ...defaultBackground },
  membershipRole: resolveMembershipRole(board, userId),
});

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

    // owner or member check
    const isOwner = board.owner?.toString() === req.user._id.toString();
    const isMember = board.members?.some((m) => m.user?.toString() === req.user._id.toString());
    if (!isOwner && !isMember) return res.status(403).json({ message: 'Forbidden' });

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

    if (board.owner?.toString() !== req.user._id.toString()) {
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
