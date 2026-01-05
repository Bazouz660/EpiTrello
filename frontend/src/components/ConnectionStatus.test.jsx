import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import ConnectionStatus from './ConnectionStatus.jsx';

describe('ConnectionStatus', () => {
  it('renders connected status correctly', () => {
    render(<ConnectionStatus status="connected" />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('renders connecting status correctly', () => {
    render(<ConnectionStatus status="connecting" />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('renders disconnected status correctly', () => {
    render(<ConnectionStatus status="disconnected" />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('renders error status correctly', () => {
    render(<ConnectionStatus status="error" />);
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    render(<ConnectionStatus status="connected" showLabel={false} />);
    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ConnectionStatus status="connected" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders with different sizes', () => {
    const { container } = render(<ConnectionStatus status="connected" size="md" />);
    expect(container.querySelector('.h-3')).toBeInTheDocument();
  });

  it('shows pulse animation for connecting status', () => {
    const { container } = render(<ConnectionStatus status="connecting" />);
    expect(container.querySelector('.animate-ping')).toBeInTheDocument();
  });

  it('does not show pulse animation for connected status', () => {
    const { container } = render(<ConnectionStatus status="connected" />);
    expect(container.querySelector('.animate-ping')).not.toBeInTheDocument();
  });
});
