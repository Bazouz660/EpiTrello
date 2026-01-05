import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import UserCursorsOverlay, { UserCursor } from './UserCursorsOverlay.jsx';

describe('UserCursor', () => {
  const mockCursor = {
    userId: 'user-1',
    username: 'John Doe',
    avatarUrl: null,
    x: 50,
    y: 50,
  };

  it('renders cursor at correct position', () => {
    render(<UserCursor {...mockCursor} />);

    const cursor = document.querySelector('.absolute.z-50');
    expect(cursor).toBeInTheDocument();
    expect(cursor).toHaveStyle({ left: '50%', top: '50%' });
  });

  it('displays username in label', () => {
    render(<UserCursor {...mockCursor} />);
    // Should show first name only
    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('renders avatar image when URL is provided', () => {
    const cursorWithAvatar = {
      ...mockCursor,
      avatarUrl: 'https://example.com/avatar.jpg',
    };
    render(<UserCursor {...cursorWithAvatar} />);

    // Image has empty alt text for decorative purposes
    const img = document.querySelector('img[src="https://example.com/avatar.jpg"]');
    expect(img).toBeInTheDocument();
  });

  it('handles edge positions correctly', () => {
    const { rerender } = render(<UserCursor {...mockCursor} x={0} y={0} />);

    let cursor = document.querySelector('.absolute.z-50');
    expect(cursor).toHaveStyle({ left: '0%', top: '0%' });

    rerender(<UserCursor {...mockCursor} x={100} y={100} />);
    cursor = document.querySelector('.absolute.z-50');
    expect(cursor).toHaveStyle({ left: '100%', top: '100%' });
  });

  it('has pointer-events-none class to not interfere with user interactions', () => {
    render(<UserCursor {...mockCursor} />);

    const cursor = document.querySelector('.pointer-events-none');
    expect(cursor).toBeInTheDocument();
  });
});

describe('UserCursorsOverlay', () => {
  const mockCursorPositions = {
    'user-1': { x: 25, y: 25, username: 'Alice', avatarUrl: null, lastUpdate: Date.now() },
    'user-2': { x: 75, y: 75, username: 'Bob', avatarUrl: null, lastUpdate: Date.now() },
    'user-3': { x: 50, y: 50, username: 'Charlie', avatarUrl: null, lastUpdate: Date.now() },
  };

  it('renders nothing when cursorPositions is empty', () => {
    const { container } = render(<UserCursorsOverlay cursorPositions={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders cursors for all users except current user', () => {
    render(<UserCursorsOverlay cursorPositions={mockCursorPositions} currentUserId="user-1" />);

    // Should show 2 cursors (excluding current user)
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('renders all cursors when no currentUserId is provided', () => {
    render(<UserCursorsOverlay cursorPositions={mockCursorPositions} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('has pointer-events-none class on container', () => {
    render(<UserCursorsOverlay cursorPositions={mockCursorPositions} />);

    const container = document.querySelector('.pointer-events-none.absolute.inset-0');
    expect(container).toBeInTheDocument();
  });

  it('handles many concurrent cursors', () => {
    const manyCursors = {};
    for (let i = 0; i < 15; i++) {
      manyCursors[`user-${i}`] = {
        x: Math.random() * 100,
        y: Math.random() * 100,
        username: `User ${i}`,
        avatarUrl: null,
        lastUpdate: Date.now(),
      };
    }

    render(<UserCursorsOverlay cursorPositions={manyCursors} currentUserId="user-0" />);

    // Should render 14 cursors (15 - 1 current user)
    const cursors = document.querySelectorAll('.absolute.z-50');
    expect(cursors).toHaveLength(14);
  });

  it('updates cursor positions when props change', () => {
    const { rerender } = render(
      <UserCursorsOverlay cursorPositions={mockCursorPositions} currentUserId="user-1" />,
    );

    // Update positions
    const updatedPositions = {
      ...mockCursorPositions,
      'user-2': { ...mockCursorPositions['user-2'], x: 90, y: 90 },
    };

    rerender(<UserCursorsOverlay cursorPositions={updatedPositions} currentUserId="user-1" />);

    // Find Bob's cursor by its label and check it updated
    const bobCursor = screen.getByText('Bob').closest('.absolute.z-50');
    expect(bobCursor).toHaveStyle({ left: '90%', top: '90%' });
  });
});
