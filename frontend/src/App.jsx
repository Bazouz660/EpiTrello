import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { initializeAuth, logout, selectAuth } from './features/auth/authSlice.js';
import { useAppDispatch, useAppSelector } from './hooks/index.js';

const primaryLinkClasses = ({ isActive }) =>
  [
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary text-primary-foreground shadow'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  ].join(' ');

const secondaryLinkClasses = ({ isActive }) =>
  [
    'inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'border-slate-300 bg-slate-100 text-slate-900'
      : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900 hover:bg-slate-100',
  ].join(' ');

const AppLayout = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, initialized } = useAppSelector(selectAuth);

  useEffect(() => {
    if (!initialized) {
      dispatch(initializeAuth());
    }
  }, [dispatch, initialized]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="bg-surface min-h-screen text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <NavLink to="/" className="text-primary text-lg font-semibold">
            EpiTrello
          </NavLink>
          <nav className="flex flex-1 flex-wrap items-center justify-end gap-4">
            <div className="flex items-center gap-2">
              <NavLink to="/" end className={primaryLinkClasses}>
                Dashboard
              </NavLink>
              <NavLink to="/boards" className={primaryLinkClasses}>
                Boards
              </NavLink>
            </div>
            <div className="flex items-center gap-2">
              {!initialized && (
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Checking session…
                </span>
              )}
              {initialized && !user && (
                <>
                  <NavLink to="/login" className={secondaryLinkClasses}>
                    Log in
                  </NavLink>
                  <NavLink
                    to="/register"
                    className={({ isActive }) =>
                      [
                        'bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow transition-colors',
                        isActive ? 'bg-blue-600' : 'hover:bg-blue-600',
                      ].join(' ')
                    }
                  >
                    Sign up
                  </NavLink>
                </>
              )}
              {initialized && user && (
                <>
                  <span className="hidden text-sm text-slate-600 sm:inline">
                    Signed in as <span className="font-medium text-slate-900">{user.username}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
                  >
                    Log out
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
