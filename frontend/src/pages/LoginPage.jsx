import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { loginUser, clearAuthError, selectAuth } from '../features/auth/authSlice.js';
import { useAppDispatch, useAppSelector } from '../hooks/index.js';

const LoginPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user, status, error, initialized } = useAppSelector(selectAuth);
  const [formState, setFormState] = useState({
    email: '',
    password: '',
  });

  const fromPath = location.state?.from?.pathname ?? '/boards';

  useEffect(() => {
    if (user) {
      navigate(fromPath, { replace: true });
    }
  }, [user, navigate, fromPath]);

  useEffect(() => {
    if (!initialized) return undefined;
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch, initialized]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    if (error) dispatch(clearAuthError());
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formState.email || !formState.password) return;
    dispatch(loginUser({ email: formState.email, password: formState.password }));
  };

  const isLoading = status === 'loading';

  return (
    <section className="mx-auto max-w-md space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Log in</h1>
        <p className="text-sm text-slate-600">
          Access your boards and stay on top of every project.
        </p>
      </header>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formState.email}
            onChange={handleChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={formState.password}
            onChange={handleChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="bg-primary text-primary-foreground flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-75"
        >
          {isLoading ? 'Signing you in…' : 'Log in'}
        </button>
      </form>
      <p className="text-center text-sm text-slate-600">
        Need an account?{' '}
        <Link to="/register" className="text-primary font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </section>
  );
};

export default LoginPage;
