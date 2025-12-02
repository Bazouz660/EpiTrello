import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockDispatch,
  mockFetchBoards,
  mockCreateBoard,
  mockUpdateBoard,
  mockDeleteBoard,
  mockNavigate,
} = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
  mockFetchBoards: vi.fn((payload) => ({ type: 'boards/fetch', meta: payload })),
  mockCreateBoard: vi.fn((payload) => ({ type: 'boards/create', payload })),
  mockUpdateBoard: vi.fn(),
  mockDeleteBoard: vi.fn(),
  mockNavigate: vi.fn(),
}));

let mockState = {};

vi.mock('../hooks/index.js', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector) => selector(mockState),
}));

vi.mock('../features/auth/authSlice.js', () => ({
  selectAuth: (state) => state.auth,
}));

vi.mock('../features/boards/boardsSlice.js', () => ({
  createBoard: mockCreateBoard,
  deleteBoard: mockDeleteBoard,
  fetchBoards: mockFetchBoards,
  selectBoards: (state) => state.boards,
  updateBoard: mockUpdateBoard,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import BoardsPage from './BoardsPage.jsx';

const renderBoardsPage = () =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/boards' }]}>
      <Routes>
        <Route path="/boards" element={<BoardsPage />} />
      </Routes>
    </MemoryRouter>,
  );

const buildState = () => ({
  auth: { user: { id: 'user-1', name: 'Avery' } },
  boards: {
    items: [],
    status: 'succeeded',
    error: null,
    createStatus: 'idle',
    createError: null,
    updateStatus: 'idle',
    updateError: null,
    updatingId: null,
    deleteStatus: 'idle',
    deleteError: null,
    deletingId: null,
  },
});

describe('BoardsPage', () => {
  beforeEach(() => {
    mockState = buildState();
    mockDispatch.mockReset();
    mockDispatch.mockReturnValue({ unwrap: () => Promise.resolve({ id: 'board-new' }) });
    mockCreateBoard.mockClear();
    mockFetchBoards.mockClear();
    mockNavigate.mockReset();
  });

  it('opens the create board modal when prompted', async () => {
    const user = userEvent.setup();
    renderBoardsPage();

    expect(screen.queryByLabelText('Board title')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create board' }));

    expect(screen.getByLabelText('Board title')).toBeInTheDocument();
  });

  it('submits the create board form from the modal', async () => {
    const user = userEvent.setup();
    renderBoardsPage();

    await user.click(screen.getByRole('button', { name: 'Create board' }));
    const modal = screen.getByRole('dialog');

    const titleInput = within(modal).getByLabelText('Board title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Launch pad');
    await user.type(within(modal).getByLabelText('Description'), 'Track rollout');

    await user.click(within(modal).getByRole('button', { name: 'Create board' }));

    expect(mockCreateBoard).toHaveBeenCalledWith({
      title: 'Launch pad',
      description: 'Track rollout',
      background: { type: 'color', value: '#0f172a' },
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/boards/board-new');
    });
  });
});
