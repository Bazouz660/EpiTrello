import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CardSearchFilter from './CardSearchFilter.jsx';

const mockBoardMembers = [
  {
    id: 'user1',
    username: 'alice',
    email: 'alice@example.com',
    avatarUrl: null,
  },
  {
    id: 'user2',
    username: 'bob',
    email: 'bob@example.com',
    avatarUrl: 'https://example.com/bob.jpg',
  },
];

const mockLabels = [
  { color: '#ef4444', text: 'Bug' },
  { color: '#22c55e', text: 'Feature' },
  { color: '#3b82f6', text: 'Enhancement' },
];

describe('CardSearchFilter', () => {
  let mockOnSearchChange;
  let mockOnFiltersChange;
  let mockOnToggleExpand;

  beforeEach(() => {
    mockOnSearchChange = vi.fn();
    mockOnFiltersChange = vi.fn();
    mockOnToggleExpand = vi.fn();
  });

  const defaultProps = {
    searchQuery: '',
    onSearchChange: () => {},
    filters: { labels: [], members: [], dueDates: [] },
    onFiltersChange: () => {},
    boardMembers: mockBoardMembers,
    availableLabels: mockLabels,
    isExpanded: false,
    onToggleExpand: () => {},
  };

  const renderComponent = (props = {}) => render(<CardSearchFilter {...defaultProps} {...props} />);

  describe('collapsed state', () => {
    it('renders collapsed toggle button when not expanded', () => {
      renderComponent({ isExpanded: false });
      expect(screen.getByRole('button', { name: /search & filter/i })).toBeInTheDocument();
    });

    it('calls onToggleExpand when toggle button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({ isExpanded: false, onToggleExpand: mockOnToggleExpand });

      await user.click(screen.getByRole('button', { name: /search & filter/i }));
      expect(mockOnToggleExpand).toHaveBeenCalled();
    });

    it('shows active filter count when filters are applied', () => {
      renderComponent({
        isExpanded: false,
        filters: { labels: ['#ef4444'], members: ['user1'], dueDates: [] },
      });

      // Should show badge with count of 2 (1 label + 1 member)
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows active filter count including search query', () => {
      renderComponent({
        isExpanded: false,
        searchQuery: 'test',
        filters: { labels: [], members: [], dueDates: [] },
      });

      // Should show badge with count of 1 (search query)
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('expanded state', () => {
    it('renders search input when expanded', () => {
      renderComponent({ isExpanded: true });
      expect(
        screen.getByPlaceholderText(/search cards by title or description/i),
      ).toBeInTheDocument();
    });

    it('renders filter buttons when expanded', () => {
      renderComponent({ isExpanded: true });
      expect(screen.getByRole('button', { name: /labels/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /members/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /due date/i })).toBeInTheDocument();
    });

    it('renders close button when expanded', () => {
      renderComponent({ isExpanded: true });
      expect(screen.getByRole('button', { name: /close search panel/i })).toBeInTheDocument();
    });

    it('calls onToggleExpand when close button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({ isExpanded: true, onToggleExpand: mockOnToggleExpand });

      await user.click(screen.getByRole('button', { name: /close search panel/i }));
      expect(mockOnToggleExpand).toHaveBeenCalled();
    });
  });

  describe('search functionality', () => {
    it('calls onSearchChange when typing in search input', async () => {
      const user = userEvent.setup();
      renderComponent({ isExpanded: true, onSearchChange: mockOnSearchChange });

      const searchInput = screen.getByPlaceholderText(/search cards by title or description/i);
      await user.type(searchInput, 'test query');

      expect(mockOnSearchChange).toHaveBeenCalled();
    });

    it('shows clear button when search query is present', () => {
      renderComponent({ isExpanded: true, searchQuery: 'test' });
      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
    });

    it('calls onSearchChange with empty string when clear button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({
        isExpanded: true,
        searchQuery: 'test',
        onSearchChange: mockOnSearchChange,
      });

      await user.click(screen.getByRole('button', { name: /clear search/i }));
      expect(mockOnSearchChange).toHaveBeenCalledWith('');
    });
  });

  describe('labels filter', () => {
    it('opens labels dropdown when labels button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({ isExpanded: true });

      await user.click(screen.getByRole('button', { name: /labels/i }));

      // Should show available labels
      expect(screen.getByText('Bug')).toBeInTheDocument();
      expect(screen.getByText('Feature')).toBeInTheDocument();
      expect(screen.getByText('Enhancement')).toBeInTheDocument();
    });

    it('calls onFiltersChange when a label is selected', async () => {
      const user = userEvent.setup();
      renderComponent({
        isExpanded: true,
        onFiltersChange: mockOnFiltersChange,
      });

      await user.click(screen.getByRole('button', { name: /labels/i }));
      await user.click(screen.getByText('Bug'));

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        labels: ['#ef4444'],
        members: [],
        dueDates: [],
      });
    });

    it('shows checkmark for selected labels', async () => {
      const user = userEvent.setup();
      renderComponent({
        isExpanded: true,
        filters: { labels: ['#ef4444'], members: [], dueDates: [] },
      });

      await user.click(screen.getByRole('button', { name: /labels/i }));

      // The Bug label button should have a checkmark (we can check for the svg path)
      const bugButton = screen.getByText('Bug').closest('button');
      expect(bugButton).toHaveClass('bg-white/20');
    });

    it('removes label from filters when already selected label is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({
        isExpanded: true,
        filters: { labels: ['#ef4444'], members: [], dueDates: [] },
        onFiltersChange: mockOnFiltersChange,
      });

      await user.click(screen.getByRole('button', { name: /labels/i }));
      await user.click(screen.getByText('Bug'));

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        labels: [],
        members: [],
        dueDates: [],
      });
    });

    it('shows filter count badge on labels button', () => {
      renderComponent({
        isExpanded: true,
        filters: { labels: ['#ef4444', '#22c55e'], members: [], dueDates: [] },
      });

      const labelsButton = screen.getByRole('button', { name: /labels/i });
      expect(labelsButton.textContent).toContain('2');
    });
  });

  describe('members filter', () => {
    it('opens members dropdown when members button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({ isExpanded: true });

      await user.click(screen.getByRole('button', { name: /members/i }));

      // Should show available members and unassigned option
      expect(screen.getByText('Unassigned')).toBeInTheDocument();
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByText('bob')).toBeInTheDocument();
    });

    it('calls onFiltersChange when a member is selected', async () => {
      const user = userEvent.setup();
      renderComponent({
        isExpanded: true,
        onFiltersChange: mockOnFiltersChange,
      });

      await user.click(screen.getByRole('button', { name: /members/i }));
      await user.click(screen.getByText('alice'));

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        labels: [],
        members: ['user1'],
        dueDates: [],
      });
    });

    it('can select unassigned filter', async () => {
      const user = userEvent.setup();
      renderComponent({
        isExpanded: true,
        onFiltersChange: mockOnFiltersChange,
      });

      await user.click(screen.getByRole('button', { name: /members/i }));
      await user.click(screen.getByText('Unassigned'));

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        labels: [],
        members: ['unassigned'],
        dueDates: [],
      });
    });
  });

  describe('due date filter', () => {
    it('opens due date dropdown when due date button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({ isExpanded: true });

      await user.click(screen.getByRole('button', { name: /due date/i }));

      // Should show due date options
      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText('Due today')).toBeInTheDocument();
      expect(screen.getByText('Due this week')).toBeInTheDocument();
      expect(screen.getByText('No due date')).toBeInTheDocument();
    });

    it('calls onFiltersChange when a due date option is selected', async () => {
      const user = userEvent.setup();
      renderComponent({
        isExpanded: true,
        onFiltersChange: mockOnFiltersChange,
      });

      await user.click(screen.getByRole('button', { name: /due date/i }));
      await user.click(screen.getByText('Overdue'));

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        labels: [],
        members: [],
        dueDates: ['overdue'],
      });
    });
  });

  describe('clear filters', () => {
    it('shows clear all button when filters are active', () => {
      renderComponent({
        isExpanded: true,
        searchQuery: 'test',
        filters: { labels: ['#ef4444'], members: [], dueDates: [] },
      });

      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });

    it('does not show clear all button when no filters are active', () => {
      renderComponent({
        isExpanded: true,
        searchQuery: '',
        filters: { labels: [], members: [], dueDates: [] },
      });

      expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument();
    });

    it('clears all filters when clear all button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent({
        isExpanded: true,
        searchQuery: 'test',
        filters: { labels: ['#ef4444'], members: ['user1'], dueDates: ['overdue'] },
        onSearchChange: mockOnSearchChange,
        onFiltersChange: mockOnFiltersChange,
      });

      await user.click(screen.getByRole('button', { name: /clear all/i }));

      expect(mockOnSearchChange).toHaveBeenCalledWith('');
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        labels: [],
        members: [],
        dueDates: [],
      });
    });
  });

  describe('active filters summary', () => {
    it('shows search query in active filters', () => {
      renderComponent({
        isExpanded: true,
        searchQuery: 'test query',
      });

      expect(screen.getByText(/search:.*test query/i)).toBeInTheDocument();
    });

    it('shows label filters in active filters', () => {
      renderComponent({
        isExpanded: true,
        filters: { labels: ['#ef4444'], members: [], dueDates: [] },
      });

      // Should show "Label" text for the filter tag
      const filterSummary = screen.getByText('Active filters:').parentElement;
      expect(filterSummary.textContent).toContain('Label');
    });

    it('shows member filters in active filters', () => {
      renderComponent({
        isExpanded: true,
        filters: { labels: [], members: ['user1'], dueDates: [] },
      });

      // Should show member username
      const filterSummary = screen.getByText('Active filters:').parentElement;
      expect(filterSummary.textContent).toContain('alice');
    });

    it('shows unassigned filter in active filters', () => {
      renderComponent({
        isExpanded: true,
        filters: { labels: [], members: ['unassigned'], dueDates: [] },
      });

      const filterSummary = screen.getByText('Active filters:').parentElement;
      expect(filterSummary.textContent).toContain('Unassigned');
    });

    it('shows due date filters in active filters', () => {
      renderComponent({
        isExpanded: true,
        filters: { labels: [], members: [], dueDates: ['overdue'] },
      });

      const filterSummary = screen.getByText('Active filters:').parentElement;
      expect(filterSummary.textContent).toContain('Overdue');
    });

    it('can remove individual filter from summary', async () => {
      const user = userEvent.setup();
      renderComponent({
        isExpanded: true,
        searchQuery: 'test',
        onSearchChange: mockOnSearchChange,
      });

      // Find the remove button for the search filter
      const removeButton = screen.getByRole('button', { name: /remove search filter/i });
      await user.click(removeButton);

      expect(mockOnSearchChange).toHaveBeenCalledWith('');
    });
  });

  describe('empty state', () => {
    it('shows message when no labels are available', async () => {
      const user = userEvent.setup();
      renderComponent({
        isExpanded: true,
        availableLabels: [],
      });

      await user.click(screen.getByRole('button', { name: /labels/i }));

      // Should show color options when no labels available
      expect(screen.getByText(/filter by color/i)).toBeInTheDocument();
    });

    it('shows message when no members are available', async () => {
      const user = userEvent.setup();
      renderComponent({
        isExpanded: true,
        boardMembers: [],
      });

      await user.click(screen.getByRole('button', { name: /members/i }));

      expect(screen.getByText('No members available')).toBeInTheDocument();
    });
  });

  describe('dropdown behavior', () => {
    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      renderComponent({ isExpanded: true });

      // Open dropdown
      await user.click(screen.getByRole('button', { name: /labels/i }));
      expect(screen.getByText('Bug')).toBeInTheDocument();

      // Click outside (on the panel title)
      await user.click(screen.getByText('Search & Filter Cards'));

      // Dropdown should close - Bug should no longer be visible
      await waitFor(() => {
        expect(screen.queryByText('Bug')).not.toBeInTheDocument();
      });
    });
  });
});
