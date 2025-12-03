import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BoardCreateModal from './BoardCreateModal.jsx';

describe('BoardCreateModal', () => {
  let mockOnClose;
  let mockOnCreate;

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnCreate = vi.fn().mockResolvedValue(undefined);
  });

  const renderModal = (props = {}) =>
    render(<BoardCreateModal onClose={mockOnClose} onCreate={mockOnCreate} {...props} />);

  it('renders the modal with empty form', () => {
    renderModal();

    expect(screen.getByText('Create a new board')).toBeInTheDocument();
    expect(screen.getByLabelText('Board title')).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveValue('');
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

    await user.click(screen.getByRole('button', { name: 'Close create board modal' }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.keyboard('{Escape}');

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onCreate with form values when form is submitted', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Board title'), 'My New Board');
    await user.type(screen.getByLabelText('Description'), 'A board description');

    await user.click(screen.getByRole('button', { name: 'Create board' }));

    expect(mockOnCreate).toHaveBeenCalledWith({
      title: 'My New Board',
      description: 'A board description',
      background: { type: 'color', value: '#0f172a' },
    });
  });

  it('shows creating state when isCreating is true', () => {
    renderModal({ isCreating: true });

    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled();
  });

  it('displays create error when provided', () => {
    renderModal({ createError: 'Failed to create board' });

    expect(screen.getByText('Failed to create board')).toBeInTheDocument();
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

    await user.type(screen.getByLabelText('Board title'), 'Test Board');
    await user.click(screen.getByRole('button', { name: 'Create board' }));

    expect(mockOnCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        background: { type: 'color', value: '#ff0000' },
      }),
    );
  });

  it('disables submit when image background is selected but no image uploaded', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByLabelText('Image'));

    expect(screen.getByRole('button', { name: 'Create board' })).toBeDisabled();
  });

  it('does not submit when title is empty', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: 'Create board' }));

    expect(mockOnCreate).not.toHaveBeenCalled();
  });

  it('trims whitespace from title and description', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Board title'), '  Trimmed Title  ');
    await user.type(screen.getByLabelText('Description'), '  Trimmed Description  ');

    await user.click(screen.getByRole('button', { name: 'Create board' }));

    expect(mockOnCreate).toHaveBeenCalledWith({
      title: 'Trimmed Title',
      description: 'Trimmed Description',
      background: { type: 'color', value: '#0f172a' },
    });
  });
});
