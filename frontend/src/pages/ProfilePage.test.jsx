import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDispatch, mockFetchProfile, mockUpdateProfile, mockChangePassword } = vi.hoisted(
  () => ({
    mockDispatch: vi.fn(),
    mockFetchProfile: vi.fn(() => ({ type: 'profile/fetchProfile' })),
    mockUpdateProfile: vi.fn((payload) => ({ type: 'profile/updateProfile', payload })),
    mockChangePassword: vi.fn((payload) => ({ type: 'profile/changePassword', payload })),
  }),
);

let mockState = {};

vi.mock('../hooks/index.js', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector) => selector(mockState),
}));

vi.mock('../features/auth/authSlice.js', () => ({
  selectAuth: (state) => state.auth,
}));

vi.mock('../features/profile/profileSlice.js', () => ({
  changePassword: mockChangePassword,
  fetchProfile: mockFetchProfile,
  selectProfile: (state) => state.profile,
  updateProfile: mockUpdateProfile,
}));

import ProfilePage from './ProfilePage.jsx';

const buildState = () => ({
  auth: {
    user: { id: 'user-1', username: 'demo', email: 'demo@example.com', createdAt: '2024-01-01' },
  },
  profile: {
    data: {
      id: 'user-1',
      username: 'demo',
      email: 'demo@example.com',
      createdAt: '2024-01-01T00:00:00.000Z',
      avatarUrl: null,
    },
    status: 'succeeded',
    error: null,
    updateStatus: 'idle',
    updateError: null,
    lastSuccessMessage: null,
    passwordStatus: 'idle',
    passwordError: null,
    passwordMessage: null,
  },
});

describe('ProfilePage', () => {
  beforeEach(() => {
    mockState = buildState();
    mockDispatch.mockReset();
    mockDispatch.mockImplementation((action) => Promise.resolve(action));
    mockFetchProfile.mockClear();
    mockUpdateProfile.mockClear();
    mockChangePassword.mockClear();
  });

  it('displays the current profile information', () => {
    render(<ProfilePage />);

    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('demo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('demo@example.com')).toBeInTheDocument();
  });

  it('submits profile changes through the dispatcher when the form is valid', async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    await user.clear(screen.getByLabelText('Username'));
    await user.type(screen.getByLabelText('Username'), 'updated user');
    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'updated@example.com');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(mockUpdateProfile).toHaveBeenCalledWith({
      username: 'updated user',
      email: 'updated@example.com',
      avatarFile: null,
      removeAvatar: false,
    });
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('validates password changes before dispatching', async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    await user.type(screen.getByLabelText('Current password'), 'current-pass');
    await user.type(screen.getByLabelText('New password'), 'new-password-1');
    await user.type(screen.getByLabelText('Confirm new password'), 'mismatch');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(screen.getByText(/must match/i)).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('dispatches the password change when validation passes', async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    await user.type(screen.getByLabelText('Current password'), 'current-pass');
    await user.type(screen.getByLabelText('New password'), 'new-password-1234');
    await user.type(screen.getByLabelText('Confirm new password'), 'new-password-1234');
    await user.click(screen.getByRole('button', { name: 'Update password' }));

    expect(mockChangePassword).toHaveBeenCalledWith({
      currentPassword: 'current-pass',
      newPassword: 'new-password-1234',
    });
  });
});
