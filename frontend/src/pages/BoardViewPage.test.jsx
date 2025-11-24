import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockDispatch,
  mockFetchBoardById,
  mockFetchListsByBoard,
  mockFetchCardsByList,
  mockCreateList,
  mockUpdateList,
  mockDeleteList,
  mockCreateCard,
  mockUpdateCard,
  mockDeleteCard,
} = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
  mockFetchBoardById: vi.fn((payload) => ({ type: 'boards/fetchById', meta: payload })),
  mockFetchListsByBoard: vi.fn((payload) => ({ type: 'lists/fetchByBoard', meta: payload })),
  mockFetchCardsByList: vi.fn((payload) => ({ type: 'cards/fetchByList', meta: payload })),
  mockCreateList: vi.fn((payload) => ({ type: 'lists/create', payload })),
  mockUpdateList: vi.fn(),
  mockDeleteList: vi.fn(),
  mockCreateCard: vi.fn((payload) => ({ type: 'cards/create', payload })),
  mockUpdateCard: vi.fn(),
  mockDeleteCard: vi.fn(),
}));

let mockState = {};

vi.mock('../hooks/index.js', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector) => selector(mockState),
}));

vi.mock('../features/boards/boardsSlice.js', () => ({
  fetchBoardById: mockFetchBoardById,
  selectBoards: (state) => state.boards,
}));

vi.mock('../features/lists/listsSlice.js', () => ({
  createList: mockCreateList,
  deleteList: mockDeleteList,
  fetchListsByBoard: mockFetchListsByBoard,
  selectLists: (state) => state.lists,
  updateList: mockUpdateList,
}));

vi.mock('../features/cards/cardsSlice.js', () => ({
  createCard: mockCreateCard,
  deleteCard: mockDeleteCard,
  fetchCardsByList: mockFetchCardsByList,
  selectCards: (state) => state.cards,
  updateCard: mockUpdateCard,
}));

import BoardViewPage from './BoardViewPage.jsx';

const renderWithRouter = () =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/boards/board-1' }]}>
      <Routes>
        <Route path="/boards/:boardId" element={<BoardViewPage />} />
      </Routes>
    </MemoryRouter>,
  );

const buildState = () => ({
  boards: {
    selectedBoard: { id: 'board-1', title: 'Project Eagle', description: 'Ship it' },
    selectedStatus: 'succeeded',
    selectedError: null,
  },
  lists: {
    entities: {
      'list-1': { id: 'list-1', title: 'To do', board: 'board-1', position: 0 },
    },
    idsByBoard: { 'board-1': ['list-1'] },
    fetchStatusByBoard: { 'board-1': 'succeeded' },
    fetchErrorByBoard: {},
    createStatus: 'idle',
    createError: null,
    creatingBoardId: null,
    updateStatus: 'idle',
    updateError: null,
    updatingId: null,
    deleteStatus: 'idle',
    deleteError: null,
    deletingId: null,
  },
  cards: {
    entities: {
      'card-1': {
        id: 'card-1',
        title: 'Set up CI',
        description: 'Add lint step',
        list: 'list-1',
        position: 0,
      },
    },
    idsByList: { 'list-1': ['card-1'] },
    fetchStatusByList: { 'list-1': 'succeeded' },
    fetchErrorByList: {},
    createStatus: 'idle',
    createError: null,
    creatingListId: null,
    updateStatus: 'idle',
    updateError: null,
    updatingId: null,
    deleteStatus: 'idle',
    deleteError: null,
    deletingId: null,
  },
});

describe('BoardViewPage', () => {
  beforeEach(() => {
    mockState = buildState();
    mockDispatch.mockReset();
    mockDispatch.mockImplementation(() => ({ unwrap: () => Promise.resolve() }));
    mockFetchBoardById.mockClear();
    mockFetchListsByBoard.mockClear();
    mockFetchCardsByList.mockClear();
    mockCreateList.mockClear();
    mockCreateCard.mockClear();
  });

  it('renders the board header, lists, and cards from state', () => {
    renderWithRouter();

    expect(screen.getByRole('heading', { name: 'Project Eagle' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'To do' })).toBeInTheDocument();
    expect(screen.getByText('Set up CI')).toBeInTheDocument();
    expect(screen.getByText('Add lint step')).toBeInTheDocument();
  });

  it('submits the add list form through the dispatcher', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    mockDispatch.mockClear();
    await user.click(screen.getByRole('button', { name: 'Add list' }));
    await user.type(screen.getByLabelText('List title'), 'Backlog');
    await user.click(screen.getByRole('button', { name: 'Create list' }));

    expect(mockCreateList).toHaveBeenCalledWith({ board: 'board-1', title: 'Backlog' });
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('submits the add card form for the active list', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    mockDispatch.mockClear();
    await user.type(screen.getByLabelText('Card title'), 'Draft brief');
    await user.type(screen.getByLabelText('Description'), 'Outline the plan');
    await user.click(screen.getByRole('button', { name: 'Add card' }));

    expect(mockCreateCard).toHaveBeenCalledWith({
      list: 'list-1',
      title: 'Draft brief',
      description: 'Outline the plan',
    });
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });
});
