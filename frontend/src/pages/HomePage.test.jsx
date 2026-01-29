import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { createAuthInitialState } from '../features/auth/authSlice.js';
import { createBoardsInitialState } from '../features/boards/boardsSlice.js';
import { createDashboardInitialState } from '../features/dashboard/dashboardSlice.js';
import { createTestStore, renderWithProviders } from '../tests/testUtils.jsx';

import HomePage from './HomePage.jsx';

describe('HomePage', () => {
  it('encourages visitors to sign up when logged out', () => {
    const authState = { ...createAuthInitialState(), initialized: true };
    const store = createTestStore({
      preloadedState: {
        auth: authState,
        boards: createBoardsInitialState(),
        dashboard: createDashboardInitialState(),
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
      { store },
    );

    expect(screen.getByText(/Organize your projects with/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Get Started Free/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('greets the authenticated user and links to boards', () => {
    const authState = {
      ...createAuthInitialState(),
      initialized: true,
      user: { id: 'user-42', username: 'Jordan' },
    };
    const store = createTestStore({
      preloadedState: {
        auth: authState,
        boards: createBoardsInitialState(),
        dashboard: createDashboardInitialState(),
      },
    });

    renderWithProviders(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
      { store },
    );

    expect(screen.getByText('Welcome back, Jordan')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all boards' })).toBeInTheDocument();
  });
});
