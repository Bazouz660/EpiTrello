import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ActiveUsersDisplay, { UserAvatar } from './ActiveUsersDisplay.jsx';

describe('UserAvatar', () => {
  const mockUser = {
    userId: 'user-1',
    username: 'John Doe',
    avatarUrl: null,
  };

  it('renders initials when no avatar URL is provided', () => {
    render(<UserAvatar user={mockUser} />);
    // First letter of first name + first letter of last name
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders avatar image when URL is provided', () => {
    const userWithAvatar = {
      ...mockUser,
      avatarUrl: 'https://example.com/avatar.jpg',
    };
    render(<UserAvatar user={userWithAvatar} />);
    const img = screen.getByAltText('John Doe');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('shows tooltip on hover', async () => {
    render(<UserAvatar user={mockUser} showTooltip={true} />);

    const avatar = screen.getByText('JD').parentElement;
    fireEvent.mouseEnter(avatar);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<UserAvatar user={mockUser} size="sm" />);
    expect(screen.getByText('JD')).toHaveClass('w-6', 'h-6');

    rerender(<UserAvatar user={mockUser} size="lg" />);
    expect(screen.getByText('JD')).toHaveClass('w-10', 'h-10');
  });

  it('shows online indicator', () => {
    render(<UserAvatar user={mockUser} />);
    // Online indicator should be present (green dot)
    const onlineIndicator = document.querySelector('.bg-green-400');
    expect(onlineIndicator).toBeInTheDocument();
  });

  it('renders two-letter initials for single word username', () => {
    const singleNameUser = { userId: 'user-2', username: 'Alice', avatarUrl: null };
    render(<UserAvatar user={singleNameUser} />);
    expect(screen.getByText('AL')).toBeInTheDocument();
  });
});

describe('ActiveUsersDisplay', () => {
  const mockUsers = [
    { userId: 'user-1', username: 'Alice', avatarUrl: null, joinedAt: '2026-01-05T10:00:00Z' },
    { userId: 'user-2', username: 'Bob', avatarUrl: null, joinedAt: '2026-01-05T10:01:00Z' },
    { userId: 'user-3', username: 'Charlie', avatarUrl: null, joinedAt: '2026-01-05T10:02:00Z' },
    { userId: 'user-4', username: 'Diana', avatarUrl: null, joinedAt: '2026-01-05T10:03:00Z' },
    { userId: 'user-5', username: 'Eve', avatarUrl: null, joinedAt: '2026-01-05T10:04:00Z' },
    { userId: 'user-6', username: 'Frank', avatarUrl: null, joinedAt: '2026-01-05T10:05:00Z' },
  ];

  it('renders nothing when there are no users', () => {
    const { container } = render(<ActiveUsersDisplay users={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('filters out current user from display', () => {
    render(<ActiveUsersDisplay users={mockUsers} currentUserId="user-1" />);
    // Should show 5 users (excluding current user)
    expect(screen.getByText('5 users online')).toBeInTheDocument();
  });

  it('renders nothing when only current user is online', () => {
    const { container } = render(
      <ActiveUsersDisplay users={[mockUsers[0]]} currentUserId="user-1" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows correct count text for single user', () => {
    render(<ActiveUsersDisplay users={mockUsers.slice(0, 2)} currentUserId="user-1" />);
    expect(screen.getByText('1 user online')).toBeInTheDocument();
  });

  it('limits visible avatars to maxVisible prop', () => {
    render(<ActiveUsersDisplay users={mockUsers} currentUserId="user-1" maxVisible={3} />);
    // Should show 3 avatars + overflow button
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('shows all avatars when count is within maxVisible', () => {
    render(
      <ActiveUsersDisplay users={mockUsers.slice(0, 3)} currentUserId="user-1" maxVisible={5} />,
    );
    // Should not show overflow button
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });

  it('opens dropdown when clicking overflow button', () => {
    render(<ActiveUsersDisplay users={mockUsers} currentUserId="user-1" maxVisible={3} />);

    const overflowButton = screen.getByText('+2');
    fireEvent.click(overflowButton);

    // Dropdown should show all users
    expect(screen.getByText('All active users (5)')).toBeInTheDocument();
    expect(screen.getByText('Diana')).toBeInTheDocument();
    expect(screen.getByText('Eve')).toBeInTheDocument();
  });

  it('closes dropdown when clicking backdrop', () => {
    render(<ActiveUsersDisplay users={mockUsers} currentUserId="user-1" maxVisible={3} />);

    // Open dropdown
    fireEvent.click(screen.getByText('+2'));
    expect(screen.getByText('All active users (5)')).toBeInTheDocument();

    // Click backdrop
    const backdrop = screen.getByRole('button', { name: 'Close user list' });
    fireEvent.click(backdrop);

    // Dropdown should be closed
    expect(screen.queryByText('All active users (5)')).not.toBeInTheDocument();
  });

  it('supports different sizes', () => {
    const { rerender } = render(
      <ActiveUsersDisplay users={mockUsers.slice(0, 2)} currentUserId="user-1" size="sm" />,
    );
    // Check that small size class is applied
    const initials = screen.getByText('BO');
    expect(initials).toHaveClass('w-6', 'h-6');

    rerender(<ActiveUsersDisplay users={mockUsers.slice(0, 2)} currentUserId="user-1" size="lg" />);
    expect(screen.getByText('BO')).toHaveClass('w-10', 'h-10');
  });

  it('handles 10+ simultaneous users', () => {
    const manyUsers = Array.from({ length: 15 }, (_, i) => ({
      userId: `user-${i}`,
      username: `User ${i}`,
      avatarUrl: null,
      joinedAt: new Date(Date.now() + i * 1000).toISOString(),
    }));

    render(<ActiveUsersDisplay users={manyUsers} currentUserId="user-0" maxVisible={5} />);

    // Should show overflow of 14 - 5 = 9 users
    expect(screen.getByText('+9')).toBeInTheDocument();
    expect(screen.getByText('14 users online')).toBeInTheDocument();
  });
});
