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
  mockUpdateBoard: vi.fn((payload) => ({ type: 'boards/update', payload })),
  mockDeleteBoard: vi.fn((payload) => ({ type: 'boards/delete', payload })),
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

const buildState = (overrides = {}) => ({
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
    ...overrides.boards,
  },
  ...overrides,
});

describe('BoardsPage', () => {
  beforeEach(() => {
    mockState = buildState();
    mockDispatch.mockReset();
    mockDispatch.mockReturnValue({ unwrap: () => Promise.resolve({ id: 'board-new' }) });
    mockCreateBoard.mockClear();
    mockUpdateBoard.mockClear();
    mockDeleteBoard.mockClear();
    mockFetchBoards.mockClear();
    mockNavigate.mockReset();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
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

  it('opens the edit board modal when clicking Edit button', async () => {
    const user = userEvent.setup();
    mockState = buildState({
      boards: {
        items: [
          {
            id: 'board-1',
            title: 'My Board',
            description: 'A test board',
            owner: 'user-1',
            background: { type: 'color', value: '#0f172a' },
          },
        ],
        status: 'succeeded',
      },
    });
    renderBoardsPage();

    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText('Edit board')).toBeInTheDocument();
    expect(within(modal).getByLabelText('Board title')).toHaveValue('My Board');
  });

  it('submits the edit board form from the modal', async () => {
    const user = userEvent.setup();
    mockState = buildState({
      boards: {
        items: [
          {
            id: 'board-1',
            title: 'My Board',
            description: 'A test board',
            owner: 'user-1',
            background: { type: 'color', value: '#0f172a' },
          },
        ],
        status: 'succeeded',
      },
    });
    renderBoardsPage();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const modal = screen.getByRole('dialog');

    const titleInput = within(modal).getByLabelText('Board title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Board');

    await user.click(within(modal).getByRole('button', { name: 'Save changes' }));

    expect(mockUpdateBoard).toHaveBeenCalledWith({
      id: 'board-1',
      changes: {
        title: 'Updated Board',
        description: 'A test board',
        background: { type: 'color', value: '#0f172a' },
      },
    });
  });

  it('deletes a board from the edit modal', async () => {
    const user = userEvent.setup();
    mockState = buildState({
      boards: {
        items: [
          {
            id: 'board-1',
            title: 'My Board',
            description: 'A test board',
            owner: 'user-1',
            background: { type: 'color', value: '#0f172a' },
          },
        ],
        status: 'succeeded',
      },
    });
    renderBoardsPage();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const modal = screen.getByRole('dialog');

    await user.click(within(modal).getByRole('button', { name: 'Delete board' }));

    expect(mockDeleteBoard).toHaveBeenCalledWith({ id: 'board-1' });
  });

  it('closes the edit modal when clicking Cancel', async () => {
    const user = userEvent.setup();
    mockState = buildState({
      boards: {
        items: [
          {
            id: 'board-1',
            title: 'My Board',
            description: 'A test board',
            owner: 'user-1',
            background: { type: 'color', value: '#0f172a' },
          },
        ],
        status: 'succeeded',
      },
    });
    renderBoardsPage();

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('does not show Edit button for non-owner boards', async () => {
    mockState = buildState({
      boards: {
        items: [
          {
            id: 'board-1',
            title: 'Shared Board',
            description: 'Not my board',
            owner: 'user-2',
            membershipRole: 'member',
            background: { type: 'color', value: '#0f172a' },
          },
        ],
        status: 'succeeded',
      },
    });
    renderBoardsPage();

    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });
});
