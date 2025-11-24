import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { createAppStore } from './app/store.js';
import AppLayout from './App.jsx';

const renderWithRouter = (initialEntries = ['/']) =>
  render(
    <Provider store={createAppStore()}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<div>Dashboard content</div>} />
            <Route path="boards" element={<div>Boards content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

describe('AppLayout', () => {
  it('renders navigation links', async () => {
    renderWithRouter();

    expect(screen.getByText('EpiTrello')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Boards' })).toBeInTheDocument();
    await screen.findByRole('link', { name: 'Log in' });
  });

  it('highlights the active route based on location', async () => {
    renderWithRouter(['/boards']);

    expect(screen.getByRole('link', { name: 'Boards' })).toHaveClass('bg-primary');
    await screen.findByRole('link', { name: 'Log in' });
  });
});
