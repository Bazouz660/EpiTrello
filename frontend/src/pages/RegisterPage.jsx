import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import zxcvbn from 'zxcvbn';

import { registerUser, clearAuthError, selectAuth } from '../features/auth/authSlice.js';
import { useAppDispatch, useAppSelector } from '../hooks/index.js';

const MIN_PASSWORD_SCORE = 3;
const STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
const STRENGTH_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-lime-500',
  'bg-emerald-600',
];

const RegisterPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { user, status, error, initialized } = useAppSelector(selectAuth);
  const [formState, setFormState] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (user) {
      navigate('/boards', { replace: true });
    }
  }, [user, navigate]);

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
    if (formError) setFormError(null);
  };

  const passwordStrength = useMemo(() => {
    if (!formState.password) return null;
    return zxcvbn(formState.password);
  }, [formState.password]);

  const isPasswordStrong = passwordStrength ? passwordStrength.score >= MIN_PASSWORD_SCORE : false;
  const passwordsMatch =
    !formState.confirmPassword || formState.password === formState.confirmPassword;
  const passwordStrengthFeedback = passwordStrength
    ? passwordStrength.feedback.warning || passwordStrength.feedback.suggestions[0]
    : '';
  const strengthPercent = passwordStrength ? (passwordStrength.score / 4) * 100 : 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formState.username || !formState.email || !formState.password) return;

    if (!formState.confirmPassword) {
      setFormError('Please confirm your password.');
      return;
    }

    if (formState.password !== formState.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    if (!isPasswordStrong) {
      setFormError('Please choose a stronger password.');
      return;
    }

    setFormError(null);
    dispatch(
      registerUser({
        username: formState.username,
        email: formState.email,
        password: formState.password,
      }),
    );
  };

  const isLoading = status === 'loading';
  const canSubmit = Boolean(
    formState.username &&
      formState.email &&
      formState.password &&
      formState.confirmPassword &&
      passwordsMatch &&
      isPasswordStrong &&
      !isLoading,
  );

  return (
    <section className="mx-auto max-w-md space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-slate-900">Create your account</h1>
        <p className="text-sm text-slate-600">
          Join EpiTrello and start organizing your projects today.
        </p>
      </header>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium text-slate-700">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={formState.username}
            onChange={handleChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
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
            autoComplete="new-password"
            minLength={8}
            required
            value={formState.password}
            onChange={handleChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
          {passwordStrength && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Strength: {STRENGTH_LABELS[passwordStrength.score]}</span>
                <span>Score {passwordStrength.score}/4</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full ${STRENGTH_COLORS[passwordStrength.score]}`}
                  style={{ width: `${strengthPercent}%` }}
                />
              </div>
              {!isPasswordStrong && (
                <p className="text-xs text-amber-600">
                  {passwordStrengthFeedback ||
                    'Use a longer password with unique words, numbers, and symbols.'}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={formState.confirmPassword}
            onChange={handleChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
          {formState.confirmPassword && !passwordsMatch && (
            <p className="text-xs text-red-600">Passwords do not match.</p>
          )}
        </div>
        {formError && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">{formError}</p>
        )}
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={!canSubmit}
          className="bg-primary text-primary-foreground flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-75"
        >
          {isLoading ? 'Creating your account…' : 'Sign up'}
        </button>
      </form>
      <p className="text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Log in
        </Link>
      </p>
    </section>
  );
};

export default RegisterPage;
