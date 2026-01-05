import {
  closestCenter,
  closestCorners,
  DndContext,
  DragOverlay,
  getFirstCollision,
  KeyboardSensor,
  pointerWithin,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';

import ActiveUsersDisplay from '../components/boards/ActiveUsersDisplay.jsx';
import BoardMembersPanel from '../components/boards/BoardMembersPanel.jsx';
import UserCursorsOverlay from '../components/boards/UserCursorsOverlay.jsx';
import CardDetailModal from '../components/cards/CardDetailModal.jsx';
import CardListItem from '../components/cards/CardListItem.jsx';
import ConnectionStatus from '../components/ConnectionStatus.jsx';
import { DroppableListArea, SortableCard, SortableList } from '../components/dnd/index.js';
import { selectAuth } from '../features/auth/authSlice.js';
import {
  addBoardMember,
  fetchBoardById,
  fetchBoardMembers,
  removeBoardMember,
  searchUsers,
  selectBoards,
  updateBoardMember,
  clearMemberErrors,
} from '../features/boards/boardsSlice.js';
import {
  addComment,
  createCard,
  deleteCard,
  fetchCardsByList,
  moveCard,
  optimisticMoveCard,
  selectCards,
  updateCard,
} from '../features/cards/cardsSlice.js';
import {
  createList,
  deleteList,
  fetchListsByBoard,
  optimisticReorderLists,
  reorderLists,
  selectLists,
  updateList,
} from '../features/lists/listsSlice.js';
import { useAppDispatch, useAppSelector, useBoardSocket } from '../hooks/index.js';

const emptyListEditor = { id: null, title: '' };
const emptyCardModalState = {
  mode: null,
  id: null,
  listId: null,
  title: '',
  description: '',
};
const defaultBoardTheme = { type: 'color', value: '#0f172a', thumbnail: '' };

const buildBoardBackgroundStyle = (background) => {
  if (!background) {
    return { backgroundColor: defaultBoardTheme.value };
  }
  if (background.type === 'image') {
    return {
      backgroundImage: `url(${background.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  return { backgroundColor: background.value };
};

const BoardViewPage = () => {
  const { boardId } = useParams();
  const dispatch = useAppDispatch();
  const boardsState = useAppSelector(selectBoards);
  const listsState = useAppSelector(selectLists);
  const cardsState = useAppSelector(selectCards);
  const authState = useAppSelector(selectAuth);

  const [newListTitle, setNewListTitle] = useState('');
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listEditor, setListEditor] = useState(emptyListEditor);
  const [cardModal, setCardModal] = useState(emptyCardModalState);
  const [cardModalError, setCardModalError] = useState(null);
  const [activeCardId, setActiveCardId] = useState(null);
  const [activeDragItem, setActiveDragItem] = useState(null);
  const [isMembersPanelOpen, setIsMembersPanelOpen] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const listTitleInputRef = useRef(null);
  // Track card order during drag to sync with dnd-kit's visual state
  const dragCardOrderRef = useRef(null);
  // Ref for tracking cursor position in the board area
  const boardAreaRef = useRef(null);

  // Real-time WebSocket connection
  const {
    status: socketStatus,
    onlineUsers,
    cursorPositions,
    updateCursorPosition,
  } = useBoardSocket(boardId, authState.token);

  // Throttle cursor updates to reduce network traffic
  const lastCursorUpdateRef = useRef(0);
  const CURSOR_UPDATE_THROTTLE = 50; // ms

  const handleMouseMove = useCallback(
    (event) => {
      const now = Date.now();
      if (now - lastCursorUpdateRef.current < CURSOR_UPDATE_THROTTLE) return;
      lastCursorUpdateRef.current = now;

      if (!boardAreaRef.current || !updateCursorPosition) return;

      const rect = boardAreaRef.current.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;

      // Only send if within bounds
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        updateCursorPosition(x, y);
      }
    },
    [updateCursorPosition],
  );

  // Custom collision detection that handles lists and cards appropriately
  const collisionDetectionStrategy = useCallback(
    (args) => {
      // When dragging a list, only consider other lists as drop targets
      if (activeDragItem?.type === 'list') {
        const collisions = closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => container.data.current?.type === 'list',
          ),
        });
        return collisions;
      }

      // For cards, use a combination strategy
      // First check if pointer is within any container
      const pointerCollisions = pointerWithin(args);
      const collisions = pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);

      // Get the first collision
      let overId = getFirstCollision(collisions, 'id');
      if (!overId) return [];

      // If over a list container, check for cards inside
      const overContainer = args.droppableContainers.find((c) => c.id === overId);
      if (overContainer?.data.current?.type === 'list-container') {
        // Find cards within this list and use closest corners for precise placement
        const listId = overContainer.data.current?.listId;
        const cardsInList = args.droppableContainers.filter(
          (c) => c.data.current?.type === 'card' && c.data.current?.listId === listId,
        );
        if (cardsInList.length > 0) {
          const cardCollisions = closestCorners({
            ...args,
            droppableContainers: cardsInList,
          });
          if (cardCollisions.length > 0) {
            return cardCollisions;
          }
        }
      }

      return collisions;
    },
    [activeDragItem],
  );

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const closeCreateListModal = () => {
    setIsListModalOpen(false);
    setNewListTitle('');
  };

  const closeCardModal = () => {
    setCardModal(emptyCardModalState);
    setCardModalError(null);
  };

  const closeCardDetail = () => {
    setActiveCardId(null);
  };

  const openMembersPanel = useCallback(() => {
    setIsMembersPanelOpen(true);
    setUserSearchResults([]);
    dispatch(clearMemberErrors());
    dispatch(fetchBoardMembers({ boardId }));
  }, [dispatch, boardId]);

  const closeMembersPanel = useCallback(() => {
    setIsMembersPanelOpen(false);
    setUserSearchResults([]);
    dispatch(clearMemberErrors());
  }, [dispatch]);

  const handleSearchUsers = useCallback(
    async (query) => {
      setIsSearchingUsers(true);
      try {
        const result = await dispatch(searchUsers({ query })).unwrap();
        setUserSearchResults(result);
      } catch {
        setUserSearchResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    },
    [dispatch],
  );

  const handleAddMember = useCallback(
    async (userId, role) => {
      try {
        await dispatch(addBoardMember({ boardId, userId, role })).unwrap();
        setUserSearchResults([]);
      } catch {
        // Error handled by slice
      }
    },
    [dispatch, boardId],
  );

  const handleRemoveMember = useCallback(
    async (userId) => {
      try {
        await dispatch(removeBoardMember({ boardId, userId })).unwrap();
      } catch {
        // Error handled by slice
      }
    },
    [dispatch, boardId],
  );

  const handleUpdateMemberRole = useCallback(
    async (userId, role) => {
      try {
        await dispatch(updateBoardMember({ boardId, userId, role })).unwrap();
      } catch {
        // Error handled by slice
      }
    },
    [dispatch, boardId],
  );

  const isCardModalOpen = cardModal.mode !== null;
  const activeCard = activeCardId ? cardsState.entities[activeCardId] : null;
  const isCardDetailOpen = Boolean(activeCard);

  const board = boardsState.selectedBoard?.id === boardId ? boardsState.selectedBoard : null;
  const boardBackgroundStyle = buildBoardBackgroundStyle(board?.background ?? defaultBoardTheme);
  const boardError =
    boardsState.selectedStatus === 'failed' && boardsState.selectedError
      ? boardsState.selectedError
      : null;
  const showBoardLoading =
    !board && (boardsState.selectedStatus === 'idle' || boardsState.selectedStatus === 'loading');

  const boardMembersList = useMemo(() => {
    // Use boardsState.members as the primary source (has username from API)
    // Fall back to board.members if needed
    if (boardsState.members && boardsState.members.length > 0) {
      return boardsState.members.map((member) => ({
        id: member.id,
        username: member.username,
        displayName: member.username || member.email || 'Member',
        email: member.email,
        role: member.role ?? 'member',
        avatarUrl: member.avatarUrl,
      }));
    }

    // Fallback to board.members if boardsState.members not loaded yet
    if (!board) return [];
    const members = Array.isArray(board.members) ? board.members : [];
    const normalized = members
      .filter((member) => member?.user)
      .map((member) => ({
        id: member.user,
        role: member.role ?? 'member',
        displayName: member.displayName ?? 'Member',
      }));
    if (board.owner && !normalized.some((member) => member.id === board.owner)) {
      normalized.unshift({ id: board.owner, role: 'owner', displayName: 'Board owner' });
    }
    return normalized;
  }, [board, boardsState.members]);

  const listsStatus = listsState.fetchStatusByBoard[boardId] ?? 'idle';
  const listsError = listsState.fetchErrorByBoard[boardId] ?? null;
  const lists = useMemo(
    () =>
      (listsState.idsByBoard[boardId] ?? []).map((id) => listsState.entities[id]).filter(Boolean),
    [boardId, listsState.entities, listsState.idsByBoard],
  );

  const cardsByList = useMemo(() => {
    const result = {};
    lists.forEach((list) => {
      result[list.id] = (cardsState.idsByList[list.id] ?? [])
        .map((cardId) => cardsState.entities[cardId])
        .filter(Boolean);
    });
    return result;
  }, [cardsState.entities, cardsState.idsByList, lists]);

  const listIds = useMemo(() => lists.map((list) => list.id), [lists]);

  // Drag & drop handlers
  const handleDragStart = (event) => {
    const { active } = event;
    const { type } = active.data.current || {};
    if (type === 'list') {
      const list = listsState.entities[active.id];
      setActiveDragItem({ type: 'list', data: list });
    } else if (type === 'card') {
      const card = cardsState.entities[active.id];
      setActiveDragItem({ type: 'card', data: card, originalListId: card.list });
      // Initialize drag order tracking with current card positions for all lists
      dragCardOrderRef.current = { ...cardsState.idsByList };
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type;
    if (activeType !== 'card') return;

    const activeId = active.id;
    const overId = over.id;
    const overType = over.data.current?.type;

    // Get the original source list from activeDragItem (stable reference)
    const originalSourceListId = activeDragItem?.originalListId;
    if (!originalSourceListId || !dragCardOrderRef.current) return;

    // Determine the target list
    let overListId;
    if (overType === 'card') {
      overListId = over.data.current?.listId;
    } else if (overType === 'list-container') {
      overListId = over.data.current?.listId;
    } else if (overType === 'list') {
      overListId = over.id;
    }

    if (!overListId) return;

    // Find which list currently contains the card in our tracked order
    let currentListId = null;
    for (const listId of Object.keys(dragCardOrderRef.current)) {
      if (dragCardOrderRef.current[listId]?.includes(activeId)) {
        currentListId = listId;
        break;
      }
    }

    if (!currentListId) return;

    // Get current card arrays from our tracked order
    const currentListCards = [...(dragCardOrderRef.current[currentListId] ?? [])];
    const targetCards = [...(dragCardOrderRef.current[overListId] ?? [])];

    if (currentListId === overListId) {
      // Same list reordering
      if (overType !== 'card' || overId === activeId) return;

      const oldIndex = currentListCards.indexOf(activeId);
      const overIndex = currentListCards.indexOf(overId);

      if (oldIndex === -1 || overIndex === -1 || oldIndex === overIndex) return;

      // Use arrayMove to reorder
      const newCardIds = arrayMove(currentListCards, oldIndex, overIndex);

      // Check if this would change anything
      if (newCardIds.join(',') === currentListCards.join(',')) return;

      // Update our tracked order
      dragCardOrderRef.current = {
        ...dragCardOrderRef.current,
        [currentListId]: newCardIds,
      };

      // Dispatch optimistic update
      dispatch(
        optimisticMoveCard({
          cardId: activeId,
          sourceListId: currentListId,
          targetListId: currentListId,
          sourceListCardIds: newCardIds,
          targetListCardIds: newCardIds,
        }),
      );
      return;
    }

    // Cross-list move: Move card from current list to target list
    const newSourceCards = currentListCards.filter((id) => id !== activeId);

    // Calculate position in target list, excluding the active card if it's already there
    const targetCardsWithoutActive = targetCards.filter((id) => id !== activeId);
    let insertIndex = targetCardsWithoutActive.length;
    if (overType === 'card' && overId !== activeId) {
      const overIndex = targetCardsWithoutActive.indexOf(overId);
      if (overIndex !== -1) {
        insertIndex = overIndex;
      }
    }

    const newTargetCards = [
      ...targetCardsWithoutActive.slice(0, insertIndex),
      activeId,
      ...targetCardsWithoutActive.slice(insertIndex),
    ];

    // Check if this would change anything
    if (
      newSourceCards.join(',') === currentListCards.join(',') &&
      newTargetCards.join(',') === targetCards.join(',')
    ) {
      return;
    }

    // Update our tracked order
    dragCardOrderRef.current = {
      ...dragCardOrderRef.current,
      [currentListId]: newSourceCards,
      [overListId]: newTargetCards,
    };

    dispatch(
      optimisticMoveCard({
        cardId: activeId,
        sourceListId: currentListId,
        targetListId: overListId,
        sourceListCardIds: newSourceCards,
        targetListCardIds: newTargetCards,
      }),
    );
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    // Capture original list ID from activeDragItem before clearing it
    const originalSourceListId =
      activeDragItem?.type === 'card' ? activeDragItem.originalListId : null;
    setActiveDragItem(null);
    dragCardOrderRef.current = null;

    if (!over) return;

    const activeType = active.data.current?.type;

    if (activeType === 'list') {
      // Reordering lists
      const oldIndex = listIds.indexOf(active.id);
      const newIndex = listIds.indexOf(over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newListIds = arrayMove(listIds, oldIndex, newIndex);

        // Optimistic update
        dispatch(optimisticReorderLists({ boardId, listIds: newListIds }));

        // Persist to server
        dispatch(reorderLists({ boardId, listIds: newListIds }));
      }
    } else if (activeType === 'card') {
      const activeId = active.id;

      // Find which list currently contains the card (state was updated in handleDragOver)
      let currentListId = null;
      for (const listId of Object.keys(cardsState.idsByList)) {
        if (cardsState.idsByList[listId]?.includes(activeId)) {
          currentListId = listId;
          break;
        }
      }

      if (!currentListId) return;

      const currentListCards = cardsState.idsByList[currentListId] ?? [];
      const position = currentListCards.indexOf(activeId);

      if (position === -1) return;

      // Determine source list cards for the API call
      const sourceCards = originalSourceListId
        ? (cardsState.idsByList[originalSourceListId] ?? [])
        : currentListCards;

      // Persist current state to server
      dispatch(
        moveCard({
          cardId: activeId,
          targetListId: currentListId,
          position,
          sourceListCardIds: sourceCards,
          targetListCardIds: currentListCards,
        }),
      );
    }
  };

  useEffect(() => {
    dispatch(fetchBoardById({ id: boardId }));
    dispatch(fetchBoardMembers({ boardId }));
  }, [dispatch, boardId]);

  useEffect(() => {
    if (listsStatus === 'idle') {
      dispatch(fetchListsByBoard({ boardId }));
    }
  }, [dispatch, boardId, listsStatus]);

  useEffect(() => {
    lists.forEach((list) => {
      const status = cardsState.fetchStatusByList[list.id] ?? 'idle';
      if (status === 'idle') {
        dispatch(fetchCardsByList({ listId: list.id }));
      }
    });
  }, [dispatch, lists, cardsState.fetchStatusByList]);

  useEffect(() => {
    if (!isListModalOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCreateListModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListModalOpen]);

  useEffect(() => {
    if (!isCardModalOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCardModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCardModalOpen]);

  useEffect(() => {
    if (!isCardDetailOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCardDetail();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCardDetailOpen]);

  useEffect(() => {
    if (activeCardId && !cardsState.entities[activeCardId]) {
      closeCardDetail();
    }
  }, [activeCardId, cardsState.entities]);

  useEffect(() => {
    if (!listEditor.id) return;
    const input = listTitleInputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, [listEditor.id]);

  const handleCreateList = async (event) => {
    event.preventDefault();
    const title = newListTitle.trim();
    if (!title) return;
    try {
      await dispatch(createList({ board: boardId, title })).unwrap();
      closeCreateListModal();
    } catch {
      // error handled via slice state
    }
  };

  const startEditingList = (list) => {
    setListEditor({ id: list.id, title: list.title });
  };

  const cancelListEdit = () => {
    setListEditor(emptyListEditor);
  };

  const handleListTitleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelListEdit();
    }
  };

  const handleUpdateList = async (event) => {
    event.preventDefault();
    if (!listEditor.id) return;
    const title = listEditor.title.trim();
    if (!title) return;
    try {
      await dispatch(updateList({ id: listEditor.id, changes: { title } })).unwrap();
      cancelListEdit();
    } catch {
      // surfaced through slice
    }
  };

  const handleDeleteList = async (listId) => {
    const confirmed = window.confirm('Delete this list and all of its cards?');
    if (!confirmed) return;
    try {
      await dispatch(deleteList({ id: listId })).unwrap();
    } catch {
      // surfaced via slice
    }
  };

  const openCreateCardModal = (listId) => {
    setCardModal({ mode: 'create', id: null, listId, title: '', description: '' });
    setCardModalError(null);
  };

  const handleDeleteCard = async (cardId) => {
    const confirmed = window.confirm('Delete this card?');
    if (!confirmed) return;
    try {
      await dispatch(deleteCard({ id: cardId })).unwrap();
    } catch {
      // surfaced via slice
    }
  };

  const handleCardDetailOpen = (cardId) => {
    setActiveCardId(cardId);
  };

  const saveCardChanges = async (cardId, changes) => {
    if (!cardId) return;
    try {
      await dispatch(
        updateCard({
          id: cardId,
          changes,
        }),
      ).unwrap();
    } catch {
      // errors handled by slice state
    }
  };

  const handleCardModalSubmit = async (event) => {
    event.preventDefault();
    if (!isCardModalOpen) return;
    const title = cardModal.title.trim();
    if (!title) return;
    setCardModalError(null);
    try {
      await dispatch(
        createCard({
          list: cardModal.listId,
          title,
          description: cardModal.description.trim(),
        }),
      ).unwrap();
      closeCardModal();
    } catch (error) {
      setCardModalError(
        typeof error === 'string' ? error : 'Unable to save card. Please try again.',
      );
    }
  };

  if (showBoardLoading) {
    return (
      <section className="space-y-4">
        <Link to="/boards" className="text-sm text-blue-600 hover:underline">
          ← Back to boards
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-1/3 rounded bg-slate-200" />
            <div className="h-4 w-2/5 rounded bg-slate-200" />
            <div className="flex gap-3">
              <div className="h-32 flex-1 rounded-lg bg-slate-100" />
              <div className="h-32 flex-1 rounded-lg bg-slate-100" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!board) {
    return (
      <section className="space-y-4">
        <Link to="/boards" className="text-sm text-blue-600 hover:underline">
          ← Back to boards
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-red-600">
          {boardError ??
            'This board could not be loaded. Try refreshing or return to the boards list.'}
        </div>
      </section>
    );
  }

  const membershipRole = board.membershipRole ?? 'owner';
  const isOwner = membershipRole === 'owner';

  // Permission helpers based on role hierarchy: owner > admin > member > viewer
  const canEdit = ['owner', 'admin', 'member'].includes(membershipRole);
  const canManage = ['owner', 'admin'].includes(membershipRole);
  const isViewer = membershipRole === 'viewer';

  const currentUserId = authState.user?.id;

  const cardModalTitle = 'Add card';
  const cardModalDescription = 'Enter a title to create a new card in this list.';
  const cardModalPrimaryLabel = 'Create card';

  const isSubmittingCard =
    cardModal.mode === 'create' &&
    cardsState.createStatus === 'loading' &&
    cardsState.creatingListId === cardModal.listId;

  const isDeletingActiveCard =
    isCardDetailOpen &&
    cardsState.deleteStatus === 'loading' &&
    cardsState.deletingId === activeCard?.id;

  const activeCardDeleteError =
    isCardDetailOpen && cardsState.deleteError && cardsState.deletingId === activeCard?.id
      ? cardsState.deleteError
      : null;

  return (
    <section
      ref={boardAreaRef}
      className="relative -mx-6 -my-8 h-[calc(100vh-73px)] overflow-hidden"
      style={boardBackgroundStyle}
      onMouseMove={handleMouseMove}
    >
      <div className="absolute inset-0 bg-slate-900/60" />

      {/* Other users' cursors overlay */}
      <UserCursorsOverlay cursorPositions={cursorPositions} currentUserId={currentUserId} />

      <div className="relative z-10 flex h-full flex-col p-6 pb-0">
        <div className="mx-auto mb-6 flex w-full max-w-6xl flex-shrink-0 flex-wrap items-center justify-between gap-3 text-white">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs uppercase tracking-wide text-slate-200">
                {isOwner ? 'Owned board' : `Shared · ${membershipRole}`}
              </p>
              <ConnectionStatus status={socketStatus} size="xs" showLabel={false} />
            </div>
            <h1 className="text-3xl font-semibold text-white">{board.title}</h1>
            {board.description && <p className="text-sm text-slate-100">{board.description}</p>}
          </div>

          {/* Active users display */}
          <div className="flex items-center gap-4">
            <ActiveUsersDisplay
              users={onlineUsers}
              currentUserId={currentUserId}
              maxVisible={5}
              size="md"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openMembersPanel}
              className="inline-flex items-center rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              Members
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsListModalOpen(true)}
                className="inline-flex items-center rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
              >
                Add list
              </button>
            )}
            <Link
              to="/boards"
              className="inline-flex items-center rounded-md border border-white/30 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Back to boards
            </Link>
          </div>
        </div>

        {listsError && (
          <div className="mx-auto mb-6 w-full max-w-6xl flex-shrink-0 rounded-lg border border-red-200 bg-red-50/90 p-4 text-sm text-red-700">
            {listsError}
          </div>
        )}

        {isViewer && (
          <div className="mx-auto mb-4 w-full max-w-6xl flex-shrink-0 rounded-lg border border-amber-200/50 bg-amber-500/20 px-4 py-2 text-sm text-amber-100 backdrop-blur">
            <span className="font-medium">View only</span> — You can view this board but cannot make
            changes.
          </div>
        )}

        <div className="custom-scrollbar -mx-6 min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-6 pb-3">
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetectionStrategy}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex h-full items-stretch gap-4 pr-6">
              {listsStatus === 'loading' && lists.length === 0 && (
                <div className="flex min-h-[200px] min-w-[280px] items-center justify-center rounded-lg border border-white/30 bg-white/10 p-6 text-sm text-white/80">
                  Loading lists…
                </div>
              )}
              {lists.length === 0 && listsStatus === 'succeeded' && (
                <div className="flex min-h-[200px] min-w-[280px] items-center justify-center rounded-lg border border-dashed border-white/40 bg-white/5 p-6 text-sm text-white/80">
                  This board does not have any lists yet.
                </div>
              )}
              <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
                {lists.map((list) => {
                  const isEditing = listEditor.id === list.id;
                  const cards = cardsByList[list.id] ?? [];
                  const cardIds = cards.map((c) => c.id);
                  const cardsStatus = cardsState.fetchStatusByList[list.id] ?? 'idle';
                  const cardsError = cardsState.fetchErrorByList[list.id] ?? null;
                  const isDeletingList =
                    listsState.deleteStatus === 'loading' && listsState.deletingId === list.id;

                  return (
                    <SortableList key={list.id} id={list.id} activeDragType={activeDragItem?.type}>
                      {({
                        attributes,
                        listeners,
                        isDragging: isListDragging,
                        isOver: isListOver,
                      }) => (
                        <div
                          className={`flex max-h-full w-72 min-w-[18rem] flex-shrink-0 flex-col rounded-xl border p-4 text-white backdrop-blur-sm transition-all duration-200 ease-out ${
                            isListDragging
                              ? 'border-dashed border-blue-400/60 bg-slate-800/40 shadow-inner'
                              : isListOver
                                ? 'border-blue-400 bg-slate-800/90 shadow-[0_20px_50px_rgba(15,23,42,0.45)] ring-2 ring-blue-400/50'
                                : 'border-white/40 bg-slate-800/80 shadow-[0_15px_40px_rgba(15,23,42,0.35)]'
                          }`}
                        >
                          <div className="mb-3 flex items-start gap-2">
                            {/* Drag handle - only shown if user can edit */}
                            {canEdit && (
                              <button
                                type="button"
                                className="mt-1 flex-shrink-0 cursor-grab rounded p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white active:cursor-grabbing"
                                {...attributes}
                                {...listeners}
                                aria-label="Drag to reorder list"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <circle cx="9" cy="5" r="1.5" />
                                  <circle cx="15" cy="5" r="1.5" />
                                  <circle cx="9" cy="12" r="1.5" />
                                  <circle cx="15" cy="12" r="1.5" />
                                  <circle cx="9" cy="19" r="1.5" />
                                  <circle cx="15" cy="19" r="1.5" />
                                </svg>
                              </button>
                            )}
                            <div className="min-w-0 flex-1">
                              {isEditing ? (
                                <form onSubmit={handleUpdateList} className="space-y-1">
                                  <label htmlFor={`edit-list-${list.id}`} className="sr-only">
                                    Edit list title
                                  </label>
                                  <input
                                    id={`edit-list-${list.id}`}
                                    ref={listTitleInputRef}
                                    value={listEditor.title}
                                    onChange={(event) =>
                                      setListEditor((prev) => ({
                                        ...prev,
                                        title: event.target.value,
                                      }))
                                    }
                                    onKeyDown={handleListTitleKeyDown}
                                    onBlur={cancelListEdit}
                                    className="w-full border-none bg-transparent px-0 py-0 text-base font-semibold text-white focus:outline-none"
                                  />
                                  {listsState.updateError && listsState.updatingId === list.id && (
                                    <p className="text-xs text-red-600">{listsState.updateError}</p>
                                  )}
                                </form>
                              ) : canEdit ? (
                                <button
                                  type="button"
                                  onClick={() => startEditingList(list)}
                                  className="group w-full rounded-md border border-transparent px-2 py-1 text-left text-white transition hover:border-white/30 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                >
                                  <span className="block truncate text-base font-semibold">
                                    {list.title}
                                  </span>
                                </button>
                              ) : (
                                <div className="px-2 py-1">
                                  <span className="block truncate text-base font-semibold text-white">
                                    {list.title}
                                  </span>
                                </div>
                              )}
                            </div>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleDeleteList(list.id)}
                                disabled={isDeletingList}
                                className="inline-flex flex-shrink-0 items-center rounded-md border border-rose-200/60 px-2 py-1 text-xs font-medium text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-75"
                              >
                                {isDeletingList ? 'Deleting…' : 'Delete'}
                              </button>
                            )}
                          </div>
                          {listsState.deleteError && listsState.deletingId === list.id && (
                            <p className="-mt-2 mb-2 text-xs text-rose-200">
                              {listsState.deleteError}
                            </p>
                          )}

                          <DroppableListArea id={list.id}>
                            <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
                              {cardsStatus === 'loading' && cards.length === 0 && (
                                <p className="text-sm text-white/80">Loading cards…</p>
                              )}
                              {cardsError && <p className="text-xs text-rose-200">{cardsError}</p>}
                              {cards.map((card) => (
                                <SortableCard
                                  key={card.id}
                                  id={card.id}
                                  listId={list.id}
                                  disabled={!canEdit}
                                >
                                  <CardListItem
                                    card={card}
                                    onOpenDetail={() => handleCardDetailOpen(card.id)}
                                    boardMembers={boardsState.members}
                                  />
                                </SortableCard>
                              ))}
                            </SortableContext>
                          </DroppableListArea>

                          {canEdit && (
                            <div className="mt-4">
                              <button
                                type="button"
                                onClick={() => openCreateCardModal(list.id)}
                                className="inline-flex w-full items-center justify-center rounded-md border border-dashed border-white/40 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
                              >
                                + Add card
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </SortableList>
                  );
                })}
              </SortableContext>
            </div>

            <DragOverlay
              dropAnimation={{
                duration: 250,
                easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
              }}
            >
              {activeDragItem?.type === 'list' && activeDragItem.data && (
                <div className="w-72 min-w-[18rem] rotate-2 rounded-xl border-2 border-blue-400 bg-slate-800 p-4 text-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] ring-4 ring-blue-400/30">
                  <div className="mb-3">
                    <span className="block text-base font-semibold">
                      {activeDragItem.data.title}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white/10 p-4 text-center text-sm text-white/70">
                    {(cardsByList[activeDragItem.data.id] ?? []).length} cards
                  </div>
                </div>
              )}
              {activeDragItem?.type === 'card' && activeDragItem.data && (
                <div className="w-64 rotate-3 rounded-md border border-blue-400 bg-slate-700 p-3 text-white opacity-90 shadow-xl ring-2 ring-blue-400">
                  <p className="text-sm font-semibold">{activeDragItem.data.title}</p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {isListModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 z-0 bg-slate-900/60"
            aria-label="Close list creation modal"
            onClick={closeCreateListModal}
            tabIndex={-1}
          />
          <div
            className="relative z-10 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Create list</h2>
                <p className="text-sm text-slate-600">Give your new list a descriptive title.</p>
              </div>
              <button
                type="button"
                onClick={closeCreateListModal}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateList} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="new-list-title" className="text-sm font-medium text-slate-700">
                  List title
                </label>
                <input
                  id="new-list-title"
                  value={newListTitle}
                  onChange={(event) => setNewListTitle(event.target.value)}
                  placeholder="e.g. In progress"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              {listsState.createError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {listsState.createError}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCreateListModal}
                  className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={listsState.createStatus === 'loading'}
                  className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {listsState.createStatus === 'loading' ? 'Creating…' : 'Create list'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCardModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 z-0 bg-slate-900/70"
            aria-label="Close card modal"
            onClick={closeCardModal}
            tabIndex={-1}
          />
          <div
            className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{cardModalTitle}</h2>
                <p className="text-sm text-slate-600">{cardModalDescription}</p>
              </div>
              <button
                type="button"
                onClick={closeCardModal}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCardModalSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="card-title" className="text-sm font-medium text-slate-700">
                  Title
                </label>
                <input
                  id="card-title"
                  value={cardModal.title}
                  onChange={(event) =>
                    setCardModal((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Enter a card title"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="card-description" className="text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  id="card-description"
                  value={cardModal.description}
                  onChange={(event) =>
                    setCardModal((prev) => ({ ...prev, description: event.target.value }))
                  }
                  rows={3}
                  placeholder="Add more context (optional)"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              {cardModalError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {cardModalError}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCardModal}
                  className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCard}
                  className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingCard ? 'Saving…' : cardModalPrimaryLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCardDetailOpen && activeCard && (
        <CardDetailModal
          card={activeCard}
          boardMembers={boardMembersList}
          onClose={closeCardDetail}
          onUpdateCard={(changes) => saveCardChanges(activeCard.id, changes)}
          isSaving={
            cardsState.updateStatus === 'loading' && cardsState.updatingId === activeCard.id
          }
          updateError={
            cardsState.updateError && cardsState.updatingId === activeCard.id
              ? cardsState.updateError
              : null
          }
          onDelete={() => handleDeleteCard(activeCard.id)}
          isDeleting={isDeletingActiveCard}
          deleteError={activeCardDeleteError}
          onAddComment={(text) => dispatch(addComment({ cardId: activeCard.id, text })).unwrap()}
          isAddingComment={
            cardsState.addCommentStatus === 'loading' &&
            cardsState.addingCommentCardId === activeCard.id
          }
          addCommentError={
            cardsState.addCommentError && cardsState.addingCommentCardId === activeCard.id
              ? cardsState.addCommentError
              : null
          }
          readOnly={!canEdit}
        />
      )}

      <BoardMembersPanel
        isOpen={isMembersPanelOpen}
        onClose={closeMembersPanel}
        board={board}
        members={boardsState.members}
        currentUserId={currentUserId}
        isLoading={boardsState.membersStatus === 'loading'}
        error={boardsState.membersError}
        canManage={canManage}
        isOwner={isOwner}
        onSearchUsers={handleSearchUsers}
        searchResults={userSearchResults}
        isSearching={isSearchingUsers}
        onAddMember={handleAddMember}
        isAddingMember={boardsState.addMemberStatus === 'loading'}
        addMemberError={boardsState.addMemberError}
        onRemoveMember={handleRemoveMember}
        isRemovingMember={boardsState.removeMemberStatus === 'loading'}
        onUpdateMemberRole={handleUpdateMemberRole}
        isUpdatingMember={boardsState.updateMemberStatus === 'loading'}
      />
    </section>
  );
};

export default BoardViewPage;
