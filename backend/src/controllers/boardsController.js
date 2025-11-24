import { Board } from '../models/Board.js';

const toResponse = (board) => ({
  id: board._id.toString(),
  title: board.title,
  description: board.description,
  owner: board.owner?.toString(),
  members: board.members || [],
});

export const createBoard = async (req, res, next) => {
  try {
    const { title, description = '' } = req.body;
    if (!title) return res.status(400).json({ message: 'title is required' });

    const board = new Board({ title, description, owner: req.user._id });
    await board.save();

    return res.status(201).json({ board: toResponse(board) });
  } catch (error) {
    next(error);
  }
};

export const listBoards = async (req, res, next) => {
  try {
    const boards = await Board.find({ owner: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ boards: boards.map(toResponse) });
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

    return res.status(200).json({ board: toResponse(board) });
  } catch (error) {
    next(error);
  }
};

export const updateBoard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    const board = await Board.findById(id);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    if (board.owner?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (title !== undefined) board.title = title;
    if (description !== undefined) board.description = description;

    await board.save();

    return res.status(200).json({ board: toResponse(board) });
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
