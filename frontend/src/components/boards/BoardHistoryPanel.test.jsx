import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BoardHistoryPanel from './BoardHistoryPanel.jsx';

describe('BoardHistoryPanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    activity: [],
    activityStatus: 'idle',
    activityError: null,
    hasMoreActivity: false,
    onFetchActivity: vi.fn(),
    onLoadMore: vi.fn(),
    boardMembers: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(<BoardHistoryPanel {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Board Activity')).not.toBeInTheDocument();
  });

  it('renders panel header when open', () => {
    render(<BoardHistoryPanel {...defaultProps} />);
    expect(screen.getByText('Board Activity')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<BoardHistoryPanel {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<BoardHistoryPanel {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /close history panel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onFetchActivity when panel opens', () => {
    const onFetchActivity = vi.fn();
    render(<BoardHistoryPanel {...defaultProps} onFetchActivity={onFetchActivity} />);
    expect(onFetchActivity).toHaveBeenCalled();
  });

  it('shows loading state when fetching activity', () => {
    render(<BoardHistoryPanel {...defaultProps} activityStatus="loading" />);
    // Loading spinner is rendered (no text)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no activity exists', () => {
    render(<BoardHistoryPanel {...defaultProps} activityStatus="succeeded" />);
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
    expect(screen.getByText('Actions on this board will appear here')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', () => {
    render(
      <BoardHistoryPanel
        {...defaultProps}
        activityStatus="failed"
        activityError="Failed to load activity"
      />,
    );
    expect(screen.getAllByText('Failed to load activity').length).toBeGreaterThan(0);
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('calls onFetchActivity when retry button is clicked', async () => {
    const user = userEvent.setup();
    const onFetchActivity = vi.fn();
    render(
      <BoardHistoryPanel
        {...defaultProps}
        activityStatus="failed"
        activityError="Error"
        onFetchActivity={onFetchActivity}
      />,
    );

    onFetchActivity.mockClear();
    await user.click(screen.getByText('Retry'));
    expect(onFetchActivity).toHaveBeenCalled();
  });

  it('renders activity items', () => {
    const activity = [
      {
        id: 'act-1',
        actor: 'user-1',
        action: 'created',
        entityType: 'card',
        entityTitle: 'Test Card',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'act-2',
        actor: 'user-2',
        action: 'updated',
        entityType: 'board',
        entityTitle: 'Test Board',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];
    const boardMembers = [
      { id: 'user-1', username: 'Alice' },
      { id: 'user-2', username: 'Bob' },
    ];

    render(
      <BoardHistoryPanel
        {...defaultProps}
        activity={activity}
        activityStatus="succeeded"
        boardMembers={boardMembers}
      />,
    );

    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
    // Entity titles are wrapped in quotes in the message
    expect(screen.getByText(/Test Card/)).toBeInTheDocument();
    expect(screen.getByText(/Test Board/)).toBeInTheDocument();
  });

  it('shows load more button when hasMoreActivity is true', () => {
    const activity = [
      {
        id: 'act-1',
        actor: 'user-1',
        action: 'created',
        entityType: 'card',
        entityTitle: 'Card 1',
        createdAt: new Date().toISOString(),
      },
    ];
    render(
      <BoardHistoryPanel
        {...defaultProps}
        activity={activity}
        activityStatus="succeeded"
        hasMoreActivity={true}
      />,
    );

    expect(screen.getByText('Load more')).toBeInTheDocument();
  });

  it('calls onLoadMore when load more button is clicked', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    const activity = [
      {
        id: 'act-1',
        actor: 'user-1',
        action: 'created',
        entityType: 'card',
        entityTitle: 'Card 1',
        createdAt: '2026-01-10T12:00:00Z',
      },
    ];

    render(
      <BoardHistoryPanel
        {...defaultProps}
        activity={activity}
        activityStatus="succeeded"
        hasMoreActivity={true}
        onLoadMore={onLoadMore}
      />,
    );

    await user.click(screen.getByText('Load more'));
    expect(onLoadMore).toHaveBeenCalledWith('2026-01-10T12:00:00Z');
  });

  it('shows refresh button when activity exists', () => {
    const activity = [
      {
        id: 'act-1',
        actor: 'user-1',
        action: 'created',
        entityType: 'card',
        entityTitle: 'Card',
        createdAt: new Date().toISOString(),
      },
    ];
    render(<BoardHistoryPanel {...defaultProps} activity={activity} activityStatus="succeeded" />);

    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('calls onFetchActivity when refresh button is clicked', async () => {
    const user = userEvent.setup();
    const onFetchActivity = vi.fn();
    const activity = [
      {
        id: 'act-1',
        actor: 'user-1',
        action: 'created',
        entityType: 'card',
        entityTitle: 'Card',
        createdAt: new Date().toISOString(),
      },
    ];
    render(
      <BoardHistoryPanel
        {...defaultProps}
        activity={activity}
        activityStatus="succeeded"
        onFetchActivity={onFetchActivity}
      />,
    );

    onFetchActivity.mockClear();
    await user.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onFetchActivity).toHaveBeenCalled();
  });

  it('handles unknown member IDs gracefully', () => {
    const activity = [
      {
        id: 'act-1',
        actor: 'unknown-user',
        action: 'created',
        entityType: 'card',
        entityTitle: 'Card',
        createdAt: new Date().toISOString(),
      },
    ];
    render(
      <BoardHistoryPanel
        {...defaultProps}
        activity={activity}
        activityStatus="succeeded"
        boardMembers={[]}
      />,
    );

    expect(screen.getByText(/Unknown/)).toBeInTheDocument();
  });

  it('displays different entity type icons', () => {
    const activity = [
      {
        id: 'act-1',
        action: 'created',
        entityType: 'board',
        entityTitle: 'Board 1',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'act-2',
        action: 'created',
        entityType: 'list',
        entityTitle: 'List 1',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'act-3',
        action: 'created',
        entityType: 'card',
        entityTitle: 'Card 1',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'act-4',
        action: 'added',
        entityType: 'member',
        entityTitle: 'Member 1',
        createdAt: new Date().toISOString(),
      },
    ];
    render(<BoardHistoryPanel {...defaultProps} activity={activity} activityStatus="succeeded" />);

    expect(screen.getByText(/Board 1/)).toBeInTheDocument();
    expect(screen.getByText(/List 1/)).toBeInTheDocument();
    expect(screen.getByText(/Card 1/)).toBeInTheDocument();
    expect(screen.getByText(/Member 1/)).toBeInTheDocument();
  });

  it('closes on escape key press', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<BoardHistoryPanel {...defaultProps} onClose={onClose} />);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('formats time as "Just now" for very recent activity', () => {
    const activity = [
      {
        id: 'act-1',
        action: 'created',
        entityType: 'card',
        entityTitle: 'Card',
        createdAt: new Date().toISOString(),
      },
    ];
    render(<BoardHistoryPanel {...defaultProps} activity={activity} activityStatus="succeeded" />);

    expect(screen.getByText('Just now')).toBeInTheDocument();
  });

  it('formats time with minutes ago for recent activity', () => {
    const activity = [
      {
        id: 'act-1',
        action: 'created',
        entityType: 'card',
        entityTitle: 'Card',
        createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
      },
    ];
    render(<BoardHistoryPanel {...defaultProps} activity={activity} activityStatus="succeeded" />);

    expect(screen.getByText('5m ago')).toBeInTheDocument();
  });

  it('formats time with hours ago', () => {
    const activity = [
      {
        id: 'act-1',
        action: 'created',
        entityType: 'card',
        entityTitle: 'Card',
        createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      },
    ];
    render(<BoardHistoryPanel {...defaultProps} activity={activity} activityStatus="succeeded" />);

    expect(screen.getByText('3h ago')).toBeInTheDocument();
  });

  it('formats time with days ago', () => {
    const activity = [
      {
        id: 'act-1',
        action: 'created',
        entityType: 'card',
        entityTitle: 'Card',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ];
    render(<BoardHistoryPanel {...defaultProps} activity={activity} activityStatus="succeeded" />);

    expect(screen.getByText('2d ago')).toBeInTheDocument();
  });

  it('shows loading indicator in load more button when loading more', async () => {
    const activity = [
      {
        id: 'act-1',
        actor: 'user-1',
        action: 'created',
        entityType: 'card',
        entityTitle: 'Card',
        createdAt: new Date().toISOString(),
      },
    ];
    render(
      <BoardHistoryPanel
        {...defaultProps}
        activity={activity}
        activityStatus="loading"
        hasMoreActivity={true}
      />,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
