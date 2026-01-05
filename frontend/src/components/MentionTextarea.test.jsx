import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MentionTextarea, { renderTextWithMentions } from './MentionTextarea';

describe('MentionTextarea', () => {
  const mockMembers = [
    { id: '1', username: 'john', displayName: 'John Doe' },
    { id: '2', username: 'jane', displayName: 'Jane Smith' },
    { id: '3', username: 'bob', displayName: 'Bob Wilson' },
  ];

  it('renders a textarea with placeholder', () => {
    render(
      <MentionTextarea
        value=""
        onChange={() => {}}
        placeholder="Write something..."
        members={mockMembers}
      />,
    );

    expect(screen.getByPlaceholderText('Write something...')).toBeInTheDocument();
  });

  it('calls onChange when typing', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <MentionTextarea
        value=""
        onChange={handleChange}
        placeholder="Write something..."
        members={mockMembers}
      />,
    );

    const textarea = screen.getByPlaceholderText('Write something...');
    await user.type(textarea, 'Hello');

    expect(handleChange).toHaveBeenCalled();
  });

  it('shows suggestions when typing @', async () => {
    const user = userEvent.setup();
    let value = '';
    const handleChange = (newValue) => {
      value = newValue;
    };

    const { rerender } = render(
      <MentionTextarea
        value={value}
        onChange={handleChange}
        placeholder="Write something..."
        members={mockMembers}
      />,
    );

    const textarea = screen.getByPlaceholderText('Write something...');
    await user.type(textarea, '@');

    // Rerender with new value to trigger suggestion display
    rerender(
      <MentionTextarea
        value="@"
        onChange={handleChange}
        placeholder="Write something..."
        members={mockMembers}
      />,
    );

    // Should show member suggestions
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('filters suggestions based on query', async () => {
    let currentValue = '';
    const handleChange = (val) => {
      currentValue = val;
    };

    const { rerender } = render(
      <MentionTextarea
        value={currentValue}
        onChange={handleChange}
        placeholder="Write something..."
        members={mockMembers}
      />,
    );

    const textarea = screen.getByPlaceholderText('Write something...');

    // Simulate typing @jo character by character
    fireEvent.change(textarea, { target: { value: '@jo', selectionStart: 3 } });

    rerender(
      <MentionTextarea
        value="@jo"
        onChange={handleChange}
        placeholder="Write something..."
        members={mockMembers}
      />,
    );

    // Trigger the change handler to detect mention
    fireEvent.change(textarea, { target: { value: '@jo', selectionStart: 3 } });

    // Should only show John (contains 'jo')
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('inserts mention when clicking a suggestion', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    const { rerender } = render(
      <MentionTextarea
        value=""
        onChange={handleChange}
        placeholder="Write something..."
        members={mockMembers}
      />,
    );

    const textarea = screen.getByPlaceholderText('Write something...');
    await user.type(textarea, '@');

    rerender(
      <MentionTextarea
        value="@"
        onChange={handleChange}
        placeholder="Write something..."
        members={mockMembers}
      />,
    );

    // Click on John Doe suggestion
    const johnButton = screen.getByText('John Doe').closest('button');
    await user.click(johnButton);

    // Should call onChange with the inserted mention
    expect(handleChange).toHaveBeenCalledWith('@john ');
  });

  it('closes suggestions on Escape key', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <MentionTextarea
        value=""
        onChange={() => {}}
        placeholder="Write something..."
        members={mockMembers}
      />,
    );

    const textarea = screen.getByPlaceholderText('Write something...');
    await user.type(textarea, '@');

    rerender(
      <MentionTextarea
        value="@"
        onChange={() => {}}
        placeholder="Write something..."
        members={mockMembers}
      />,
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();

    fireEvent.keyDown(textarea, { key: 'Escape' });

    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('disables the textarea when disabled prop is true', () => {
    render(
      <MentionTextarea
        value=""
        onChange={() => {}}
        placeholder="Write something..."
        members={mockMembers}
        disabled
      />,
    );

    expect(screen.getByPlaceholderText('Write something...')).toBeDisabled();
  });

  it('shows hint text when not showing suggestions', () => {
    render(
      <MentionTextarea
        value=""
        onChange={() => {}}
        placeholder="Write something..."
        members={mockMembers}
      />,
    );

    expect(screen.getByText('Type @ to mention someone')).toBeInTheDocument();
  });
});

describe('renderTextWithMentions', () => {
  const mockMemberLookup = new Map([
    ['1', { id: '1', username: 'john', displayName: 'John Doe' }],
    ['2', { id: '2', username: 'jane', displayName: 'Jane Smith' }],
  ]);

  it('returns null for empty text', () => {
    expect(renderTextWithMentions('', mockMemberLookup)).toBeNull();
    expect(renderTextWithMentions(null, mockMemberLookup)).toBeNull();
  });

  it('returns plain text when no mentions', () => {
    const result = renderTextWithMentions('Hello world', mockMemberLookup);
    // Result is an array with the text as single element
    expect(result).toEqual(['Hello world']);
  });

  it('renders mentions with highlighting', () => {
    const { container } = render(<p>{renderTextWithMentions('Hello @john!', mockMemberLookup)}</p>);

    expect(container.textContent).toContain('Hello');
    expect(container.textContent).toContain('@john');
    expect(container.textContent).toContain('!');

    // Check that mention is wrapped in a span with styling
    const mentionSpan = container.querySelector('span');
    expect(mentionSpan).toHaveTextContent('@john');
    expect(mentionSpan).toHaveClass('bg-blue-100', 'text-blue-700');
  });

  it('renders unknown mentions with different styling', () => {
    const { container } = render(
      <p>{renderTextWithMentions('Hello @unknown!', mockMemberLookup)}</p>,
    );

    const mentionSpan = container.querySelector('span');
    expect(mentionSpan).toHaveTextContent('@unknown');
    expect(mentionSpan).toHaveClass('bg-slate-100', 'text-slate-600');
  });

  it('handles multiple mentions', () => {
    const { container } = render(
      <p>{renderTextWithMentions('Hey @john and @jane!', mockMemberLookup)}</p>,
    );

    const spans = container.querySelectorAll('span');
    expect(spans).toHaveLength(2);
    expect(spans[0]).toHaveTextContent('@john');
    expect(spans[1]).toHaveTextContent('@jane');
  });
});
