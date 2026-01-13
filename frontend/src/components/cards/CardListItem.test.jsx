import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CardListItem from './CardListItem.jsx';

describe('CardListItem', () => {
  const mockCard = {
    id: 'card-1',
    title: 'Test Card',
    description: '',
    assignedMembers: [],
  };

  const mockOnOpenDetail = vi.fn();

  it('renders card title', () => {
    render(<CardListItem card={mockCard} onOpenDetail={mockOnOpenDetail} />);
    expect(screen.getByText('Test Card')).toBeInTheDocument();
  });

  it('shows description indicator when card has description', () => {
    const cardWithDesc = { ...mockCard, description: 'Some description' };
    render(<CardListItem card={cardWithDesc} onOpenDetail={mockOnOpenDetail} />);
    expect(screen.getByLabelText('Card has description')).toBeInTheDocument();
  });

  it('does not show description indicator when card has no description', () => {
    render(<CardListItem card={mockCard} onOpenDetail={mockOnOpenDetail} />);
    expect(screen.queryByLabelText('Card has description')).not.toBeInTheDocument();
  });

  it('calls onOpenDetail when clicked', async () => {
    const user = userEvent.setup();
    render(<CardListItem card={mockCard} onOpenDetail={mockOnOpenDetail} />);

    await user.click(screen.getByRole('button'));
    expect(mockOnOpenDetail).toHaveBeenCalledTimes(1);
  });

  describe('assigned members avatars', () => {
    const boardMembers = [
      { id: 'user-1', username: 'Alice', email: 'alice@example.com', avatarUrl: null },
      {
        id: 'user-2',
        username: 'Bob',
        email: 'bob@example.com',
        avatarUrl: 'https://example.com/bob.jpg',
      },
      { id: 'user-3', username: 'Charlie', email: 'charlie@example.com', avatarUrl: null },
    ];

    it('does not show avatars when no members assigned', () => {
      render(
        <CardListItem
          card={mockCard}
          onOpenDetail={mockOnOpenDetail}
          boardMembers={boardMembers}
        />,
      );
      expect(screen.queryByLabelText(/assigned members/i)).not.toBeInTheDocument();
    });

    it('shows avatar with initials for assigned member without avatar URL', () => {
      const cardWithAssignee = {
        ...mockCard,
        assignedMembers: ['user-1'],
      };
      render(
        <CardListItem
          card={cardWithAssignee}
          onOpenDetail={mockOnOpenDetail}
          boardMembers={boardMembers}
        />,
      );
      expect(screen.getByLabelText('1 assigned members')).toBeInTheDocument();
      expect(screen.getByText('AL')).toBeInTheDocument(); // Alice's initials
    });

    it('shows avatar image for assigned member with avatar URL', () => {
      const cardWithAssignee = {
        ...mockCard,
        assignedMembers: ['user-2'],
      };
      render(
        <CardListItem
          card={cardWithAssignee}
          onOpenDetail={mockOnOpenDetail}
          boardMembers={boardMembers}
        />,
      );
      const avatar = screen.getByAltText("Bob's avatar");
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/bob.jpg');
    });

    it('shows multiple assigned member avatars', () => {
      const cardWithAssignees = {
        ...mockCard,
        assignedMembers: ['user-1', 'user-2', 'user-3'],
      };
      render(
        <CardListItem
          card={cardWithAssignees}
          onOpenDetail={mockOnOpenDetail}
          boardMembers={boardMembers}
        />,
      );
      expect(screen.getByLabelText('3 assigned members')).toBeInTheDocument();
      expect(screen.getByText('AL')).toBeInTheDocument(); // Alice
      expect(screen.getByAltText("Bob's avatar")).toBeInTheDocument();
      expect(screen.getByText('CH')).toBeInTheDocument(); // Charlie
    });

    it('shows +N indicator when more than 5 members assigned', () => {
      const manyMembers = [
        { id: 'user-1', username: 'User1', avatarUrl: null },
        { id: 'user-2', username: 'User2', avatarUrl: null },
        { id: 'user-3', username: 'User3', avatarUrl: null },
        { id: 'user-4', username: 'User4', avatarUrl: null },
        { id: 'user-5', username: 'User5', avatarUrl: null },
        { id: 'user-6', username: 'User6', avatarUrl: null },
        { id: 'user-7', username: 'User7', avatarUrl: null },
      ];
      const cardWithManyAssignees = {
        ...mockCard,
        assignedMembers: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6', 'user-7'],
      };
      render(
        <CardListItem
          card={cardWithManyAssignees}
          onOpenDetail={mockOnOpenDetail}
          boardMembers={manyMembers}
        />,
      );
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('handles unknown member IDs gracefully', () => {
      const cardWithUnknownAssignee = {
        ...mockCard,
        assignedMembers: ['unknown-user-id'],
      };
      render(
        <CardListItem
          card={cardWithUnknownAssignee}
          onOpenDetail={mockOnOpenDetail}
          boardMembers={boardMembers}
        />,
      );
      // Should still render without crashing
      expect(screen.getByLabelText('1 assigned members')).toBeInTheDocument();
      expect(screen.getByText('?')).toBeInTheDocument(); // Fallback initial
    });
  });

  describe('labels', () => {
    it('does not show labels section when card has no labels', () => {
      render(<CardListItem card={mockCard} onOpenDetail={mockOnOpenDetail} />);
      expect(screen.queryByLabelText('Card labels')).not.toBeInTheDocument();
    });

    it('shows labels with text', () => {
      const cardWithLabels = {
        ...mockCard,
        labels: [
          { color: '#ef4444', text: 'Urgent' },
          { color: '#3b82f6', text: 'Feature' },
        ],
      };
      render(<CardListItem card={cardWithLabels} onOpenDetail={mockOnOpenDetail} />);
      expect(screen.getByLabelText('Card labels')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
      expect(screen.getByText('Feature')).toBeInTheDocument();
    });

    it('shows labels without text', () => {
      const cardWithColorOnlyLabels = {
        ...mockCard,
        labels: [{ color: '#22c55e', text: '' }],
      };
      render(<CardListItem card={cardWithColorOnlyLabels} onOpenDetail={mockOnOpenDetail} />);
      expect(screen.getByLabelText('Card labels')).toBeInTheDocument();
      expect(screen.getByLabelText('Label: #22c55e')).toBeInTheDocument();
    });
  });

  describe('due dates', () => {
    it('does not show due date when card has no due date', () => {
      render(<CardListItem card={mockCard} onOpenDetail={mockOnOpenDetail} />);
      expect(screen.queryByLabelText(/Due date/i)).not.toBeInTheDocument();
    });

    it('shows due date badge for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const cardWithDueDate = {
        ...mockCard,
        dueDate: futureDate.toISOString(),
      };
      render(<CardListItem card={cardWithDueDate} onOpenDetail={mockOnOpenDetail} />);
      expect(screen.getByLabelText(/Due date/i)).toBeInTheDocument();
    });

    it('shows overdue styling for past due dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 3);
      const cardWithOverdueDueDate = {
        ...mockCard,
        dueDate: pastDate.toISOString(),
      };
      render(<CardListItem card={cardWithOverdueDueDate} onOpenDetail={mockOnOpenDetail} />);
      const dueDateBadge = screen.getByLabelText(/Due date/i);
      expect(dueDateBadge).toBeInTheDocument();
      expect(dueDateBadge).toHaveClass('bg-red-500/80');
    });

    it('shows due-soon styling for dates within 1 day', () => {
      const soonDate = new Date();
      soonDate.setHours(soonDate.getHours() + 12);
      const cardWithSoonDueDate = {
        ...mockCard,
        dueDate: soonDate.toISOString(),
      };
      render(<CardListItem card={cardWithSoonDueDate} onOpenDetail={mockOnOpenDetail} />);
      const dueDateBadge = screen.getByLabelText(/Due date/i);
      expect(dueDateBadge).toBeInTheDocument();
      expect(dueDateBadge).toHaveClass('bg-yellow-500/80');
    });
  });
});
