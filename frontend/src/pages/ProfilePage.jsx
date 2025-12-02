import { useEffect, useMemo, useState } from 'react';

import { selectAuth } from '../features/auth/authSlice.js';
import {
  changePassword,
  fetchProfile,
  selectProfile,
  updateProfile,
} from '../features/profile/profileSlice.js';
import { useAppDispatch, useAppSelector } from '../hooks/index.js';

const emailRegex = /.+@.+\..+/;

const ProfilePage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(selectAuth);
  const {
    data: profile,
    status,
    error,
    updateStatus,
    updateError,
    lastSuccessMessage,
    passwordStatus,
    passwordError,
    passwordMessage,
  } = useAppSelector(selectProfile);

  const [profileForm, setProfileForm] = useState({
    username: user?.username ?? '',
    email: user?.email ?? '',
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl ?? null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordFormError, setPasswordFormError] = useState(null);

  useEffect(() => {
    if (!profile && status === 'idle') {
      dispatch(fetchProfile());
    }
  }, [dispatch, profile, status]);

  useEffect(() => {
    if (profile) {
      setProfileForm({ username: profile.username, email: profile.email });
      setAvatarPreview(profile.avatarUrl ?? null);
      setAvatarFile(null);
      setRemoveAvatar(false);
    }
  }, [profile]);

  const formattedCreationDate = useMemo(() => {
    if (!profile?.createdAt) return null;
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(
        new Date(profile.createdAt),
      );
    } catch {
      return null;
    }
  }, [profile?.createdAt]);

  const validateProfileForm = () => {
    const errors = {};
    const trimmedUsername = profileForm.username.trim();
    const trimmedEmail = profileForm.email.trim();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      errors.username = 'Username must be between 3 and 50 characters.';
    }

    if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Please provide a valid email address.';
    }

    return errors;
  };

  const handleProfileSubmit = (event) => {
    event.preventDefault();
    const errors = validateProfileForm();
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;

    dispatch(
      updateProfile({
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
        avatarFile: removeAvatar ? null : avatarFile,
        removeAvatar,
      }),
    );
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setRemoveAvatar(false);

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
  };

  const validatePasswordForm = () => {
    if (!passwordForm.currentPassword) {
      return 'Current password is required.';
    }
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 12) {
      return 'New password must be at least 12 characters long.';
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return 'New password and confirmation must match.';
    }
    return null;
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();
    const validationError = validatePasswordForm();
    setPasswordFormError(validationError);
    if (validationError) return;

    dispatch(
      changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }),
    ).then((action) => {
      if (action.type.endsWith('fulfilled')) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    });
  };

  const isLoadingProfile = status === 'loading';

  return (
    <section className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-slate-900">Profile</h1>
        <p className="text-sm text-slate-600">Manage your personal information and security.</p>
      </header>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Profile avatar"
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold">
                {profileForm.username?.charAt(0).toUpperCase() ?? 'U'}
              </div>
            )}
            <div>
              <p className="text-lg font-medium text-slate-900">{profileForm.username || '—'}</p>
              <p className="text-sm text-slate-500">{profileForm.email || '—'}</p>
              {formattedCreationDate && (
                <p className="text-xs text-slate-400">Member since {formattedCreationDate}</p>
              )}
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleProfileSubmit}>
            <div>
              <label htmlFor="username" className="text-sm font-medium text-slate-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={profileForm.username}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, username: event.target.value }))
                }
                className="focus:border-primary mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none"
              />
              {profileErrors.username && (
                <p className="mt-1 text-xs text-red-600">{profileErrors.username}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={profileForm.email}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, email: event.target.value }))
                }
                className="focus:border-primary mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none"
              />
              {profileErrors.email && (
                <p className="mt-1 text-xs text-red-600">{profileErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="avatarUpload" className="text-sm font-medium text-slate-700">
                Avatar
              </label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  id="avatarUpload"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleAvatarChange}
                />
                <label
                  htmlFor="avatarUpload"
                  className="bg-white text-sm font-medium text-slate-700"
                >
                  <span className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 px-3 py-2 shadow-sm hover:bg-slate-50">
                    Choose file
                  </span>
                </label>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove photo
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">PNG, JPG, GIF or WebP up to 2MB.</p>
            </div>

            {updateError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {updateError}
              </div>
            )}

            {lastSuccessMessage && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {lastSuccessMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoadingProfile || updateStatus === 'loading'}
              className="bg-primary text-primary-foreground inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updateStatus === 'loading' ? 'Saving changes…' : 'Save changes'}
            </button>
          </form>
        </div>

        <form
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={handlePasswordSubmit}
        >
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Security</h2>
            <p className="text-sm text-slate-500">
              Update your password regularly to keep your account safe.
            </p>
          </div>

          <div>
            <label htmlFor="currentPassword" className="text-sm font-medium text-slate-700">
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
              }
              className="focus:border-primary mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
              }
              className="focus:border-primary mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
              }
              className="focus:border-primary mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none"
            />
          </div>

          {passwordFormError && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {passwordFormError}
            </div>
          )}

          {passwordError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {passwordError}
            </div>
          )}

          {passwordMessage && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {passwordMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={passwordStatus === 'loading'}
            className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {passwordStatus === 'loading' ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>

      {isLoadingProfile && (
        <div className="text-center text-sm text-slate-500">Loading your profile…</div>
      )}
    </section>
  );
};

export default ProfilePage;
