import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BoardMembersPanel, { MemberAvatar, RoleBadge } from './BoardMembersPanel.jsx';

const mockBoard = {
  id: 'board1',
  title: 'Test Board',
  owner: 'user1',
};

const mockMembers = [
  {
    id: 'user1',
    username: 'alice',
    email: 'alice@example.com',
    avatarUrl: null,
    role: 'owner',
  },
  {
    id: 'user2',
    username: 'bob',
    email: 'bob@example.com',
    avatarUrl: 'https://example.com/bob.jpg',
    role: 'admin',
  },
  {
    id: 'user3',
    username: 'charlie',
    email: 'charlie@example.com',
    avatarUrl: null,
    role: 'member',
  },
  {
    id: 'user4',
    username: 'diana',
    email: 'diana@example.com',
    avatarUrl: null,
    role: 'viewer',
  },
];

const mockSearchResults = [
  {
    id: 'user5',
    username: 'eve',
    email: 'eve@example.com',
    avatarUrl: null,
  },
  {
    id: 'user6',
    username: 'frank',
    email: 'frank@example.com',
    avatarUrl: null,
  },
];

describe('BoardMembersPanel', () => {
  let mockOnClose;
  let mockOnSearchUsers;
  let mockOnAddMember;
  let mockOnRemoveMember;
  let mockOnUpdateMemberRole;

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnSearchUsers = vi.fn();
    mockOnAddMember = vi.fn();
    mockOnRemoveMember = vi.fn();
    mockOnUpdateMemberRole = vi.fn();
  });

  const renderPanel = (props = {}) =>
    render(
      <BoardMembersPanel
        isOpen={true}
        onClose={mockOnClose}
        board={mockBoard}
        members={mockMembers}
        currentUserId="user1"
        {...props}
      />,
    );

  describe('visibility', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <BoardMembersPanel
          isOpen={false}
          onClose={mockOnClose}
          board={mockBoard}
          members={mockMembers}
          currentUserId="user1"
        />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders panel when isOpen is true', () => {
      renderPanel();
      expect(screen.getByRole('complementary', { name: /board members/i })).toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('displays the title "Board Members"', () => {
      renderPanel();
      expect(screen.getByText('Board Members')).toBeInTheDocument();
    });

    it('displays member count', () => {
      renderPanel();
      expect(screen.getByText('4 members')).toBeInTheDocument();
    });

    it('displays singular "member" for single member', () => {
      renderPanel({ members: [mockMembers[0]] });
      expect(screen.getByText('1 member')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      renderPanel();

      await user.click(screen.getByRole('button', { name: /close members panel/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('member list', () => {
    it('displays all members', () => {
      renderPanel();
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByText('bob')).toBeInTheDocument();
      expect(screen.getByText('charlie')).toBeInTheDocument();
      expect(screen.getByText('diana')).toBeInTheDocument();
    });

    it('displays member emails', () => {
      renderPanel();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });

    it('sorts members by role priority (owner first)', () => {
      renderPanel();
      const listItems = screen.getAllByRole('listitem');
      expect(listItems[0]).toHaveTextContent('alice'); // owner
      expect(listItems[1]).toHaveTextContent('bob'); // admin
      expect(listItems[2]).toHaveTextContent('charlie'); // member
      expect(listItems[3]).toHaveTextContent('diana'); // viewer
    });

    it('indicates current user with "(you)"', () => {
      renderPanel({ currentUserId: 'user1' });
      expect(screen.getByText('(you)')).toBeInTheDocument();
    });

    it('displays role badges', () => {
      renderPanel();
      expect(screen.getByText('Owner')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Member')).toBeInTheDocument();
      expect(screen.getByText('Viewer')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('displays loading indicator when isLoading is true', () => {
      renderPanel({ isLoading: true, members: [] });
      expect(screen.getByText('Loading members...')).toBeInTheDocument();
    });

    it('hides member list when loading', () => {
      renderPanel({ isLoading: true });
      expect(screen.queryByRole('list', { name: /member list/i })).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('displays error message when error is provided', () => {
      renderPanel({ error: 'Failed to load members', members: [] });
      expect(screen.getByText('Failed to load members')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('displays empty message when no members', () => {
      renderPanel({ members: [] });
      expect(screen.getByText('No members found')).toBeInTheDocument();
    });
  });

  describe('add member functionality (canManage=true)', () => {
    it('shows "Add member" button when canManage is true', () => {
      renderPanel({ canManage: true });
      expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument();
    });

    it('does not show "Add member" button when canManage is false', () => {
      renderPanel({ canManage: false });
      expect(screen.queryByRole('button', { name: /add member/i })).not.toBeInTheDocument();
    });

    it('expands search form when "Add member" is clicked', async () => {
      const user = userEvent.setup();
      renderPanel({ canManage: true });

      await user.click(screen.getByRole('button', { name: /add member/i }));

      expect(screen.getByPlaceholderText(/search by email/i)).toBeInTheDocument();
    });

    it('calls onSearchUsers after typing in search field', async () => {
      const user = userEvent.setup({ delay: null });
      renderPanel({
        canManage: true,
        onSearchUsers: mockOnSearchUsers,
      });

      await user.click(screen.getByRole('button', { name: /add member/i }));
      await user.type(screen.getByPlaceholderText(/search by email/i), 'eve@');

      // Wait for debounce (300ms) plus some buffer
      await waitFor(
        () => {
          expect(mockOnSearchUsers).toHaveBeenCalledWith('eve@');
        },
        { timeout: 500 },
      );
    });

    it('displays search results', async () => {
      const user = userEvent.setup();
      renderPanel({
        canManage: true,
        onSearchUsers: mockOnSearchUsers,
        searchResults: mockSearchResults,
      });

      await user.click(screen.getByRole('button', { name: /add member/i }));
      await user.type(screen.getByPlaceholderText(/search by email/i), 'eve@');

      expect(screen.getByText('eve')).toBeInTheDocument();
      expect(screen.getByText('frank')).toBeInTheDocument();
    });

    it('filters out existing members from search results', async () => {
      const user = userEvent.setup();
      const resultsWithExistingMember = [
        ...mockSearchResults,
        { id: 'user1', username: 'alice', email: 'alice@example.com', avatarUrl: null },
      ];
      renderPanel({
        canManage: true,
        onSearchUsers: mockOnSearchUsers,
        searchResults: resultsWithExistingMember,
      });

      await user.click(screen.getByRole('button', { name: /add member/i }));
      await user.type(screen.getByPlaceholderText(/search by email/i), 'al');

      // alice should not appear in search results since she's already a member
      const searchResultsList = screen.getAllByRole('listitem');
      const searchResultsText = searchResultsList.map((item) => item.textContent).join(' ');
      expect(searchResultsText).toContain('eve');
      expect(searchResultsText).toContain('frank');
    });

    it('calls onAddMember when a search result is clicked', async () => {
      const user = userEvent.setup();
      renderPanel({
        canManage: true,
        onSearchUsers: mockOnSearchUsers,
        searchResults: mockSearchResults,
        onAddMember: mockOnAddMember,
      });

      await user.click(screen.getByRole('button', { name: /add member/i }));
      await user.type(screen.getByPlaceholderText(/search by email/i), 'eve@');

      // Find and click the Add button for eve
      const addButtons = screen.getAllByRole('button');
      const eveButton = addButtons.find(
        (btn) => btn.textContent.includes('eve') || btn.closest('li')?.textContent.includes('eve'),
      );
      await user.click(eveButton);

      expect(mockOnAddMember).toHaveBeenCalledWith('user5', 'member');
    });

    it('displays addMemberError when present', async () => {
      const user = userEvent.setup();
      renderPanel({
        canManage: true,
        addMemberError: 'Failed to add member',
      });

      await user.click(screen.getByRole('button', { name: /add member/i }));

      expect(screen.getByText('Failed to add member')).toBeInTheDocument();
    });

    it('collapses search form when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderPanel({ canManage: true });

      await user.click(screen.getByRole('button', { name: /add member/i }));
      expect(screen.getByPlaceholderText(/search by email/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel adding member/i }));
      expect(screen.queryByPlaceholderText(/search by email/i)).not.toBeInTheDocument();
    });
  });

  describe('member management (canManage=true)', () => {
    it('shows role dropdown for non-owner members when canManage is true', () => {
      renderPanel({
        canManage: true,
        currentUserId: 'user1',
        onUpdateMemberRole: mockOnUpdateMemberRole,
        onRemoveMember: mockOnRemoveMember,
      });

      // Should have dropdowns for admin, member, viewer (not owner)
      const roleDropdowns = screen.getAllByRole('combobox');
      expect(roleDropdowns.length).toBe(3);
    });

    it('shows Remove button for non-owner members only when isOwner is true', () => {
      renderPanel({
        canManage: true,
        isOwner: true,
        currentUserId: 'user1',
        onRemoveMember: mockOnRemoveMember,
      });

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      expect(removeButtons.length).toBe(3);
    });

    it('does not show Remove button when canManage is true but isOwner is false', () => {
      renderPanel({
        canManage: true,
        isOwner: false,
        currentUserId: 'user2', // logged in as admin
        onRemoveMember: mockOnRemoveMember,
      });

      const removeButtons = screen.queryAllByRole('button', { name: /remove/i });
      expect(removeButtons.length).toBe(0);
    });

    it('does not show manage controls for the owner', () => {
      renderPanel({
        canManage: true,
        isOwner: true,
        currentUserId: 'user1',
      });

      // Owner should not have a dropdown or remove button
      const ownerRow = screen.getByText('alice').closest('li');
      expect(ownerRow).not.toContainElement(screen.queryByLabelText(/change role for alice/i));
    });

    it('calls onUpdateMemberRole when role is changed', async () => {
      const user = userEvent.setup();
      renderPanel({
        canManage: true,
        isOwner: true,
        currentUserId: 'user1',
        onUpdateMemberRole: mockOnUpdateMemberRole,
      });

      const roleDropdowns = screen.getAllByRole('combobox');
      // Change bob's role (first dropdown after owner)
      await user.selectOptions(roleDropdowns[0], 'viewer');

      expect(mockOnUpdateMemberRole).toHaveBeenCalledWith('user2', 'viewer');
    });

    it('calls onRemoveMember when Remove is clicked and confirmed', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderPanel({
        canManage: true,
        isOwner: true,
        currentUserId: 'user1',
        onRemoveMember: mockOnRemoveMember,
      });

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]); // Remove bob

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockOnRemoveMember).toHaveBeenCalledWith('user2');

      confirmSpy.mockRestore();
    });

    it('does not call onRemoveMember when Remove is cancelled', async () => {
      const user = userEvent.setup();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderPanel({
        canManage: true,
        isOwner: true,
        currentUserId: 'user1',
        onRemoveMember: mockOnRemoveMember,
      });

      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]);

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockOnRemoveMember).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('footer', () => {
    it('shows "You can manage board members" when canManage is true', () => {
      renderPanel({ canManage: true });
      expect(screen.getByText('You can manage board members')).toBeInTheDocument();
    });

    it('shows "View only" when canManage is false', () => {
      renderPanel({ canManage: false });
      expect(screen.getByText('View only')).toBeInTheDocument();
    });
  });
});

describe('MemberAvatar', () => {
  it('renders initials when no avatarUrl', () => {
    render(<MemberAvatar member={{ username: 'alice', avatarUrl: null }} />);
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('renders image when avatarUrl is provided', () => {
    render(
      <MemberAvatar member={{ username: 'alice', avatarUrl: 'https://example.com/avatar.jpg' }} />,
    );
    expect(screen.getByRole('img', { name: /alice's avatar/i })).toBeInTheDocument();
  });

  it('renders "?" for missing username', () => {
    render(<MemberAvatar member={{ username: '', avatarUrl: null }} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});

describe('RoleBadge', () => {
  it('renders Owner badge with crown icon', () => {
    render(<RoleBadge memberRole="owner" />);
    expect(screen.getByText('Owner')).toBeInTheDocument();
  });

  it('renders Admin badge with shield icon', () => {
    render(<RoleBadge memberRole="admin" />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders Member badge', () => {
    render(<RoleBadge memberRole="member" />);
    expect(screen.getByText('Member')).toBeInTheDocument();
  });

  it('renders Viewer badge', () => {
    render(<RoleBadge memberRole="viewer" />);
    expect(screen.getByText('Viewer')).toBeInTheDocument();
  });

  it('falls back to member style for unknown roles', () => {
    render(<RoleBadge memberRole="unknown" />);
    // Unknown roles fall back to "Member" display
    expect(screen.getByText('Member')).toBeInTheDocument();
  });
});
