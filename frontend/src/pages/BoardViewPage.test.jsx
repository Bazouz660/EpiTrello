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
  mockUpdateList: vi.fn((payload) => ({ type: 'lists/update', payload })),
  mockDeleteList: vi.fn(),
  mockCreateCard: vi.fn((payload) => ({ type: 'cards/create', payload })),
  mockUpdateCard: vi.fn(),
  mockDeleteCard: vi.fn(),
}));

let mockState = {};

vi.mock('../hooks/index.js', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector) => selector(mockState),
  useBoardSocket: () => ({
    status: 'connected',
    isConnected: true,
    error: null,
    onlineUsers: [],
    reconnectAttempts: 0,
  }),
}));

vi.mock('../features/boards/boardsSlice.js', () => ({
  fetchBoardById: mockFetchBoardById,
  fetchBoardMembers: vi.fn((payload) => ({ type: 'boards/fetchMembers', meta: payload })),
  addBoardMember: vi.fn((payload) => ({ type: 'boards/addMember', payload })),
  removeBoardMember: vi.fn((payload) => ({ type: 'boards/removeMember', payload })),
  updateBoardMember: vi.fn((payload) => ({ type: 'boards/updateMember', payload })),
  searchUsers: vi.fn((payload) => ({ type: 'boards/searchUsers', payload })),
  selectBoards: (state) => state.boards,
}));

vi.mock('../features/auth/authSlice.js', () => ({
  selectAuth: (state) => state.auth,
}));

vi.mock('../features/lists/listsSlice.js', () => ({
  createList: mockCreateList,
  deleteList: mockDeleteList,
  fetchListsByBoard: mockFetchListsByBoard,
  selectLists: (state) => state.lists,
  updateList: mockUpdateList,
  optimisticReorderLists: vi.fn((payload) => ({ type: 'lists/optimisticReorder', payload })),
  reorderLists: vi.fn((payload) => ({ type: 'lists/reorder', payload })),
}));

