import { screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { createAuthInitialState } from '../features/auth/authSlice.js';
import { createBoardsInitialState } from '../features/boards/boardsSlice.js';
import { createTestStore, renderWithProviders } from '../tests/testUtils.jsx';

import ProtectedRoute from './ProtectedRoute.jsx';

const buildStore = (authStateOverrides) => {
  const authState = { ...createAuthInitialState(), ...authStateOverrides };
  const boardsState = createBoardsInitialState();

  return createTestStore({
    preloadedState: {
      auth: authState,
      boards: boardsState,
    },
  });
};

describe('ProtectedRoute', () => {
  it('renders a loading state until the session is initialized', () => {
    const store = buildStore({ initialized: false });

    renderWithProviders(
      <MemoryRouter initialEntries={['/boards']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/boards" element={<div>Boards area</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
      { store },
    );

    expect(screen.getByText('Checking your session...')).toBeInTheDocument();
  });

  it('redirects to the login page if the user is not authenticated', () => {
    const store = buildStore({ initialized: true, user: null });

    renderWithProviders(
      <MemoryRouter initialEntries={['/boards']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/boards" element={<div>Boards area</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
      { store },
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders nested routes when the user is authenticated', () => {
    const store = buildStore({ initialized: true, user: { id: '1', username: 'alex' } });

    renderWithProviders(
      <MemoryRouter initialEntries={['/boards']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/boards" element={<div>Boards area</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
      { store },
    );

    expect(screen.getByText('Boards area')).toBeInTheDocument();
  });
});
