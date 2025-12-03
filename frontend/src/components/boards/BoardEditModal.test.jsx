import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BoardEditModal from './BoardEditModal.jsx';

const mockBoard = {
  id: 'board-1',
  title: 'Test Board',
  description: 'A test description',
  background: { type: 'color', value: '#0f172a' },
};

describe('BoardEditModal', () => {
  let mockOnClose;
  let mockOnUpdate;
  let mockOnDelete;

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnUpdate = vi.fn().mockResolvedValue(undefined);
    mockOnDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  const renderModal = (props = {}) =>
    render(
      <BoardEditModal
        board={mockBoard}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        {...props}
      />,
    );

  it('renders the modal with board details', () => {
    renderModal();

    expect(screen.getByText('Edit board')).toBeInTheDocument();
    expect(screen.getByLabelText('Board title')).toHaveValue('Test Board');
    expect(screen.getByLabelText('Description')).toHaveValue('A test description');
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when close icon button is clicked', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Close edit board modal' }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.keyboard('{Escape}');

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onUpdate with updated values when form is submitted', async () => {
    const user = userEvent.setup();
    renderModal();

    const titleInput = screen.getByLabelText('Board title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(mockOnUpdate).toHaveBeenCalledWith({
      title: 'Updated Title',
      description: 'A test description',
      background: { type: 'color', value: '#0f172a' },
    });
  });

  it('calls onDelete when Delete board button is clicked and confirmed', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Delete board' }));

    expect(window.confirm).toHaveBeenCalledWith('Delete this board? This action cannot be undone.');
    expect(mockOnDelete).toHaveBeenCalled();
  });

  it('does not call onDelete when deletion is cancelled', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Delete board' }));

    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('shows updating state when isUpdating is true', () => {
    renderModal({ isUpdating: true });

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('shows deleting state when isDeleting is true', () => {
    renderModal({ isDeleting: true });

    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
  });

  it('displays update error when provided', () => {
    renderModal({ updateError: 'Failed to update board' });

    expect(screen.getByText('Failed to update board')).toBeInTheDocument();
  });

  it('displays delete error when provided', () => {
    renderModal({ deleteError: 'Failed to delete board' });

    expect(screen.getByText('Failed to delete board')).toBeInTheDocument();
  });

  it('allows switching to image background type', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByLabelText('Image'));

    expect(screen.getByText(/Upload a JPG or PNG/)).toBeInTheDocument();
  });

  it('allows changing background color', async () => {
    const user = userEvent.setup();
    renderModal();

    const colorInput = screen.getByPlaceholderText('#0f172a');
    await user.clear(colorInput);
    await user.type(colorInput, '#ff0000');

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        background: { type: 'color', value: '#ff0000' },
      }),
    );
  });

  it('loads board with image background correctly', () => {
    const boardWithImage = {
      ...mockBoard,
      background: { type: 'image', value: 'data:image/png;base64,abc123' },
    };
    renderModal({ board: boardWithImage });

    expect(screen.getByLabelText('Image')).toBeChecked();
    expect(screen.getByAltText('Board background preview')).toBeInTheDocument();
  });
});