vi.mock('../features/cards/cardsSlice.js', () => ({
  createCard: mockCreateCard,
  deleteCard: mockDeleteCard,
  fetchCardsByList: mockFetchCardsByList,
  selectCards: (state) => state.cards,
  updateCard: mockUpdateCard,
  optimisticMoveCard: vi.fn((payload) => ({ type: 'cards/optimisticMove', payload })),
  moveCard: vi.fn((payload) => ({ type: 'cards/move', payload })),
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
  auth: {
    user: { id: 'owner-1', username: 'testuser', email: 'test@example.com' },
    token: 'test-token',
    status: 'succeeded',
    error: null,
  },
  boards: {
    selectedBoard: {
      id: 'board-1',
      title: 'Project Eagle',
      description: 'Ship it',
      membershipRole: 'owner',
      owner: 'owner-1',
      members: [{ user: 'mem-1', role: 'member' }],
      background: { type: 'color', value: '#0f172a' },
    },
    selectedStatus: 'succeeded',
    selectedError: null,
    members: [
      { id: 'owner-1', username: 'testuser', email: 'test@example.com', role: 'owner' },
      { id: 'mem-1', username: 'member1', email: 'member1@example.com', role: 'member' },
    ],
    membersStatus: 'succeeded',
    membersError: null,
    addMemberStatus: 'idle',
    addMemberError: null,
    removeMemberStatus: 'idle',
    removeMemberError: null,
    updateMemberStatus: 'idle',
    updateMemberError: null,
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
    reorderStatus: 'idle',
    reorderError: null,
  },
  cards: {
    entities: {
      'card-1': {
        id: 'card-1',
        title: 'Set up CI',
        description: 'Add lint step',
        list: 'list-1',
        position: 0,
        dueDate: '2025-01-01T12:00:00.000Z',
        labels: [{ color: '#0284c7', text: 'Dev' }],
        assignedMembers: ['mem-1'],
        checklist: [
          { text: 'Add lint', completed: true },
          { text: 'Add tests', completed: false },
        ],
        comments: [
          {
            id: 'comment-1',
            text: 'Great work',
            author: 'mem-1',
            createdAt: '2025-01-02T09:00:00.000Z',
          },
        ],
        activity: [
          {
            id: 'activity-1',
            message: 'Card created',
            actor: 'owner-1',
            createdAt: '2024-12-31T10:00:00.000Z',
          },
        ],
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
    moveStatus: 'idle',
    moveError: null,
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
    mockUpdateList.mockClear();
    mockUpdateCard.mockClear();
  });

  it('renders the board header, lists, and cards from state', () => {
    renderWithRouter();

    expect(screen.getByRole('heading', { name: 'Project Eagle' })).toBeInTheDocument();
    expect(screen.getByText('To do')).toBeInTheDocument();
    expect(screen.getByText('Set up CI')).toBeInTheDocument();
    expect(screen.queryByText('Add lint step')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Card has description')).toBeInTheDocument();
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

  it('submits the add card form through the modal', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    mockDispatch.mockClear();
    await user.click(screen.getByRole('button', { name: /\+\s*add card/i }));
    await user.type(screen.getByLabelText('Title'), 'Draft brief');
    await user.type(screen.getByLabelText('Description'), 'Outline the plan');
    await user.click(screen.getByRole('button', { name: 'Create card' }));

    expect(mockCreateCard).toHaveBeenCalledWith({
      list: 'list-1',
      title: 'Draft brief',
      description: 'Outline the plan',
    });
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('opens the card detail view with metadata when a card is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByLabelText('Open details for Set up CI'));
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByText('Add lint step')).toBeInTheDocument();
    expect(screen.getAllByText('Dev').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('member1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Great work')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Close'));
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('saves card updates through the single edit/save flow', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    mockDispatch.mockClear();
    await user.click(screen.getByLabelText('Open details for Set up CI'));
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    const titleField = screen.getByLabelText('Card title');
    await user.clear(titleField);
    await user.type(titleField, 'CI v2');

    const descriptionField = screen.getByLabelText('Card description');
    await user.clear(descriptionField);
    await user.type(descriptionField, 'Update the lint workflow');

    const dueDateInput = screen.getByLabelText('Card due date');
    await user.clear(dueDateInput);
    await user.type(dueDateInput, '2025-02-14T10:30');

    await user.click(screen.getByRole('button', { name: 'Add label' }));
    const secondLabelInput = screen.getByLabelText('Label 2 text');
    await user.type(secondLabelInput, 'Docs');

    await user.click(screen.getByLabelText('testuser'));

    await user.click(screen.getByRole('button', { name: 'Add item' }));
    const checklistInput = screen.getByLabelText('Checklist item 3');
    await user.type(checklistInput, 'Verify docs');

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const expectedIso = new Date('2025-02-14T10:30').toISOString();
    expect(mockUpdateCard).toHaveBeenCalledTimes(1);
    expect(mockUpdateCard).toHaveBeenCalledWith({
      id: 'card-1',
      changes: {
        title: 'CI v2',
        description: 'Update the lint workflow',
        dueDate: expectedIso,
        labels: [
          { color: '#0284c7', text: 'Dev' },
          { color: '#0f172a', text: 'Docs' },
        ],
        assignedMembers: ['mem-1', 'owner-1'],
        checklist: [
          { text: 'Add lint', completed: true },
          { text: 'Add tests', completed: false },
          { text: 'Verify docs', completed: false },
        ],
      },
    });
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('deletes cards via the detail modal controls', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithRouter();

    mockDispatch.mockClear();
    await user.click(screen.getByLabelText('Open details for Set up CI'));
    await user.click(screen.getByRole('button', { name: 'Delete card' }));

    expect(mockDeleteCard).toHaveBeenCalledWith({ id: 'card-1' });
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });

  it('allows inline editing of list titles', async () => {
    const { fireEvent } = await import('@testing-library/react');
    renderWithRouter();
    mockDispatch.mockClear();

    // Find the span with the list title and click on its parent button
    const listTitleSpan = screen.getByText('To do');
    const editButton = listTitleSpan.closest('button');
    expect(editButton).toBeInTheDocument();

    // Use fireEvent instead of user.click as dnd-kit may interfere with pointer events
    fireEvent.click(editButton);

    // After clicking, the input field should appear
    const input = await screen.findByLabelText('Edit list title');
    // Clear and type new value
    fireEvent.change(input, { target: { value: 'Production ready' } });

    // Submit the form
    const form = input.closest('form');
    fireEvent.submit(form);

    // Check that dispatch was called with updateList
    expect(mockDispatch).toHaveBeenCalled();
    expect(mockUpdateList).toHaveBeenCalledWith({
      id: 'list-1',
      changes: { title: 'Production ready' },
    });
  });
});
