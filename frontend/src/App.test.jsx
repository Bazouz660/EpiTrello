import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import AppLayout from './App.jsx';

const renderWithRouter = (initialEntries = ['/']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<div>Dashboard content</div>} />
          <Route path="boards" element={<div>Boards content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('AppLayout', () => {
  it('renders navigation links', () => {
    renderWithRouter();

    expect(screen.getByText('EpiTrello')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Boards' })).toBeInTheDocument();
  });

  it('highlights the active route based on location', () => {
    renderWithRouter(['/boards']);

    expect(screen.getByRole('link', { name: 'Boards' })).toHaveClass('bg-primary');
  });
});
