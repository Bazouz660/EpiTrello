import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { createAuthInitialState } from '../features/auth/authSlice.js';
import { createBoardsInitialState } from '../features/boards/boardsSlice.js';
import { createTestStore, renderWithProviders } from '../tests/testUtils.jsx';

import HomePage from './HomePage.jsx';

describe('HomePage', () => {
  it('encourages visitors to sign up when logged out', () => {
    const authState = { ...createAuthInitialState(), initialized: true };
    const store = createTestStore({
      preloadedState: { auth: authState, boards: createBoardsInitialState() },
    });

    renderWithProviders(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
      { store },
    );

    expect(screen.getByText('Welcome to EpiTrello')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
  });

  it('greets the authenticated user and links to boards', () => {
    const authState = {
      ...createAuthInitialState(),
      initialized: true,
      user: { id: 'user-42', username: 'Jordan' },
    };
    const store = createTestStore({
      preloadedState: { auth: authState, boards: createBoardsInitialState() },
    });

    renderWithProviders(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
      { store },
    );

    expect(screen.getByText('Welcome back, Jordan')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to boards' })).toBeInTheDocument();
  });
});
